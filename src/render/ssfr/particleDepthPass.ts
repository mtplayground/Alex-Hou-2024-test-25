import * as THREE from 'three'
import type { ContainerSize } from '@/store/viewportStore'
import type { SimulationFrame } from '@/workers/SimulationClient'

interface ParticleDepthPassOptions {
  height: number
  maxParticles: number
  particleRadius: number
  width: number
}

const PARTICLE_DEPTH_VERTEX_SHADER = `
uniform float uParticleRadius;
uniform float uViewportHeight;

varying vec3 vViewCenter;

void main() {
  vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
  vViewCenter = modelViewPosition.xyz;

  float pointDiameter = uParticleRadius * 2.0;
  gl_PointSize = max(
    1.0,
    (pointDiameter * projectionMatrix[1][1] * uViewportHeight) /
      max(-modelViewPosition.z, 0.0001)
  );

  gl_Position = projectionMatrix * modelViewPosition;
}
`

const PARTICLE_DEPTH_FRAGMENT_SHADER = `
uniform float uParticleRadius;
uniform mat4 uProjectionMatrix;

varying vec3 vViewCenter;

void main() {
  vec2 sphereUv = gl_PointCoord * 2.0 - 1.0;
  float radiusSquared = dot(sphereUv, sphereUv);

  if (radiusSquared > 1.0) {
    discard;
  }

  float sphereZ = sqrt(1.0 - radiusSquared);
  vec3 viewPosition = vec3(
    vViewCenter.xy + sphereUv * uParticleRadius,
    vViewCenter.z + sphereZ * uParticleRadius
  );

  vec4 clipPosition = uProjectionMatrix * vec4(viewPosition, 1.0);
  float ndcDepth = clipPosition.z / clipPosition.w;
  gl_FragDepth = ndcDepth * 0.5 + 0.5;

  float viewSpaceDepth = -viewPosition.z;
  gl_FragColor = vec4(viewSpaceDepth, viewSpaceDepth, viewSpaceDepth, 1.0);
}
`

function createParticleDepthMaterial(
  particleRadius: number,
  viewportHeight: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    blending: THREE.NoBlending,
    depthTest: true,
    depthWrite: true,
    fragmentShader: PARTICLE_DEPTH_FRAGMENT_SHADER,
    transparent: false,
    uniforms: {
      uParticleRadius: { value: particleRadius },
      uProjectionMatrix: { value: new THREE.Matrix4() },
      uViewportHeight: { value: viewportHeight },
    },
    vertexShader: PARTICLE_DEPTH_VERTEX_SHADER,
  })
}

function getNumericUniform(
  material: THREE.ShaderMaterial,
  uniformName: 'uViewportHeight',
): { value: number } {
  const uniform = material.uniforms[uniformName]

  if (uniform === undefined || typeof uniform.value !== 'number') {
    throw new Error(
      `Particle depth pass is missing numeric uniform "${uniformName}".`,
    )
  }

  return uniform as { value: number }
}

function getMatrixUniform(
  material: THREE.ShaderMaterial,
  uniformName: 'uProjectionMatrix',
): { value: THREE.Matrix4 } {
  const uniform = material.uniforms[uniformName]

  if (uniform === undefined || !(uniform.value instanceof THREE.Matrix4)) {
    throw new Error(
      `Particle depth pass is missing matrix uniform "${uniformName}".`,
    )
  }

  return uniform as { value: THREE.Matrix4 }
}

function writeCenteredParticlePositions(
  target: Float32Array,
  frame: SimulationFrame,
  containerSize: ContainerSize,
): number {
  const particleCount = Math.min(
    Math.floor(frame.positions.length / 3),
    Math.floor(target.length / 3),
  )

  for (let index = 0; index < particleCount; index += 1) {
    const offset = index * 3
    target[offset] = (frame.positions[offset] ?? 0) - containerSize.width * 0.5
    target[offset + 1] = frame.positions[offset + 1] ?? 0
    target[offset + 2] =
      (frame.positions[offset + 2] ?? 0) - containerSize.depth * 0.5
  }

  return particleCount
}

export interface ParticleDepthPass {
  dispose: () => void
  readonly renderTarget: THREE.WebGLRenderTarget
  render: (
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
  ) => void
  updateFrame: (frame: SimulationFrame, containerSize: ContainerSize) => void
}

export function createParticleDepthPass({
  height,
  maxParticles,
  particleRadius,
  width,
}: ParticleDepthPassOptions): ParticleDepthPass {
  const positions = new Float32Array(Math.max(maxParticles, 1) * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setDrawRange(0, 0)

  const material = createParticleDepthMaterial(particleRadius, height)
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false

  const scene = new THREE.Scene()
  scene.add(points)

  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: true,
    magFilter: THREE.NearestFilter,
    minFilter: THREE.NearestFilter,
    stencilBuffer: false,
    type: THREE.HalfFloatType,
  })
  renderTarget.texture.generateMipmaps = false
  renderTarget.texture.name = 'ssfr-particle-depth'

  const size = new THREE.Vector2(width, height)
  const clearColor = new THREE.Color(0x000000)

  return {
    dispose: () => {
      renderTarget.dispose()
      geometry.dispose()
      material.dispose()
    },
    renderTarget,
    render: (renderer, camera) => {
      renderer.getSize(size)

      if (
        renderTarget.width !== Math.max(Math.floor(size.x), 1) ||
        renderTarget.height !== Math.max(Math.floor(size.y), 1)
      ) {
        renderTarget.setSize(
          Math.max(Math.floor(size.x), 1),
          Math.max(Math.floor(size.y), 1),
        )
      }

      const viewportHeightUniform = getNumericUniform(
        material,
        'uViewportHeight',
      )
      const projectionMatrixUniform = getMatrixUniform(
        material,
        'uProjectionMatrix',
      )
      viewportHeightUniform.value = Math.max(size.y, 1)
      projectionMatrixUniform.value.copy(camera.projectionMatrix)

      const previousTarget = renderer.getRenderTarget()
      const previousAutoClear = renderer.autoClear
      const previousClearAlpha = renderer.getClearAlpha()
      const previousClearColor = renderer.getClearColor(new THREE.Color())

      renderer.setRenderTarget(renderTarget)
      renderer.autoClear = true
      renderer.setClearColor(clearColor, 0)
      renderer.clear(true, true, false)
      renderer.render(scene, camera)
      renderer.setRenderTarget(previousTarget)
      renderer.setClearColor(previousClearColor, previousClearAlpha)
      renderer.autoClear = previousAutoClear
    },
    updateFrame: (frame, containerSize) => {
      const particleCount = writeCenteredParticlePositions(
        positions,
        frame,
        containerSize,
      )
      geometry.setDrawRange(0, particleCount)
      const positionAttribute = geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute
      positionAttribute.needsUpdate = true
    },
  }
}
