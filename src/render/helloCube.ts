import type { ContainerSize } from '@/store/helloCubeStore'
import * as THREE from 'three'
import { createSceneLighting } from '@/render/lighting'
import { createCubeMaterial, createParticleMaterial } from '@/render/materials'
import { createThreeViewport } from '@/render/threeViewport'

interface HelloCubeState {
  containerSize: ContainerSize
  rotationSpeed: number
  showHelpers: boolean
}

export interface HelloCubeController {
  dispose: () => void
  setContainerSize: (containerSize: ContainerSize) => void
  setHelpersVisible: (showHelpers: boolean) => void
  setRotationSpeed: (rotationSpeed: number) => void
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose())
    return
  }

  material.dispose()
}

function createContainerWireframe(
  containerSize: ContainerSize,
): THREE.LineSegments {
  const containerGeometry = new THREE.BoxGeometry(
    containerSize.width,
    containerSize.height,
    containerSize.depth,
  )
  const containerEdges = new THREE.EdgesGeometry(containerGeometry)
  const containerMaterial = new THREE.LineBasicMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.75,
  })
  const containerWireframe = new THREE.LineSegments(
    containerEdges,
    containerMaterial,
  )
  containerWireframe.position.y = containerSize.height * 0.5
  containerGeometry.dispose()
  return containerWireframe
}

function createParticlePreview(
  containerSize: ContainerSize,
  material: THREE.MeshStandardMaterial,
): THREE.InstancedMesh {
  const particleGeometry = new THREE.SphereGeometry(0.12, 20, 20)
  const previewPositions: [number, number, number][] = [
    [-0.6, 0.55, -0.55],
    [-0.2, 0.75, -0.1],
    [0.2, 0.95, 0.25],
    [0.55, 0.65, -0.3],
    [-0.45, 1.15, 0.45],
    [0.05, 1.35, -0.45],
    [0.45, 1.05, 0.4],
    [0.75, 0.85, 0.05],
  ]
  const particlePreview = new THREE.InstancedMesh(
    particleGeometry,
    material,
    previewPositions.length,
  )
  const transform = new THREE.Matrix4()

  previewPositions.forEach(([x, y, z], index) => {
    transform.makeTranslation(
      x * containerSize.width * 0.35,
      Math.min(y, containerSize.height * 0.82),
      z * containerSize.depth * 0.35,
    )
    particlePreview.setMatrixAt(index, transform)
  })

  particlePreview.instanceMatrix.needsUpdate = true
  return particlePreview
}

export function createHelloCube(
  container: HTMLElement,
  initialState: HelloCubeState,
): HelloCubeController {
  const viewport = createThreeViewport({
    cameraPosition: [2.8, 2.4, 3.6],
    container,
    target: [0, initialState.containerSize.height * 0.45, 0],
  })
  const { controls, scene } = viewport
  controls.maxDistance = 8
  controls.minDistance = 2
  controls.enablePan = false

  const lighting = createSceneLighting(scene)

  const cubeMaterial = createCubeMaterial()
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    cubeMaterial,
  )
  cube.position.y = 0.85
  cube.rotation.x = 0.55
  cube.rotation.y = 0.35
  scene.add(cube)

  let containerWireframe = createContainerWireframe(initialState.containerSize)
  scene.add(containerWireframe)

  const particleMaterial = createParticleMaterial()
  let particlePreview = createParticlePreview(
    initialState.containerSize,
    particleMaterial,
  )
  scene.add(particlePreview)

  const axesHelper = new THREE.AxesHelper(1.7)
  const gridHelper = new THREE.GridHelper(8, 8, 0xef4444, 0x334155)
  axesHelper.visible = initialState.showHelpers
  gridHelper.visible = initialState.showHelpers
  scene.add(axesHelper, gridHelper)

  let rotationSpeed = initialState.rotationSpeed
  viewport.start(() => {
    cube.rotation.y += rotationSpeed
    cube.rotation.x += rotationSpeed * 0.5
  })

  return {
    dispose: () => {
      scene.remove(
        cube,
        containerWireframe,
        particlePreview,
        axesHelper,
        gridHelper,
      )
      lighting.dispose()
      cube.geometry.dispose()
      axesHelper.geometry.dispose()
      containerWireframe.geometry.dispose()
      gridHelper.geometry.dispose()
      particlePreview.geometry.dispose()
      disposeMaterial(cube.material)
      disposeMaterial(containerWireframe.material)
      disposeMaterial(gridHelper.material)
      disposeMaterial(particleMaterial)
      viewport.dispose()
    },
    setContainerSize: (nextContainerSize) => {
      scene.remove(containerWireframe)
      scene.remove(particlePreview)
      containerWireframe.geometry.dispose()
      particlePreview.geometry.dispose()
      disposeMaterial(containerWireframe.material)
      containerWireframe = createContainerWireframe(nextContainerSize)
      particlePreview = createParticlePreview(
        nextContainerSize,
        particleMaterial,
      )
      scene.add(containerWireframe)
      scene.add(particlePreview)
      controls.target.y = nextContainerSize.height * 0.45
      controls.update()
    },
    setHelpersVisible: (showHelpers) => {
      axesHelper.visible = showHelpers
      gridHelper.visible = showHelpers
    },
    setRotationSpeed: (nextRotationSpeed) => {
      rotationSpeed = nextRotationSpeed
    },
  }
}
