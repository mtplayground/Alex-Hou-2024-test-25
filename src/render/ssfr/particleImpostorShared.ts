import * as THREE from 'three'
import type { ContainerSize } from '@/store/viewportStore'
import type { SimulationFrame } from '@/workers/SimulationClient'

export const PARTICLE_IMPOSTOR_VERTEX_SHADER = `
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

export function createParticleImpostorGeometry(
  maxParticles: number,
): [THREE.BufferGeometry, Float32Array] {
  const positions = new Float32Array(Math.max(maxParticles, 1) * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setDrawRange(0, 0)
  return [geometry, positions]
}

export function updateParticleImpostorGeometry(
  geometry: THREE.BufferGeometry,
  positions: Float32Array,
  frame: SimulationFrame,
  containerSize: ContainerSize,
): void {
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
