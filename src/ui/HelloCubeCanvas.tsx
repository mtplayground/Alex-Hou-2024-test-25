import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createHelloCube, type HelloCubeController } from '@/render/helloCube'
import { useHelloCubeStore } from '@/store/helloCubeStore'
import { useSceneStore } from '@/store'

export function HelloCubeCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<HelloCubeController | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerSize = useHelloCubeStore((state) => state.containerSize)
  const rotationSpeed = useHelloCubeStore((state) => state.rotationSpeed)
  const showHelpers = useHelloCubeStore((state) => state.showHelpers)
  const scene = useSceneStore((state) => state.scene)
  const emitter = scene.emitter
  const obstacles = scene.obstacles
  const initialFluid = scene.initialFluid

  const handleContainerRef = (node: HTMLDivElement | null) => {
    if (node === containerRef.current) {
      return
    }

    controllerRef.current?.dispose()
    controllerRef.current = null
    containerRef.current = node

    if (!node) {
      return
    }

    try {
      const initialState = useHelloCubeStore.getState()

      controllerRef.current = createHelloCube(node, {
        containerSize: initialState.containerSize,
        emitter: useSceneStore.getState().scene.emitter,
        initialFluid: useSceneStore.getState().scene.initialFluid,
        obstacles: useSceneStore.getState().scene.obstacles,
        onSimulationError: setError,
        rotationSpeed: initialState.rotationSpeed,
        simParams: useSceneStore.getState().scene.simParams,
        showHelpers: initialState.showHelpers,
      })
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
        />
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
