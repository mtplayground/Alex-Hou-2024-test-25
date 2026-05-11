import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  createHelloCube,
  type HelloCubeController,
  type HelloCubeStats,
} from '@/render/helloCube'
import { useHelloCubeStore } from '@/store/helloCubeStore'
import { useSceneStore } from '@/store'

interface HelloCubeCanvasProps {
  onControllerChange?: (controller: HelloCubeController | null) => void
  onSimulationReadyChange?: (running: boolean) => void
  simulationSpeed?: number
}

export function HelloCubeCanvas({
  onControllerChange,
  onSimulationReadyChange,
  simulationSpeed = 1,
}: HelloCubeCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<HelloCubeController | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<HelloCubeStats>({
    particleCount: 0,
    renderFps: 0,
    simTime: 0,
    stepRate: 0,
  })
  const containerSize = useHelloCubeStore((state) => state.containerSize)
  const rotationSpeed = useHelloCubeStore((state) => state.rotationSpeed)
  const showHelpers = useHelloCubeStore((state) => state.showHelpers)
  const visualizationMode = useHelloCubeStore(
    (state) => state.visualizationMode,
  )
  const scene = useSceneStore((state) => state.scene)
  const emitter = scene.emitter
  const obstacles = scene.obstacles
  const initialFluid = scene.initialFluid
  const simParams = scene.simParams

  const handleContainerRef = (node: HTMLDivElement | null) => {
    if (node === containerRef.current) {
      return
    }

    controllerRef.current?.dispose()
    onControllerChange?.(null)
    controllerRef.current = null
    containerRef.current = node

    if (!node) {
      return
    }

    try {
      const initialState = useHelloCubeStore.getState()
      const sceneState = useSceneStore.getState().scene

      controllerRef.current = createHelloCube(node, {
        containerSize: initialState.containerSize,
        emitter: sceneState.emitter,
        initialFluid: sceneState.initialFluid,
        obstacles: sceneState.obstacles,
        onSimulationError: setError,
        onSimulationReadyChange: onSimulationReadyChange ?? undefined,
        onStatsChange: setStats,
        rotationSpeed: initialState.rotationSpeed,
        simParams: sceneState.simParams,
        simulationSpeed,
        showHelpers: initialState.showHelpers,
        visualizationMode: initialState.visualizationMode,
      })
      onControllerChange?.(controllerRef.current)
      setError(null)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unknown WebGL initialization error.'
      setError(message)
    }
  }

  useEffect(() => {
    return () => {
      onControllerChange?.(null)
    }
  }, [onControllerChange])

  useEffect(() => {
    controllerRef.current?.setContainerSize(containerSize)
  }, [containerSize])

  useEffect(() => {
    controllerRef.current?.setRotationSpeed(rotationSpeed)
  }, [rotationSpeed])

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
    controllerRef.current?.setSimulationSpeed(simulationSpeed)
  }, [simulationSpeed])

  useEffect(() => {
    controllerRef.current?.setVisualizationMode(visualizationMode)
  }, [visualizationMode])

  return (
    <Card className="overflow-hidden border-white/10 bg-slate-950/40 shadow-2xl shadow-slate-950/20 backdrop-blur-sm">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white">Hello-Cube smoke test</CardTitle>
        <CardDescription>
          A minimal Three.js scene renders a rotating cube, XYZ axes, an XZ
          grid, a reactive simulation container wireframe, and particle frames
          streamed from the simulation worker from the scene store&apos;s active
          fluid source, whether that source is an initial block lattice or a
          continuous emitter.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="relative aspect-[16/10] min-h-[320px] w-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_40%),linear-gradient(180deg,_rgba(8,15,28,0.95),_rgba(2,6,23,1))]"
          ref={handleContainerRef}
        >
          <div className="pointer-events-none absolute left-4 top-4 z-10 grid min-w-[220px] grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-white shadow-2xl shadow-black/30 backdrop-blur-sm">
            <StatTile
              label="Render FPS"
              value={stats.renderFps > 0 ? stats.renderFps.toFixed(1) : '0.0'}
            />
            <StatTile
              label="Step Rate"
              value={
                stats.stepRate > 0 ? `${stats.stepRate.toFixed(1)}/s` : '0.0/s'
              }
            />
            <StatTile
              label="Particles"
              value={stats.particleCount.toString()}
            />
            <StatTile label="Sim Time" value={`${stats.simTime.toFixed(2)}s`} />
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

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  )
}
