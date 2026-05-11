import type { ContainerSize } from '@/store/helloCubeStore'
import * as THREE from 'three'
import { createSceneLighting } from '@/render/lighting'
import { createCubeMaterial, createParticleMaterial } from '@/render/materials'
import {
  buildSimulationPreviewPositions,
  createParticleInstances,
  updateParticleInstances,
} from '@/render/particles'
import { createThreeViewport } from '@/render/threeViewport'
import { SimulationClient } from '@/workers'

interface HelloCubeState {
  containerSize: ContainerSize
  onSimulationError?: (message: string) => void
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

function initializeSimulationClient(
  client: SimulationClient,
  containerSize: ContainerSize,
): void {
  client.init({
    params: {
      containerSize: [
        containerSize.width,
        containerSize.height,
        containerSize.depth,
      ],
      gravity: [0, -9.81, 0],
      particleMass: 0,
      viscosity: 0,
    },
    positions: buildSimulationPreviewPositions(containerSize),
  })
  client.start(1 / 60)
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
  const previewPositions = buildSimulationPreviewPositions(
    initialState.containerSize,
  )
  let activeContainerSize = initialState.containerSize
  const particlePreview = createParticleInstances(
    previewPositions.length,
    particleMaterial,
  )
  scene.add(particlePreview)

  const simulationClient = new SimulationClient()
  const unsubscribeFrames = simulationClient.subscribeToFrames((positions) => {
    updateParticleInstances(particlePreview, positions, activeContainerSize)
  })
  const unsubscribeErrors = simulationClient.subscribeToErrors((message) => {
    initialState.onSimulationError?.(message)
  })
  initializeSimulationClient(simulationClient, initialState.containerSize)

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
      unsubscribeFrames()
      unsubscribeErrors()
      simulationClient.destroy()
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
      activeContainerSize = nextContainerSize
      scene.remove(containerWireframe)
      containerWireframe.geometry.dispose()
      disposeMaterial(containerWireframe.material)
      containerWireframe = createContainerWireframe(nextContainerSize)
      scene.add(containerWireframe)
      controls.target.y = nextContainerSize.height * 0.45
      controls.update()
      initializeSimulationClient(simulationClient, nextContainerSize)
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
