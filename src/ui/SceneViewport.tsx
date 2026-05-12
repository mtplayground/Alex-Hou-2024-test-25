import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  createPlaygroundScene,
  type PngCaptureState,
  type PlaygroundSceneController,
  type PlaygroundSceneStats,
  type WebmCaptureState,
} from '@/render/playgroundScene'
import { useViewportStore } from '@/store/viewportStore'
import { useSceneStore } from '@/store'

interface SceneViewportProps {
  onControllerChange?: (controller: PlaygroundSceneController | null) => void
  onPngCaptureChange?: (state: PngCaptureState) => void
  onSsfrAvailabilityChange?: (reason: string | null) => void
  onSsfrFallback?: (message: string, reason: string) => void
  onSsfrSilentFailureChange?: (
    silentlyBroken: boolean,
    reason: string | null,
  ) => void
  onSimulationError?: (message: string) => void
  onSimulationReadyChange?: (running: boolean) => void
  onWebmCaptureChange?: (state: WebmCaptureState) => void
  simulationSpeed?: number
}

export function SceneViewport({
  onControllerChange,
  onPngCaptureChange,
  onSsfrAvailabilityChange,
  onSsfrFallback,
  onSsfrSilentFailureChange,
  onSimulationError,
  onSimulationReadyChange,
  onWebmCaptureChange,
  simulationSpeed = 1,
}: SceneViewportProps) {
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(
    null,
  )
  const controllerRef = useRef<PlaygroundSceneController | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<PlaygroundSceneStats>({
    gpuName: null,
    particleCount: 0,
    renderFps: 0,
    renderMode: 'particles',
    simTime: 0,
    ssfrDiagnostics: {
      depthTextureSupport: false,
      extColorBufferFloat: false,
      floatTextureSupport: false,
      gpuName: null,
      webgl2: false,
    },
    ssfrReady: false,
    stepRate: 0,
  })
  const cameraPose = useViewportStore((state) => state.cameraPose)
  const containerSize = useViewportStore((state) => state.containerSize)
  const renderMode = useViewportStore((state) => state.renderMode)
  const ssfrAppearanceSettings = useViewportStore(
    (state) => state.ssfrAppearanceSettings,
  )
  const ssfrBlurSettings = useViewportStore((state) => state.ssfrBlurSettings)
  const ssfrDebugView = useViewportStore((state) => state.ssfrDebugView)
  const showHelpers = useViewportStore((state) => state.showHelpers)
  const visualizationMode = useViewportStore((state) => state.visualizationMode)
  const scene = useSceneStore((state) => state.scene)
  const emitter = scene.emitter
  const obstacles = scene.obstacles
  const initialFluid = scene.initialFluid
  const simParams = scene.simParams

  const handleContainerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerNode((currentNode) =>
      currentNode === node ? currentNode : node,
    )
  }, [])

  useEffect(() => {
    if (!containerNode) {
      return
    }

    try {
      const initialState = useViewportStore.getState()
      const sceneState = useSceneStore.getState().scene

      controllerRef.current = createPlaygroundScene(containerNode, {
        containerSize: initialState.containerSize,
        cameraPose: initialState.cameraPose,
        emitter: sceneState.emitter,
        initialFluid: sceneState.initialFluid,
        obstacles: sceneState.obstacles,
        ...(onPngCaptureChange === undefined ? {} : { onPngCaptureChange }),
        ...(onSsfrAvailabilityChange === undefined
          ? {}
          : { onSsfrAvailabilityChange }),
        ...(onSsfrFallback === undefined ? {} : { onSsfrFallback }),
        ...(onSsfrSilentFailureChange === undefined
          ? {}
          : { onSsfrSilentFailureChange }),
        onSimulationError: (message) => {
          onSimulationError?.(message)
        },
        onSimulationReadyChange: onSimulationReadyChange ?? undefined,
        onStatsChange: setStats,
        ...(onWebmCaptureChange === undefined ? {} : { onWebmCaptureChange }),
        renderMode: initialState.renderMode,
        ssfrAppearanceSettings: initialState.ssfrAppearanceSettings,
        ssfrBlurSettings: initialState.ssfrBlurSettings,
        ssfrDebugView: initialState.ssfrDebugView,
        simParams: sceneState.simParams,
        simulationSpeed,
        showHelpers: initialState.showHelpers,
        visualizationMode: initialState.visualizationMode,
      })
      onSsfrAvailabilityChange?.(controllerRef.current.getSsfrUnavailableReason())
      onControllerChange?.(controllerRef.current)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unknown WebGL initialization error.'
      queueMicrotask(() => {
        setError(message)
        onSimulationError?.(message)
      })
    }

    return () => {
      controllerRef.current?.dispose()
      controllerRef.current = null
      onControllerChange?.(null)
    }
  }, [
    containerNode,
    onControllerChange,
    onPngCaptureChange,
    onSsfrAvailabilityChange,
    onSsfrFallback,
    onSsfrSilentFailureChange,
    onSimulationError,
    onSimulationReadyChange,
    onWebmCaptureChange,
    simulationSpeed,
  ])

  useEffect(() => {
    return () => {
      onControllerChange?.(null)
    }
  }, [onControllerChange])

  useEffect(() => {
    controllerRef.current?.setContainerSize(containerSize)
  }, [containerSize])

  useEffect(() => {
    controllerRef.current?.setCameraPose(cameraPose)
  }, [cameraPose])

  useEffect(() => {
    controllerRef.current?.setHelpersVisible(showHelpers)
  }, [showHelpers])

  useEffect(() => {
    controllerRef.current?.setObstacles(obstacles)
  }, [obstacles])

  useEffect(() => {
    controllerRef.current?.setEmitter(emitter)
  }, [emitter])

  useEffect(() => {
    controllerRef.current?.setInitialFluid(initialFluid)
  }, [initialFluid])

  useEffect(() => {
    controllerRef.current?.setSimulationParams(simParams)
  }, [simParams])

  useEffect(() => {
    controllerRef.current?.setRenderMode(renderMode)
  }, [renderMode])

  useEffect(() => {
    controllerRef.current?.setSsfrAppearanceSettings(ssfrAppearanceSettings)
  }, [ssfrAppearanceSettings])

  useEffect(() => {
    controllerRef.current?.setSsfrBlurSettings(ssfrBlurSettings)
  }, [ssfrBlurSettings])

  useEffect(() => {
    controllerRef.current?.setSsfrDebugView(ssfrDebugView)
  }, [ssfrDebugView])

  useEffect(() => {
    controllerRef.current?.setSimulationSpeed(simulationSpeed)
  }, [simulationSpeed])

  useEffect(() => {
    controllerRef.current?.setVisualizationMode(visualizationMode)
  }, [visualizationMode])

  return (
    <Card className="overflow-hidden border-white/10 bg-slate-950/40 shadow-2xl shadow-slate-950/20 backdrop-blur-sm">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white">Fluid scene viewport</CardTitle>
        <CardDescription>
          The Three.js viewport renders helpers, the container wireframe,
          obstacle boxes, and particle frames streamed from the simulation
          worker using the active scene-store fluid source, whether that source
          is an initial block lattice or a continuous emitter.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="relative aspect-[16/10] min-h-[320px] w-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_40%),linear-gradient(180deg,_rgba(8,15,28,0.95),_rgba(2,6,23,1))]"
          data-testid="viewport-stage"
          ref={handleContainerRef}
        >
          <div className="pointer-events-none absolute left-4 top-4 z-10 grid min-w-[280px] grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-white shadow-2xl shadow-black/30 backdrop-blur-sm">
            <StatTile
              label="Render FPS"
              testId="render-fps"
              value={stats.renderFps > 0 ? stats.renderFps.toFixed(1) : '0.0'}
            />
            <StatTile
              label="Step Rate"
              testId="step-rate"
              value={
                stats.stepRate > 0 ? `${stats.stepRate.toFixed(1)}/s` : '0.0/s'
              }
            />
            <StatTile
              label="Particles"
              testId="particle-count"
              value={stats.particleCount.toString()}
            />
            <StatTile
              label="Sim Time"
              testId="sim-time"
              value={`${stats.simTime.toFixed(2)}s`}
            />
            <StatTile
              label="Render Mode"
              testId="render-mode"
              value={stats.renderMode}
            />
            <StatTile
              label="SSFR"
              testId="ssfr-ready"
              value={stats.ssfrReady ? 'Ready' : 'Unavailable'}
            />
            <StatTile
              className="col-span-2"
              label="GPU"
              testId="gpu-name"
              value={stats.gpuName ?? 'Unavailable'}
            />
            <StatTile
              className="col-span-2"
              label="Capabilities"
              testId="ssfr-capabilities"
              value={`GL2 ${stats.ssfrDiagnostics.webgl2 ? 'Y' : 'N'} · Float ${stats.ssfrDiagnostics.floatTextureSupport ? 'Y' : 'N'} · Depth ${stats.ssfrDiagnostics.depthTextureSupport ? 'Y' : 'N'} · CBF ${stats.ssfrDiagnostics.extColorBufferFloat ? 'Y' : 'N'}`}
            />
          </div>
        </div>
        {error ? (
          <div className="flex items-start gap-3 border-t border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              Three.js failed to initialize in this browser context: {error}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function StatTile({
  className,
  label,
  testId,
  value,
}: {
  className?: string
  label: string
  testId: string
  value: string
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 px-3 py-2 ${className ?? ''}`}
    >
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div
        className="mt-1 text-sm font-semibold text-slate-100"
        data-testid={`${testId}-value`}
      >
        {value}
      </div>
    </div>
  )
}
