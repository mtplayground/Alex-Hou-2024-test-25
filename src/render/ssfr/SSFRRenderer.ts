import * as THREE from 'three'
import type {
  ContainerSize,
  SsfrAppearanceSettings,
  SsfrBlurSettings,
  SsfrDebugView,
} from '@/store/viewportStore'
import type { SimulationFrame } from '@/workers/SimulationClient'
import {
  createDepthBilateralBlurPass,
  type DepthBilateralBlurPass,
} from './depthBilateralBlurPass'
import {
  createParticleDepthPass,
  type ParticleDepthPass,
} from './particleDepthPass'
import {
  createParticleThicknessPass,
  type ParticleThicknessPass,
} from './particleThicknessPass'

const FULLSCREEN_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FLUID_COMPOSITE_FRAGMENT_SHADER = `
uniform sampler2D uFluidDepthTexture;
uniform sampler2D uFluidThicknessTexture;
uniform float uCameraFar;
uniform float uCameraNear;
uniform vec2 uProjectionScale;
uniform sampler2D uSceneColorTexture;
uniform sampler2D uSceneDepthTexture;
uniform float uAbsorptionStrength;
uniform float uDebugViewMode;
uniform float uFresnelPower;
uniform float uThicknessScale;
uniform vec2 uTexelSize;
uniform vec3 uWaterColor;

varying vec2 vUv;

float sceneDepthToViewDepth(float depthSample) {
  float clipDepth = depthSample * 2.0 - 1.0;
  return (2.0 * uCameraNear * uCameraFar) /
    (uCameraFar + uCameraNear - clipDepth * (uCameraFar - uCameraNear));
}

vec3 reconstructViewPosition(vec2 uv, float viewDepth) {
  vec2 ndc = uv * 2.0 - 1.0;
  return vec3(
    (ndc.x * viewDepth) / uProjectionScale.x,
    (ndc.y * viewDepth) / uProjectionScale.y,
    -viewDepth
  );
}

vec3 environmentReflection(vec3 direction) {
  float horizonBlend = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
  return mix(
    vec3(0.020, 0.035, 0.060),
    vec3(0.420, 0.690, 0.930),
    horizonBlend
  );
}

vec3 reconstructNormal(vec2 uv, float centerDepth) {
  vec2 rightUv = uv + vec2(uTexelSize.x, 0.0);
  vec2 upUv = uv + vec2(0.0, uTexelSize.y);
  float rightDepth = texture2D(uFluidDepthTexture, rightUv).r;
  float upDepth = texture2D(uFluidDepthTexture, upUv).r;

  if (rightDepth <= 0.0) {
    rightDepth = centerDepth;
  }

  if (upDepth <= 0.0) {
    upDepth = centerDepth;
  }

  vec3 center = reconstructViewPosition(uv, centerDepth);
  vec3 right = reconstructViewPosition(rightUv, rightDepth);
  vec3 up = reconstructViewPosition(upUv, upDepth);
  return normalize(cross(right - center, up - center));
}

void main() {
  vec4 sceneColor = texture2D(uSceneColorTexture, vUv);
  float fluidDepth = texture2D(uFluidDepthTexture, vUv).r;

  if (fluidDepth <= 0.0) {
    gl_FragColor = sceneColor;
    return;
  }

  float sceneDepthSample = texture2D(uSceneDepthTexture, vUv).r;
  float sceneViewDepth = sceneDepthToViewDepth(sceneDepthSample);

  if (fluidDepth >= sceneViewDepth - 0.01) {
    gl_FragColor = sceneColor;
    return;
  }

  float thickness = texture2D(uFluidThicknessTexture, vUv).r;
  vec3 viewPosition = reconstructViewPosition(vUv, fluidDepth);
  vec3 normal = reconstructNormal(vUv, fluidDepth);

  if (normal.z > 0.0) {
    normal *= -1.0;
  }

  vec3 viewDirection = normalize(-viewPosition);
  float scaledThickness = thickness * uThicknessScale;
  float fresnel = pow(
    1.0 - max(dot(normal, viewDirection), 0.0),
    uFresnelPower
  );
  vec3 reflectionColor = environmentReflection(reflect(-viewDirection, normal));
  vec3 absorptionCoefficient =
    vec3(2.4, 1.3, 0.45) * max(uAbsorptionStrength, 0.0);
  vec3 transmittance = exp(-scaledThickness * absorptionCoefficient);

  if (uDebugViewMode > 0.5 && uDebugViewMode < 1.5) {
    float normalizedDepth =
      1.0 - smoothstep(uCameraNear, uCameraFar * 0.75, fluidDepth);
    gl_FragColor = vec4(vec3(normalizedDepth), 1.0);
    return;
  }

  if (uDebugViewMode > 1.5 && uDebugViewMode < 2.5) {
    float debugThickness = clamp(scaledThickness * 0.35, 0.0, 1.0);
    gl_FragColor = vec4(mix(vec3(0.02), uWaterColor, debugThickness), 1.0);
    return;
  }

  if (uDebugViewMode > 2.5 && uDebugViewMode < 3.5) {
    gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
    return;
  }

  vec3 tintedRefraction = mix(
    uWaterColor,
    sceneColor.rgb * transmittance,
    0.72
  );
  vec3 fluidColor = mix(
    tintedRefraction,
    reflectionColor,
    0.18 + fresnel * 0.72
  );
  float opacity = clamp(1.0 - exp(-scaledThickness), 0.0, 0.96);

  gl_FragColor = vec4(
    mix(sceneColor.rgb, fluidColor, opacity),
    max(sceneColor.a, opacity)
  );
}
`

interface SSFRRendererOptions {
  appearanceSettings: SsfrAppearanceSettings
  blurSettings: SsfrBlurSettings
  debugView: SsfrDebugView
  height: number
  maxParticles: number
  particleRadius: number
  width: number
}

function getTextureUniform(
  material: THREE.ShaderMaterial,
  uniformName:
    | 'uSceneColorTexture'
    | 'uSceneDepthTexture'
    | 'uFluidDepthTexture'
    | 'uFluidThicknessTexture',
): { value: THREE.DepthTexture | THREE.Texture | null } {
  const uniform = material.uniforms[uniformName]

  if (uniform === undefined) {
    throw new Error(
      `SSFR composite pass is missing texture uniform "${uniformName}".`,
    )
  }

  return uniform as { value: THREE.DepthTexture | THREE.Texture | null }
}

function getColorUniform(material: THREE.ShaderMaterial): {
  value: THREE.Color
} {
  const uniform = material.uniforms['uWaterColor']

  if (uniform === undefined || !(uniform.value instanceof THREE.Color)) {
    throw new Error('SSFR composite pass is missing the water-color uniform.')
  }

  return uniform as { value: THREE.Color }
}

function getVectorUniform(material: THREE.ShaderMaterial): {
  value: THREE.Vector2
} {
  const uniform = material.uniforms['uProjectionScale']

  if (uniform === undefined || !(uniform.value instanceof THREE.Vector2)) {
    throw new Error(
      'SSFR composite pass is missing the projection-scale uniform.',
    )
  }

  return uniform as { value: THREE.Vector2 }
}

function getTexelSizeUniform(material: THREE.ShaderMaterial): {
  value: THREE.Vector2
} {
  const uniform = material.uniforms['uTexelSize']

  if (uniform === undefined || !(uniform.value instanceof THREE.Vector2)) {
    throw new Error('SSFR composite pass is missing the texel-size uniform.')
  }

  return uniform as { value: THREE.Vector2 }
}

function getNumericUniform(
  material: THREE.ShaderMaterial,
  uniformName:
    | 'uAbsorptionStrength'
    | 'uCameraNear'
    | 'uCameraFar'
    | 'uDebugViewMode'
    | 'uFresnelPower'
    | 'uThicknessScale',
): { value: number } {
  const uniform = material.uniforms[uniformName]

  if (uniform === undefined || typeof uniform.value !== 'number') {
    throw new Error(
      `SSFR composite pass is missing numeric uniform "${uniformName}".`,
    )
  }

  return uniform as { value: number }
}

function createSceneRenderTarget(
  width: number,
  height: number,
): THREE.WebGLRenderTarget {
  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: true,
    stencilBuffer: false,
  })
  renderTarget.texture.generateMipmaps = false
  renderTarget.texture.name = 'ssfr-scene-color'
  renderTarget.depthTexture = new THREE.DepthTexture(width, height)
  renderTarget.depthTexture.name = 'ssfr-scene-depth'
  return renderTarget
}

function createCompositeMaterial(
  camera: THREE.PerspectiveCamera,
  appearanceSettings: SsfrAppearanceSettings,
  debugView: SsfrDebugView,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: FLUID_COMPOSITE_FRAGMENT_SHADER,
    transparent: true,
    uniforms: {
      uAbsorptionStrength: { value: appearanceSettings.absorptionStrength },
      uCameraFar: { value: camera.far },
      uCameraNear: { value: camera.near },
      uDebugViewMode: { value: debugViewToUniformValue(debugView) },
      uFresnelPower: { value: appearanceSettings.fresnelPower },
      uFluidDepthTexture: { value: null },
      uFluidThicknessTexture: { value: null },
      uProjectionScale: {
        value: new THREE.Vector2(
          camera.projectionMatrix.elements[0],
          camera.projectionMatrix.elements[5],
        ),
      },
      uSceneColorTexture: { value: null },
      uSceneDepthTexture: { value: null },
      uTexelSize: { value: new THREE.Vector2(1, 1) },
      uThicknessScale: { value: appearanceSettings.thicknessScale },
      uWaterColor: { value: new THREE.Color(appearanceSettings.waterColor) },
    },
    vertexShader: FULLSCREEN_VERTEX_SHADER,
  })
}

export interface SSFRRenderer {
  dispose: () => void
  render: (
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    particlePreview: THREE.Object3D,
  ) => void
  setAppearanceSettings: (appearanceSettings: SsfrAppearanceSettings) => void
  setBlurSettings: (blurSettings: SsfrBlurSettings) => void
  setDebugView: (debugView: SsfrDebugView) => void
  updateFrame: (frame: SimulationFrame, containerSize: ContainerSize) => void
}

function debugViewToUniformValue(debugView: SsfrDebugView): number {
  switch (debugView) {
    case 'depth':
      return 1
    case 'thickness':
      return 2
    case 'normals':
      return 3
    case 'final':
    default:
      return 0
  }
}

export function createSSFRRenderer({
  appearanceSettings,
  blurSettings,
  debugView,
  height,
  maxParticles,
  particleRadius,
  width,
}: SSFRRendererOptions): SSFRRenderer {
  const depthPass: ParticleDepthPass = createParticleDepthPass({
    height,
    maxParticles,
    particleRadius,
    width,
  })
  const thicknessPass: ParticleThicknessPass = createParticleThicknessPass({
    height,
    maxParticles,
    particleRadius,
    width,
  })
  const blurPass: DepthBilateralBlurPass = createDepthBilateralBlurPass({
    blurSettings,
    height,
    width,
  })
  const sceneTarget = createSceneRenderTarget(width, height)
  const size = new THREE.Vector2(width, height)
  const compositeMaterial = createCompositeMaterial(
    new THREE.PerspectiveCamera(45, 1, 0.1, 100),
    appearanceSettings,
    debugView,
  )
  const compositeQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    compositeMaterial,
  )
  compositeQuad.frustumCulled = false
  const compositeScene = new THREE.Scene()
  compositeScene.add(compositeQuad)
  const compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  return {
    dispose: () => {
      depthPass.dispose()
      thicknessPass.dispose()
      blurPass.dispose()
      sceneTarget.dispose()
      compositeQuad.geometry.dispose()
      compositeMaterial.dispose()
    },
    render: (renderer, scene, camera, particlePreview) => {
      renderer.getSize(size)

      const width = Math.max(Math.floor(size.x), 1)
      const height = Math.max(Math.floor(size.y), 1)

      if (sceneTarget.width !== width || sceneTarget.height !== height) {
        sceneTarget.setSize(width, height)
        sceneTarget.depthTexture?.dispose()
        sceneTarget.depthTexture = new THREE.DepthTexture(width, height)
        sceneTarget.depthTexture.name = 'ssfr-scene-depth'
      }

      const previousTarget = renderer.getRenderTarget()
      const previousAutoClear = renderer.autoClear
      const previousClearAlpha = renderer.getClearAlpha()
      const previousClearColor = renderer.getClearColor(new THREE.Color())
      const previousParticleVisibility = particlePreview.visible

      particlePreview.visible = false
      renderer.setRenderTarget(sceneTarget)
      renderer.autoClear = true
      renderer.setClearColor(previousClearColor, previousClearAlpha)
      renderer.clear(true, true, false)
      renderer.render(scene, camera)
      particlePreview.visible = previousParticleVisibility

      depthPass.render(renderer, camera)
      blurPass.render(renderer, depthPass.renderTarget.texture)
      thicknessPass.render(renderer, camera)

      getTextureUniform(compositeMaterial, 'uSceneColorTexture').value =
        sceneTarget.texture
      getTextureUniform(compositeMaterial, 'uSceneDepthTexture').value =
        sceneTarget.depthTexture
      getTextureUniform(compositeMaterial, 'uFluidDepthTexture').value =
        blurPass.renderTarget.texture
      getTextureUniform(compositeMaterial, 'uFluidThicknessTexture').value =
        thicknessPass.renderTarget.texture
      getNumericUniform(compositeMaterial, 'uCameraNear').value = camera.near
      getNumericUniform(compositeMaterial, 'uCameraFar').value = camera.far
      getVectorUniform(compositeMaterial).value.set(
        camera.projectionMatrix.elements[0],
        camera.projectionMatrix.elements[5],
      )
      getTexelSizeUniform(compositeMaterial).value.set(1 / width, 1 / height)

      renderer.setRenderTarget(previousTarget)
      renderer.autoClear = true
      renderer.setClearColor(previousClearColor, previousClearAlpha)
      renderer.clear(true, true, false)
      renderer.render(compositeScene, compositeCamera)
      renderer.autoClear = previousAutoClear
      particlePreview.visible = previousParticleVisibility
    },
    setAppearanceSettings: (nextAppearanceSettings) => {
      getColorUniform(compositeMaterial).value.set(
        nextAppearanceSettings.waterColor,
      )
      getNumericUniform(compositeMaterial, 'uAbsorptionStrength').value =
        nextAppearanceSettings.absorptionStrength
      getNumericUniform(compositeMaterial, 'uFresnelPower').value =
        nextAppearanceSettings.fresnelPower
      getNumericUniform(compositeMaterial, 'uThicknessScale').value =
        nextAppearanceSettings.thicknessScale
    },
    setBlurSettings: (nextBlurSettings) => {
      blurPass.setBlurSettings(nextBlurSettings)
    },
    setDebugView: (nextDebugView) => {
      getNumericUniform(compositeMaterial, 'uDebugViewMode').value =
        debugViewToUniformValue(nextDebugView)
    },
    updateFrame: (frame, containerSize) => {
      depthPass.updateFrame(frame, containerSize)
      thicknessPass.updateFrame(frame, containerSize)
    },
  }
}
