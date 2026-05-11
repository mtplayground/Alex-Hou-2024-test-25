import * as THREE from 'three'

export function createCubeMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x082f49,
    metalness: 0.18,
    roughness: 0.28,
  })
}

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
