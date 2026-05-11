import type { ContainerSize } from '@/store/helloCubeStore'
import * as THREE from 'three'
import {
  buildInitialFluidBlockPositions,
  type SimParams,
  type SimulationEmitter,
} from '@/sim'
import { createSceneLighting } from '@/render/lighting'
import { createCubeMaterial, createParticleMaterial } from '@/render/materials'
import { createObstacleGroup, disposeObstacleGroup } from '@/render/obstacles'
import {
  createParticleInstances,
  updateParticleInstances,
} from '@/render/particles'
import { createThreeViewport } from '@/render/threeViewport'
import type {
  InitialFluidBlock,
  SceneEmitter,
  SceneObstacle,
} from '@/types/scene'
import { SimulationClient } from '@/workers'

interface HelloCubeState {
  containerSize: ContainerSize
  emitter: SceneEmitter | undefined
  initialFluid: InitialFluidBlock | undefined
  obstacles: SceneObstacle[]
  onSimulationError?: (message: string) => void
  onSimulationReadyChange: ((running: boolean) => void) | undefined
  onStatsChange?: (stats: HelloCubeStats) => void
  rotationSpeed: number
  simParams: SimParams
  simulationSpeed: number
  showHelpers: boolean
}

export interface HelloCubeStats {
  particleCount: number
  renderFps: number
  simTime: number
  stepRate: number
}

export interface HelloCubeController {
  dispose: () => void
  pauseSimulation: () => void
  playSimulation: () => void
  resetSimulation: () => void
  setContainerSize: (containerSize: ContainerSize) => void
  setEmitter: (emitter: SceneEmitter | undefined) => void
  setHelpersVisible: (showHelpers: boolean) => void
  setInitialFluid: (initialFluid: InitialFluidBlock | undefined) => void
  setObstacles: (obstacles: SceneObstacle[]) => void
  setRotationSpeed: (rotationSpeed: number) => void
  setSimulationParams: (simParams: SimParams) => void
  setSimulationSpeed: (simulationSpeed: number) => void
  stepSimulation: () => void
}

interface SimulationSeed {
  emitter: SimulationEmitter | undefined
  positions: [number, number, number][]
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
  obstacles: readonly SceneObstacle[],
  emitter: SimulationEmitter | undefined,
  simParams: SimParams,
  positions: readonly [number, number, number][],
): void {
  client.init({
    ...(emitter === undefined ? {} : { emitter }),
    obstacles: obstacles.map((obstacle) => ({
      center: obstacle.center,
      size: obstacle.size,
    })),
    params: {
      ...simParams,
      containerSize: [
        containerSize.width,
        containerSize.height,
        containerSize.depth,
      ],
    },
    positions,
  })
  client.start(1 / 60)
}

function normalizeEmitterVelocity(
  emitter: SceneEmitter,
): [number, number, number] {
  const magnitude = Math.hypot(
    emitter.direction[0],
    emitter.direction[1],
    emitter.direction[2],
  )

  if (magnitude === 0 || emitter.speed === 0) {
    return [0, 0, 0]
  }

  return [
    (emitter.direction[0] / magnitude) * emitter.speed,
    (emitter.direction[1] / magnitude) * emitter.speed,
    (emitter.direction[2] / magnitude) * emitter.speed,
  ]
}

function buildSimulationSeed(
  containerSize: ContainerSize,
  emitter: SceneEmitter | undefined,
  initialFluid: InitialFluidBlock | undefined,
  simParams: SimParams,
): SimulationSeed {
  if (emitter !== undefined) {
    return {
      emitter: {
        cap: emitter.particleCap,
        position: emitter.position,
        rate: emitter.rate,
        velocity: normalizeEmitterVelocity(emitter),
      },
      positions: [],
    }
  }

  return {
    emitter: undefined,
    positions:
      initialFluid === undefined
        ? []
        : buildInitialFluidBlockPositions(initialFluid, {
            ...simParams,
            containerSize: [
              containerSize.width,
              containerSize.height,
              containerSize.depth,
            ],
          }),
  }
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
  let activeContainerSize = initialState.containerSize
  let activeEmitter = initialState.emitter
  let activeInitialFluid = initialState.initialFluid
  let activeObstacles = initialState.obstacles
  let activeSimParams = initialState.simParams
  let simulationRunning = false
  let simulationSpeed = initialState.simulationSpeed
  let simulationSeed = buildSimulationSeed(
    activeContainerSize,
    activeEmitter,
    activeInitialFluid,
    activeSimParams,
  )
  let latestStats: HelloCubeStats = {
    particleCount: simulationSeed.positions.length,
    renderFps: 0,
    simTime: 0,
    stepRate: 0,
  }
  let lastStatsPublishAt = 0
  let particlePreview = createParticleInstances(
    Math.max(
      simulationSeed.positions.length,
      simulationSeed.emitter?.cap ?? 0,
      1,
    ),
    particleMaterial,
  )
  scene.add(particlePreview)
  const obstacleMaterial = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0x78350f,
    emissiveIntensity: 0.15,
    metalness: 0.08,
    roughness: 0.55,
    transparent: true,
    opacity: 0.92,
  })
  let obstacleGroup = createObstacleGroup(
    activeObstacles,
    obstacleMaterial,
    activeContainerSize.width,
    activeContainerSize.depth,
  )
  scene.add(obstacleGroup)

  const syncParticlePreviewCapacity = (nextSeed: SimulationSeed) => {
    const requiredCapacity = Math.max(
      nextSeed.positions.length,
      nextSeed.emitter?.cap ?? 0,
    )

    if (requiredCapacity <= particlePreview.instanceMatrix.count) {
      return
    }

    scene.remove(particlePreview)
    particlePreview.geometry.dispose()
    particlePreview = createParticleInstances(
      Math.max(requiredCapacity, 1),
      particleMaterial,
    )
    scene.add(particlePreview)
  }

  const reinitializeSimulation = () => {
    simulationSeed = buildSimulationSeed(
      activeContainerSize,
      activeEmitter,
      activeInitialFluid,
      activeSimParams,
    )
    syncParticlePreviewCapacity(simulationSeed)
    initializeSimulationClient(
      simulationClient,
      activeContainerSize,
      activeObstacles,
      simulationSeed.emitter,
      activeSimParams,
      simulationSeed.positions,
    )
    latestStats = {
      ...latestStats,
      particleCount: simulationSeed.positions.length,
      simTime: 0,
      stepRate: 0,
    }
    publishStats(true)
  }

  const simulationStepDt = () => (1 / 60) * simulationSpeed

  const publishStats = (force = false) => {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now()

    if (!force && now - lastStatsPublishAt < 100) {
      return
    }

    lastStatsPublishAt = now
    initialState.onStatsChange?.({
      ...latestStats,
    })
  }

  const simulationClient = new SimulationClient()
  const unsubscribeFrames = simulationClient.subscribeToFrames((positions) => {
    updateParticleInstances(particlePreview, positions, activeContainerSize)
    latestStats = {
      ...latestStats,
      particleCount: positions.length / 3,
    }
    publishStats()
  })
  const unsubscribeErrors = simulationClient.subscribeToErrors((message) => {
    initialState.onSimulationError?.(message)
  })
  const unsubscribeReady = simulationClient.subscribeToReady((payload) => {
    simulationRunning = payload.running
    initialState.onSimulationReadyChange?.(payload.running)
  })
  const unsubscribeStats = simulationClient.subscribeToStats((stats) => {
    latestStats = {
      ...latestStats,
      particleCount: stats.particleCount,
      simTime: stats.simTime,
      stepRate: stats.stepRate,
    }
    publishStats(true)
  })
  initializeSimulationClient(
    simulationClient,
    initialState.containerSize,
    initialState.obstacles,
    simulationSeed.emitter,
    initialState.simParams,
    simulationSeed.positions,
  )

  const axesHelper = new THREE.AxesHelper(1.7)
  const gridHelper = new THREE.GridHelper(8, 8, 0xef4444, 0x334155)
  axesHelper.visible = initialState.showHelpers
  gridHelper.visible = initialState.showHelpers
  scene.add(axesHelper, gridHelper)

  let rotationSpeed = initialState.rotationSpeed
  viewport.start((deltaSeconds) => {
    cube.rotation.y += rotationSpeed
    cube.rotation.x += rotationSpeed * 0.5
    if (deltaSeconds > 0) {
      const frameFps = 1 / deltaSeconds
      latestStats = {
        ...latestStats,
        renderFps:
          latestStats.renderFps === 0
            ? frameFps
            : latestStats.renderFps * 0.85 + frameFps * 0.15,
      }
      publishStats()
    }
  })

  return {
    dispose: () => {
      scene.remove(
        cube,
        containerWireframe,
        particlePreview,
        obstacleGroup,
        axesHelper,
        gridHelper,
      )
      unsubscribeFrames()
      unsubscribeErrors()
      unsubscribeReady()
      unsubscribeStats()
      simulationClient.destroy()
      lighting.dispose()
      cube.geometry.dispose()
      axesHelper.geometry.dispose()
      containerWireframe.geometry.dispose()
      gridHelper.geometry.dispose()
      particlePreview.geometry.dispose()
      disposeObstacleGroup(obstacleGroup)
      disposeMaterial(cube.material)
      disposeMaterial(containerWireframe.material)
      disposeMaterial(gridHelper.material)
      disposeMaterial(particleMaterial)
      disposeMaterial(obstacleMaterial)
      viewport.dispose()
    },
    pauseSimulation: () => {
      simulationClient.pause()
    },
    playSimulation: () => {
      simulationClient.start(simulationStepDt())
    },
    resetSimulation: () => {
      simulationClient.reset()
    },
    stepSimulation: () => {
      simulationClient.step(simulationStepDt())
    },
    setContainerSize: (nextContainerSize) => {
      activeContainerSize = nextContainerSize
      scene.remove(containerWireframe)
      scene.remove(obstacleGroup)
      containerWireframe.geometry.dispose()
      disposeObstacleGroup(obstacleGroup)
      disposeMaterial(containerWireframe.material)
      containerWireframe = createContainerWireframe(nextContainerSize)
      obstacleGroup = createObstacleGroup(
        activeObstacles,
        obstacleMaterial,
        nextContainerSize.width,
        nextContainerSize.depth,
      )
      scene.add(containerWireframe)
      scene.add(obstacleGroup)
      controls.target.y = nextContainerSize.height * 0.45
      controls.update()
      reinitializeSimulation()
    },
    setEmitter: (emitter) => {
      activeEmitter = emitter
      if (emitter !== undefined) {
        activeInitialFluid = undefined
      }
      reinitializeSimulation()
    },
    setHelpersVisible: (showHelpers) => {
      axesHelper.visible = showHelpers
      gridHelper.visible = showHelpers
    },
    setInitialFluid: (initialFluid) => {
      activeInitialFluid = initialFluid
      if (initialFluid !== undefined) {
        activeEmitter = undefined
      }
      reinitializeSimulation()
    },
    setObstacles: (obstacles) => {
      activeObstacles = obstacles
      scene.remove(obstacleGroup)
      disposeObstacleGroup(obstacleGroup)
      obstacleGroup = createObstacleGroup(
        obstacles,
        obstacleMaterial,
        activeContainerSize.width,
        activeContainerSize.depth,
      )
      scene.add(obstacleGroup)
      simulationClient.updateParams(
        {
          containerSize: [
            activeContainerSize.width,
            activeContainerSize.height,
            activeContainerSize.depth,
          ],
        },
        obstacles.map((obstacle) => ({
          center: obstacle.center,
          size: obstacle.size,
        })),
      )
    },
    setRotationSpeed: (nextRotationSpeed) => {
      rotationSpeed = nextRotationSpeed
    },
    setSimulationParams: (nextSimParams) => {
      activeSimParams = nextSimParams
      simulationClient.updateParams({
        ...nextSimParams,
        containerSize: [
          activeContainerSize.width,
          activeContainerSize.height,
          activeContainerSize.depth,
        ],
      })
    },
    setSimulationSpeed: (nextSimulationSpeed) => {
      simulationSpeed = nextSimulationSpeed

      if (simulationRunning) {
        simulationClient.start(simulationStepDt())
      }
    },
  }
}
