import * as THREE from 'three'

export interface SceneLighting {
  ambientLight: THREE.AmbientLight
  directionalLight: THREE.DirectionalLight
  dispose: () => void
}

export function createSceneLighting(scene: THREE.Scene): SceneLighting {
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4)
  const directionalLight = new THREE.DirectionalLight(0x7dd3fc, 2.8)
  directionalLight.position.set(3, 4, 2)
  directionalLight.castShadow = false
  scene.add(ambientLight, directionalLight)

  return {
    ambientLight,
    directionalLight,
    dispose: () => {
      scene.remove(ambientLight, directionalLight)
    },
  }
}
