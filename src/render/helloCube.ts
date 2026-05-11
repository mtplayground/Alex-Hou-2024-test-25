import * as THREE from 'three'
import { createThreeViewport } from '@/render/threeViewport'

interface HelloCubeState {
  rotationSpeed: number
  showAxes: boolean
}

export interface HelloCubeController {
  dispose: () => void
  setAxesVisible: (showAxes: boolean) => void
  setRotationSpeed: (rotationSpeed: number) => void
}

export function createHelloCube(
  container: HTMLElement,
  initialState: HelloCubeState,
): HelloCubeController {
  const viewport = createThreeViewport({
    cameraPosition: [2.8, 2.4, 3.6],
    container,
    target: [0, 0, 0],
  })
  const { controls, scene } = viewport
  controls.maxDistance = 8
  controls.minDistance = 2
  controls.enablePan = false

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.6)
  const directionalLight = new THREE.DirectionalLight(0x7dd3fc, 2.6)
  directionalLight.position.set(3, 4, 2)
  scene.add(ambientLight, directionalLight)

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.15,
      roughness: 0.3,
    }),
  )
  cube.rotation.x = 0.55
  cube.rotation.y = 0.35
  scene.add(cube)

  const axesHelper = new THREE.AxesHelper(1.7)
  axesHelper.visible = initialState.showAxes
  scene.add(axesHelper)

  let rotationSpeed = initialState.rotationSpeed
  viewport.start(() => {
    cube.rotation.y += rotationSpeed
    cube.rotation.x += rotationSpeed * 0.5
  })

  return {
    dispose: () => {
      scene.remove(cube, axesHelper, ambientLight, directionalLight)
      cube.geometry.dispose()
      cube.material.dispose()
      viewport.dispose()
    },
    setAxesVisible: (showAxes) => {
      axesHelper.visible = showAxes
    },
    setRotationSpeed: (nextRotationSpeed) => {
      rotationSpeed = nextRotationSpeed
    },
  }
}
