import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createObstacleGroup, disposeObstacleGroup } from '@/render/obstacles'

describe('render obstacles helpers', () => {
  it('creates obstacle meshes positioned in container-centered render space', () => {
    const material = new THREE.MeshBasicMaterial()
    const group = createObstacleGroup(
      [
        {
          center: [2.25, 0.9, 2.25],
          id: 'obstacle-a',
          size: [0.8, 0.6, 0.8],
        },
        {
          center: [1.5, 1.2, 3],
          id: 'obstacle-b',
          size: [0.4, 0.5, 0.6],
        },
      ],
      material,
      4.5,
      4.5,
    )

    expect(group.children).toHaveLength(2)

    const first = group.children[0]
    const second = group.children[1]

    if (!(first instanceof THREE.Mesh) || !(second instanceof THREE.Mesh)) {
      throw new Error('Expected obstacle helpers to create meshes.')
    }

    expect(first.position.toArray()).toEqual([0, 0.9, 0])
    expect(second.position.toArray()).toEqual([-0.75, 1.2, 0.75])
    expect(first.userData['obstacleId']).toBe('obstacle-a')

    disposeObstacleGroup(group)
    material.dispose()
  })
})
