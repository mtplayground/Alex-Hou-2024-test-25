import type { SceneObstacle } from '@/types/scene'
import * as THREE from 'three'

export function createObstacleGroup(
  obstacles: readonly SceneObstacle[],
  material: THREE.Material,
  containerWidth: number,
  containerDepth: number,
): THREE.Group {
  const group = new THREE.Group()

  obstacles.forEach((obstacle) => {
    const geometry = new THREE.BoxGeometry(
      obstacle.size[0],
      obstacle.size[1],
      obstacle.size[2],
    )
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(
      obstacle.center[0] - containerWidth * 0.5,
      obstacle.center[1],
      obstacle.center[2] - containerDepth * 0.5,
    )
    mesh.userData['obstacleId'] = obstacle.id
    group.add(mesh)
  })

  return group
}

export function disposeObstacleGroup(group: THREE.Group): void {
  group.children.forEach((child) => {
    if (
      child instanceof THREE.Mesh &&
      child.geometry instanceof THREE.BufferGeometry
    ) {
      child.geometry.dispose()
    }
  })
}
