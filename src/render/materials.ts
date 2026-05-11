import * as THREE from 'three'

export function createParticleMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.18,
    metalness: 0.05,
    roughness: 0.35,
    vertexColors: true,
  })
}
