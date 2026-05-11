import type { ContainerSize } from '@/store/viewportStore'
import type { SsfrBlurSettings } from '@/store/viewportStore'
import type { VisualizationMode } from '@/store/viewportStore'
import JSZip from 'jszip'
import * as THREE from 'three'
import {
  buildInitialFluidBlockPositions,
  sanitizeParticleCount,
  sanitizeSimParams,
  sanitizeTimeStep,
  type SimParams,
  type SimulationEmitter,
} from '@/sim'
import { createSceneLighting } from '@/render/lighting'
import { createParticleMaterial } from '@/render/materials'
import { createObstacleGroup, disposeObstacleGroup } from '@/render/obstacles'
import {
  createParticleInstances,
  updateParticleInstances,
} from '@/render/particles'
import { createSSFRRenderer, type SSFRRenderer } from '@/render/ssfr'
import { createThreeViewport } from '@/render/threeViewport'
import type {
  InitialFluidBlock,
  SceneEmitter,
  SceneObstacle,
} from '@/types/scene'
import { SimulationClient } from '@/workers'
import type { SimulationFrame } from '@/workers/SimulationClient'

interface PlaygroundSceneState {
  containerSize: ContainerSize
  emitter: SceneEmitter | undefined
  initialFluid: InitialFluidBlock | undefined
  obstacles: SceneObstacle[]
  onPngCaptureChange?: (state: PngCaptureState) => void
  onSimulationError?: (message: string) => void
  onSimulationReadyChange: ((running: boolean) => void) | undefined
  onStatsChange?: (stats: PlaygroundSceneStats) => void
  onWebmCaptureChange?: (state: WebmCaptureState) => void
  ssfrBlurSettings: SsfrBlurSettings
  simParams: SimParams
  simulationSpeed: number
  showHelpers: boolean
  visualizationMode: VisualizationMode
}

export interface PlaygroundSceneStats {
  particleCount: number
  renderFps: number
  simTime: number
  stepRate: number
}

export interface PngCaptureState {
  active: boolean
  frameCount: number
}

export interface WebmCaptureState {
  active: boolean
  framerate: number
}

export interface PlaygroundSceneController {
  dispose: () => void
  pauseSimulation: () => void
  playSimulation: () => void
  resetSimulation: () => void
  setContainerSize: (containerSize: ContainerSize) => void
  setEmitter: (emitter: SceneEmitter | undefined) => void
  setHelpersVisible: (showHelpers: boolean) => void
  setInitialFluid: (initialFluid: InitialFluidBlock | undefined) => void
  setObstacles: (obstacles: SceneObstacle[]) => void
  setSimulationParams: (simParams: SimParams) => void
  setSimulationSpeed: (simulationSpeed: number) => void
  setSsfrBlurSettings: (ssfrBlurSettings: SsfrBlurSettings) => void
  setVisualizationMode: (visualizationMode: VisualizationMode) => void
  startPngCapture: () => void
  startWebmCapture: (framerate: number) => void
  stopPngCapture: () => Promise<void>
  stopWebmCapture: () => Promise<void>
  stepSimulation: () => void
}

interface SimulationSeed {
  emitter: SimulationEmitter | undefined
  positions: [number, number, number][]
}

interface PngCaptureSession {
  frameCount: number
  pendingCaptures: Set<Promise<void>>
  zip: JSZip
}

interface WebmCaptureSession {
  chunks: Blob[]
  framerate: number
  mimeType: string
  recorder: MediaRecorder
  stream: MediaStream
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
        cap: sanitizeParticleCount(emitter.particleCap, 1024),
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

function createCaptureDownloadName() {
  const timestamp = new Date().toISOString().replaceAll(':', '-')
  return `png-frames-${timestamp}.zip`
}

function createWebmDownloadName() {
  const timestamp = new Date().toISOString().replaceAll(':', '-')
  return `viewport-recording-${timestamp}.webm`
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

function getSupportedWebmMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') {
    return null
  }

  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate
    }
  }

  return null
}

export function createPlaygroundScene(
  container: HTMLElement,
  initialState: PlaygroundSceneState,
): PlaygroundSceneController {
  const particleRadius = 0.08
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

  let containerWireframe = createContainerWireframe(initialState.containerSize)
  scene.add(containerWireframe)

  const particleMaterial = createParticleMaterial()
  let activeContainerSize = initialState.containerSize
  let activeEmitter = initialState.emitter
  let activeInitialFluid = initialState.initialFluid
  let activeObstacles = initialState.obstacles
  let activeSimParams = initialState.simParams
  let activeSsfrBlurSettings = initialState.ssfrBlurSettings
  let simulationRunning = false
  let simulationSpeed = initialState.simulationSpeed
  let activeVisualizationMode = initialState.visualizationMode
  let simulationSeed = buildSimulationSeed(
    activeContainerSize,
    activeEmitter,
    activeInitialFluid,
    activeSimParams,
  )
  let latestStats: PlaygroundSceneStats = {
    particleCount: simulationSeed.positions.length,
    renderFps: 0,
    simTime: 0,
    stepRate: 0,
  }
  let lastStatsPublishAt = 0
  let lastFrame: SimulationFrame | null = null
  let captureSession: PngCaptureSession | null = null
  let captureStopping = false
  let webmCaptureSession: WebmCaptureSession | null = null
  let webmStopping = false
  let particlePreview = createParticleInstances(
    Math.max(
      simulationSeed.positions.length,
      simulationSeed.emitter?.cap ?? 0,
      1,
    ),
    particleMaterial,
  )
  scene.add(particlePreview)
  let ssfrRenderer: SSFRRenderer = createSSFRRenderer({
    blurSettings: activeSsfrBlurSettings,
    height: Math.max(container.clientHeight, 1),
    maxParticles: particlePreview.instanceMatrix.count,
    particleRadius,
    width: Math.max(container.clientWidth, 1),
  })
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
    ssfrRenderer.dispose()
    particlePreview = createParticleInstances(
      Math.max(requiredCapacity, 1),
      particleMaterial,
    )
    ssfrRenderer = createSSFRRenderer({
      blurSettings: activeSsfrBlurSettings,
      height: Math.max(container.clientHeight, 1),
      maxParticles: particlePreview.instanceMatrix.count,
      particleRadius,
      width: Math.max(container.clientWidth, 1),
    })
    scene.add(particlePreview)

    if (lastFrame) {
      ssfrRenderer.updateFrame(lastFrame, activeContainerSize)
    }
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
  const safeSimulationStepDt = () =>
    sanitizeTimeStep(simulationStepDt(), activeSimParams.timeStep)

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

  const publishCaptureState = () => {
    initialState.onPngCaptureChange?.({
      active: captureSession !== null,
      frameCount: captureSession?.frameCount ?? 0,
    })
  }

  const publishWebmCaptureState = () => {
    initialState.onWebmCaptureChange?.({
      active: webmCaptureSession !== null,
      framerate: webmCaptureSession?.framerate ?? 0,
    })
  }

  const capturePngFrame = () => {
    if (captureSession === null || captureStopping) {
      return
    }

    const nextFrameIndex = captureSession.frameCount + 1
    captureSession.frameCount = nextFrameIndex
    publishCaptureState()

    const activeSession = captureSession
    const capturePromise = new Promise<void>((resolve) => {
      viewport.renderer.domElement.toBlob((blob) => {
        if (blob === null) {
          initialState.onSimulationError?.(
            'PNG capture failed while reading the canvas frame.',
          )
          resolve()
          return
        }

        activeSession.zip.file(
          `frame-${nextFrameIndex.toString().padStart(6, '0')}.png`,
          blob,
        )
        resolve()
      }, 'image/png')
    })

    activeSession.pendingCaptures.add(capturePromise)
    void capturePromise.finally(() => {
      activeSession.pendingCaptures.delete(capturePromise)
    })
  }

  const stopCaptureSession = async () => {
    if (captureSession === null || captureStopping) {
      return
    }

    captureStopping = true
    const activeSession = captureSession
    captureSession = null
    publishCaptureState()

    await Promise.allSettled([...activeSession.pendingCaptures])

    try {
      const zipBlob = await activeSession.zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, createCaptureDownloadName())
    } finally {
      captureStopping = false
    }
  }

  const stopWebmCaptureSession = async () => {
    if (webmCaptureSession === null || webmStopping) {
      return
    }

    webmStopping = true
    const activeSession = webmCaptureSession
    webmCaptureSession = null
    publishWebmCaptureState()

    try {
      if (activeSession.recorder.state !== 'inactive') {
        await new Promise<void>((resolve, reject) => {
          let settled = false
          const settle = (callback: () => void) => {
            if (settled) {
              return
            }

            settled = true
            callback()
          }
          const handleStop = () => {
            settle(resolve)
          }
          const handleError = (event: Event) => {
            const recorderError = event as ErrorEvent
            settle(() =>
              reject(
                new Error(
                  recorderError.message ||
                    'The MediaRecorder session ended with an unknown error.',
                ),
              ),
            )
          }
          const timeout = window.setTimeout(() => {
            settle(resolve)
          }, 1500)

          activeSession.recorder.addEventListener('stop', handleStop, {
            once: true,
          })
          activeSession.recorder.addEventListener('error', handleError, {
            once: true,
          })
          try {
            activeSession.recorder.requestData()
          } catch {
            // Ignore requestData failures and rely on stop/timeout.
          }
          activeSession.recorder.stop()
          activeSession.recorder.addEventListener(
            'stop',
            () => {
              window.clearTimeout(timeout)
            },
            { once: true },
          )
          activeSession.recorder.addEventListener(
            'error',
            () => {
              window.clearTimeout(timeout)
            },
            { once: true },
          )
        })
      }

      const videoBlob = new Blob(activeSession.chunks, {
        type: activeSession.mimeType,
      })

      if (videoBlob.size === 0) {
        throw new Error('WebM export produced an empty recording.')
      }

      downloadBlob(videoBlob, createWebmDownloadName())
    } catch (error) {
      initialState.onSimulationError?.(
        error instanceof Error ? error.message : 'WebM capture failed.',
      )
    } finally {
      activeSession.stream.getTracks().forEach((track) => {
        track.stop()
      })
      webmStopping = false
    }
  }

  const simulationClient = new SimulationClient()
  const unsubscribeFrames = simulationClient.subscribeToFrames((frame) => {
    lastFrame = frame
    updateParticleInstances(
      particlePreview,
      frame,
      activeContainerSize,
      activeVisualizationMode,
    )
    ssfrRenderer.updateFrame(frame, activeContainerSize)
    latestStats = {
      ...latestStats,
      particleCount: frame.positions.length / 3,
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

  publishCaptureState()
  publishWebmCaptureState()
  viewport.start(
    (deltaSeconds) => {
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
    },
    (renderer, currentScene, camera) => {
      ssfrRenderer.render(renderer, currentScene, camera, particlePreview)
      capturePngFrame()
    },
  )

  return {
    dispose: () => {
      void stopCaptureSession()
      void stopWebmCaptureSession()
      scene.remove(
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
      ssfrRenderer.dispose()
      axesHelper.geometry.dispose()
      containerWireframe.geometry.dispose()
      gridHelper.geometry.dispose()
      particlePreview.geometry.dispose()
      disposeObstacleGroup(obstacleGroup)
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
      simulationClient.start(safeSimulationStepDt())
    },
    resetSimulation: () => {
      simulationClient.reset()
    },
    startPngCapture: () => {
      if (captureSession !== null || captureStopping) {
        return
      }

      captureSession = {
        frameCount: 0,
        pendingCaptures: new Set(),
        zip: new JSZip(),
      }
      publishCaptureState()
    },
    startWebmCapture: (framerate) => {
      if (webmCaptureSession !== null || webmStopping) {
        return
      }

      if (typeof MediaRecorder === 'undefined') {
        initialState.onSimulationError?.(
          'WebM export is not supported in this browser context.',
        )
        return
      }

      if (typeof viewport.renderer.domElement.captureStream !== 'function') {
        initialState.onSimulationError?.(
          'Canvas stream capture is not supported in this browser context.',
        )
        return
      }

      const mimeType = getSupportedWebmMimeType()

      if (mimeType === null) {
        initialState.onSimulationError?.(
          'This browser does not support a WebM MediaRecorder configuration.',
        )
        return
      }

      const safeFramerate = Math.max(1, Math.round(framerate))
      const stream = viewport.renderer.domElement.captureStream(safeFramerate)

      try {
        const chunks: Blob[] = []
        const recorder = new MediaRecorder(stream, { mimeType })
        recorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        })
        recorder.addEventListener('error', (event) => {
          initialState.onSimulationError?.(
            event.message || 'WebM recording failed.',
          )
        })
        recorder.start(250)
        webmCaptureSession = {
          chunks,
          framerate: safeFramerate,
          mimeType,
          recorder,
          stream,
        }
        publishWebmCaptureState()
      } catch (error) {
        stream.getTracks().forEach((track) => {
          track.stop()
        })
        initialState.onSimulationError?.(
          error instanceof Error ? error.message : 'WebM recording failed.',
        )
      }
    },
    stepSimulation: () => {
      simulationClient.step(safeSimulationStepDt())
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
    setSimulationParams: (nextSimParams) => {
      activeSimParams = sanitizeSimParams(nextSimParams)
      simulationClient.updateParams({
        ...activeSimParams,
        containerSize: [
          activeContainerSize.width,
          activeContainerSize.height,
          activeContainerSize.depth,
        ],
      })
    },
    setSsfrBlurSettings: (ssfrBlurSettings) => {
      activeSsfrBlurSettings = ssfrBlurSettings
      ssfrRenderer.setBlurSettings(ssfrBlurSettings)
    },
    setSimulationSpeed: (nextSimulationSpeed) => {
      simulationSpeed = nextSimulationSpeed

      if (simulationRunning) {
        simulationClient.start(safeSimulationStepDt())
      }
    },
    setVisualizationMode: (nextVisualizationMode) => {
      activeVisualizationMode = nextVisualizationMode

      if (lastFrame) {
        updateParticleInstances(
          particlePreview,
          lastFrame,
          activeContainerSize,
          activeVisualizationMode,
        )
      }
    },
    stopPngCapture: () => stopCaptureSession(),
    stopWebmCapture: () => stopWebmCaptureSession(),
  }
}
