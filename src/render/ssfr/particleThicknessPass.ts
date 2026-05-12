import * as THREE from 'three'
import type { ContainerSize } from '@/store/viewportStore'
import type { SimulationFrame } from '@/workers/SimulationClient'
import {
  createParticleImpostorGeometry,
  PARTICLE_IMPOSTOR_VERTEX_SHADER,
  updateParticleImpostorGeometry,
} from './particleImpostorShared'

interface ParticleThicknessPassOptions {
  height: number
  maxParticles: number
  particleRadius: number
  width: number
}

export const PARTICLE_THICKNESS_FRAGMENT_SHADER = `
uniform float uParticleRadius;

void main() {
  vec2 sphereUv = gl_PointCoord * 2.0 - 1.0;
  float radiusSquared = dot(sphereUv, sphereUv);

  if (radiusSquared > 1.0) {
    discard;
  }

  float sphereZ = sqrt(1.0 - radiusSquared);
  float thickness = sphereZ * uParticleRadius * 2.0;
  gl_FragColor = vec4(thickness, thickness, thickness, thickness);
}
`

function createParticleThicknessMaterial(
  particleRadius: number,
  viewportHeight: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader: PARTICLE_THICKNESS_FRAGMENT_SHADER,
    transparent: true,
    uniforms: {
      uParticleRadius: { value: particleRadius },
      uViewportHeight: { value: viewportHeight },
    },
    vertexShader: PARTICLE_IMPOSTOR_VERTEX_SHADER,
  })
}

function getViewportHeightUniform(material: THREE.ShaderMaterial): {
  value: number
} {
  const uniform = material.uniforms['uViewportHeight']

  if (uniform === undefined || typeof uniform.value !== 'number') {
    throw new Error(
      'Particle thickness pass is missing the viewport-height uniform.',
    )
  }

  return uniform as { value: number }
}

export interface ParticleThicknessPass {
  dispose: () => void
  readonly renderTarget: THREE.WebGLRenderTarget
  render: (
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
  ) => void
  updateFrame: (frame: SimulationFrame, containerSize: ContainerSize) => void
}

export function createParticleThicknessPass({
  height,
  maxParticles,
  particleRadius,
  width,
}: ParticleThicknessPassOptions): ParticleThicknessPass {
  const [geometry, positions] = createParticleImpostorGeometry(maxParticles)
  const material = createParticleThicknessMaterial(particleRadius, height)
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false

  const scene = new THREE.Scene()
  scene.add(points)

  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: false,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    stencilBuffer: false,
    type: THREE.HalfFloatType,
  })
  renderTarget.texture.generateMipmaps = false
  renderTarget.texture.name = 'ssfr-particle-thickness'

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

      const viewportHeightUniform = getViewportHeightUniform(material)
      viewportHeightUniform.value = Math.max(size.y, 1)

      const previousTarget = renderer.getRenderTarget()
      const previousAutoClear = renderer.autoClear
      const previousClearAlpha = renderer.getClearAlpha()
      const previousClearColor = renderer.getClearColor(new THREE.Color())

      renderer.setRenderTarget(renderTarget)
      renderer.autoClear = true
      renderer.setClearColor(clearColor, 0)
      renderer.clear(true, false, false)
      renderer.render(scene, camera)
      renderer.setRenderTarget(previousTarget)
      renderer.setClearColor(previousClearColor, previousClearAlpha)
      renderer.autoClear = previousAutoClear
    },
    updateFrame: (frame, containerSize) => {
      updateParticleImpostorGeometry(geometry, positions, frame, containerSize)
    },
  }
}
