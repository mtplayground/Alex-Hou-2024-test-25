import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  createParticleInstances,
  updateParticleInstances,
} from '@/render/particles'

describe('render particles helpers', () => {
  it('updates instanced particle transforms from simulation coordinates', () => {
    const particles = createParticleInstances(
      2,
      new THREE.MeshStandardMaterial(),
    )

    updateParticleInstances(
      particles,
      new Float32Array([0, 0.5, 0, 4, 1.25, 4]),
      {
        depth: 4,
        height: 3,
        width: 4,
      },
    )

    const first = new THREE.Matrix4()
    const second = new THREE.Matrix4()
    const firstPosition = new THREE.Vector3()
    const secondPosition = new THREE.Vector3()
    particles.getMatrixAt(0, first)
    particles.getMatrixAt(1, second)
    firstPosition.setFromMatrixPosition(first)
    secondPosition.setFromMatrixPosition(second)

    expect(firstPosition.toArray()).toEqual([-2, 0.5, -2])
    expect(secondPosition.toArray()).toEqual([2, 1.25, 2])

    particles.geometry.dispose()
    if (Array.isArray(particles.material)) {
      particles.material.forEach((material) => material.dispose())
    } else {
      particles.material.dispose()
    }
  })
})
