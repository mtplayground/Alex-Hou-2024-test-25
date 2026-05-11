import * as THREE from 'three'
import type { ContainerSize } from '@/store/helloCubeStore'

export function createParticleInstances(
  count: number,
  material: THREE.MeshStandardMaterial,
): THREE.InstancedMesh {
  const particleGeometry = new THREE.SphereGeometry(0.08, 16, 16)
  const particles = new THREE.InstancedMesh(particleGeometry, material, count)
  particles.count = count
  return particles
}

export function updateParticleInstances(
  particles: THREE.InstancedMesh,
  positions: Float32Array,
  containerSize: ContainerSize,
): void {
  const transform = new THREE.Matrix4()
  const count = Math.floor(positions.length / 3)

  particles.count = Math.min(count, particles.instanceMatrix.count)

  for (let index = 0; index < particles.count; index += 1) {
    const offset = index * 3
    const x = positions[offset]
    const y = positions[offset + 1]
    const z = positions[offset + 2]

    if (x === undefined || y === undefined || z === undefined) {
      continue
    }

    transform.makeTranslation(
      x - containerSize.width * 0.5,
      y,
      z - containerSize.depth * 0.5,
    )
    particles.setMatrixAt(index, transform)
  }

  particles.instanceMatrix.needsUpdate = true
}
