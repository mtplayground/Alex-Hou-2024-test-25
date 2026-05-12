import * as THREE from 'three'
import type { SsfrBlurSettings } from '@/store/viewportStore'

const MAX_BLUR_RADIUS = 8
const MAX_BLUR_ITERATIONS = 4
const MAX_BLUR_RADIUS_GLSL = String(MAX_BLUR_RADIUS)

export const FULLSCREEN_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const BILATERAL_BLUR_FRAGMENT_SHADER = `
uniform sampler2D uDepthTexture;
uniform vec2 uBlurDirection;
uniform vec2 uTexelSize;
uniform float uBlurRadius;
uniform float uDepthSharpness;

varying vec2 vUv;

const int MAX_RADIUS = ${MAX_BLUR_RADIUS_GLSL};

void main() {
  float centerDepth = texture2D(uDepthTexture, vUv).r;

  if (centerDepth <= 0.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float sigma = max(uBlurRadius * 0.5, 0.0001);
  float weightedDepth = 0.0;
  float totalWeight = 0.0;

  for (int index = -MAX_RADIUS; index <= MAX_RADIUS; index += 1) {
    float offset = float(index);

    if (abs(offset) > uBlurRadius) {
      continue;
    }

    vec2 sampleUv = vUv + (uBlurDirection * uTexelSize * offset);
    float sampleDepth = texture2D(uDepthTexture, sampleUv).r;

    if (sampleDepth <= 0.0) {
      continue;
    }

    float spatialWeight = exp(-(offset * offset) / (2.0 * sigma * sigma));
    float relativeDepthDelta =
      abs(sampleDepth - centerDepth) / max(centerDepth, 0.0001);
    float rangeWeight = exp(-relativeDepthDelta * uDepthSharpness);
    float weight = spatialWeight * rangeWeight;

    weightedDepth += sampleDepth * weight;
    totalWeight += weight;
  }

  float blurredDepth =
    totalWeight > 0.0 ? (weightedDepth / totalWeight) : centerDepth;
  gl_FragColor = vec4(blurredDepth, blurredDepth, blurredDepth, 1.0);
}
`

function sanitizeBlurSettings(
  blurSettings: SsfrBlurSettings,
): Required<SsfrBlurSettings> {
  return {
    iterations: Math.min(
      MAX_BLUR_ITERATIONS,
      Math.max(1, Math.round(blurSettings.iterations)),
    ),
    radius: Math.min(MAX_BLUR_RADIUS, Math.max(0, blurSettings.radius)),
  }
}

function getDepthTextureUniform(material: THREE.ShaderMaterial): {
  value: THREE.Texture | null
} {
  const uniform = material.uniforms['uDepthTexture']

  if (uniform === undefined) {
    throw new Error(
      'Depth bilateral blur pass is missing the depth-texture uniform.',
    )
  }

  return uniform as { value: THREE.Texture | null }
}

function getVector2Uniform(
  material: THREE.ShaderMaterial,
  uniformName: 'uBlurDirection' | 'uTexelSize',
): { value: THREE.Vector2 } {
  const uniform = material.uniforms[uniformName]

  if (uniform === undefined || !(uniform.value instanceof THREE.Vector2)) {
    throw new Error(
      `Depth bilateral blur pass is missing vector uniform "${uniformName}".`,
    )
  }

  return uniform as { value: THREE.Vector2 }
}

function getNumericUniform(
  material: THREE.ShaderMaterial,
  uniformName: 'uBlurRadius',
): { value: number } {
  const uniform = material.uniforms[uniformName]

  if (uniform === undefined || typeof uniform.value !== 'number') {
    throw new Error(
      `Depth bilateral blur pass is missing numeric uniform "${uniformName}".`,
    )
  }

  return uniform as { value: number }
}

export interface DepthBilateralBlurPass {
  dispose: () => void
  readonly renderTarget: THREE.WebGLRenderTarget
  render: (renderer: THREE.WebGLRenderer, sourceTexture: THREE.Texture) => void
  setBlurSettings: (blurSettings: SsfrBlurSettings) => void
}

export function createDepthBilateralBlurPass(options: {
  blurSettings: SsfrBlurSettings
  height: number
  width: number
}): DepthBilateralBlurPass {
  let activeBlurSettings = sanitizeBlurSettings(options.blurSettings)

  const material = new THREE.ShaderMaterial({
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader: BILATERAL_BLUR_FRAGMENT_SHADER,
    transparent: false,
    uniforms: {
      uBlurDirection: { value: new THREE.Vector2(1, 0) },
      uBlurRadius: { value: activeBlurSettings.radius },
      uDepthSharpness: { value: 48 },
      uDepthTexture: { value: null },
      uTexelSize: {
        value: new THREE.Vector2(1 / options.width, 1 / options.height),
      },
    },
    vertexShader: FULLSCREEN_VERTEX_SHADER,
  })

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  quad.frustumCulled = false
  const scene = new THREE.Scene()
  scene.add(quad)
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  const intermediateTarget = new THREE.WebGLRenderTarget(
    options.width,
    options.height,
    {
      depthBuffer: false,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      stencilBuffer: false,
      type: THREE.HalfFloatType,
    },
  )
  intermediateTarget.texture.generateMipmaps = false
  intermediateTarget.texture.name = 'ssfr-depth-blur-intermediate'

  const renderTarget = new THREE.WebGLRenderTarget(
    options.width,
    options.height,
    {
      depthBuffer: false,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      stencilBuffer: false,
      type: THREE.HalfFloatType,
    },
  )
  renderTarget.texture.generateMipmaps = false
  renderTarget.texture.name = 'ssfr-depth-blur'

  const size = new THREE.Vector2(options.width, options.height)
  const clearColor = new THREE.Color(0x000000)

  return {
    dispose: () => {
      intermediateTarget.dispose()
      renderTarget.dispose()
      quad.geometry.dispose()
      material.dispose()
    },
    renderTarget,
    render: (renderer, sourceTexture) => {
      renderer.getSize(size)

      const width = Math.max(Math.floor(size.x), 1)
      const height = Math.max(Math.floor(size.y), 1)

      if (
        intermediateTarget.width !== width ||
        intermediateTarget.height !== height
      ) {
        intermediateTarget.setSize(width, height)
      }
      if (renderTarget.width !== width || renderTarget.height !== height) {
        renderTarget.setSize(width, height)
      }

      const depthTextureUniform = getDepthTextureUniform(material)
      const blurDirectionUniform = getVector2Uniform(material, 'uBlurDirection')
      const texelSizeUniform = getVector2Uniform(material, 'uTexelSize')
      const blurRadiusUniform = getNumericUniform(material, 'uBlurRadius')

      texelSizeUniform.value.set(1 / width, 1 / height)
      blurRadiusUniform.value = activeBlurSettings.radius

      const previousTarget = renderer.getRenderTarget()
      const previousAutoClear = renderer.autoClear
      const previousClearAlpha = renderer.getClearAlpha()
      const previousClearColor = renderer.getClearColor(new THREE.Color())

      renderer.autoClear = true
      renderer.setClearColor(clearColor, 0)

      let currentSource = sourceTexture
      for (
        let iteration = 0;
        iteration < activeBlurSettings.iterations;
        iteration += 1
      ) {
        depthTextureUniform.value = currentSource
        blurDirectionUniform.value.set(1, 0)
        renderer.setRenderTarget(intermediateTarget)
        renderer.clear(true, false, false)
        renderer.render(scene, camera)

        depthTextureUniform.value = intermediateTarget.texture
        blurDirectionUniform.value.set(0, 1)
        renderer.setRenderTarget(renderTarget)
        renderer.clear(true, false, false)
        renderer.render(scene, camera)

        currentSource = renderTarget.texture
      }

      renderer.setRenderTarget(previousTarget)
      renderer.setClearColor(previousClearColor, previousClearAlpha)
      renderer.autoClear = previousAutoClear
    },
    setBlurSettings: (blurSettings) => {
      activeBlurSettings = sanitizeBlurSettings(blurSettings)
    },
  }
}
