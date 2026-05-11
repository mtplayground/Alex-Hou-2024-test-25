import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  ChevronLeft,
  Cuboid,
  Gauge,
  PanelLeft,
  Pause,
  Play,
  RotateCw,
  Sparkles,
  StepForward,
} from 'lucide-react'
import { appDefaults } from '@/config/env'
import { renderModuleSummary } from '@/render'
import { simulationModuleSummary } from '@/sim'
import { storeModuleSummary, useSceneStore } from '@/store'
import { type ContainerSize, useHelloCubeStore } from '@/store/helloCubeStore'
import { cn } from '@/lib/utils'
import { workerModuleSummary } from '@/workers'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { HelloCubeCanvas } from '@/ui/HelloCubeCanvas'
import type { HelloCubeController } from '@/render/helloCube'

const sections = [
  simulationModuleSummary,
  renderModuleSummary,
  storeModuleSummary,
  workerModuleSummary,
]

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-300">
      <span className="text-slate-500">{label}</span> {value}
    </div>
  )
}

function ModuleSummaryCards() {
  return (
    <div className="grid gap-3">
      {sections.map((section) => (
        <Card
          className="border-white/10 bg-black/20 shadow-none"
          key={section.path}
        >
          <CardHeader className="space-y-2 p-4">
            <CardDescription className="text-[0.68rem] uppercase tracking-[0.2em] text-slate-500">
              {section.path}
            </CardDescription>
            <CardTitle className="text-base text-white">
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-sm leading-6 text-slate-300">
              {section.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface ControlPanelBodyProps {
  hasSimulationController: boolean
  onPauseSimulation: () => void
  onPlaySimulation: () => void
  onResetSimulation: () => void
  onStepSimulation: () => void
  onSimulationSpeedChange: (value: number) => void
  simulationRunning: boolean
  simulationSpeed: number
}

function ControlPanelBody({
  hasSimulationController,
  onPauseSimulation,
  onPlaySimulation,
  onResetSimulation,
  onStepSimulation,
  onSimulationSpeedChange,
  simulationRunning,
  simulationSpeed,
}: ControlPanelBodyProps) {
  const containerSize = useHelloCubeStore((state) => state.containerSize)
  const rotationSpeed = useHelloCubeStore((state) => state.rotationSpeed)
  const showHelpers = useHelloCubeStore((state) => state.showHelpers)
  const setContainerSize = useHelloCubeStore((state) => state.setContainerSize)
  const setRotationSpeed = useHelloCubeStore((state) => state.setRotationSpeed)
  const toggleHelpers = useHelloCubeStore((state) => state.toggleHelpers)
  const reset = useHelloCubeStore((state) => state.reset)
  const scene = useSceneStore((state) => state.scene)

  const updateContainerDimension =
    (dimension: keyof ContainerSize) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value)

      if (!Number.isFinite(nextValue) || nextValue <= 0) {
        return
      }

      setContainerSize({
        ...containerSize,
        [dimension]: nextValue,
      })
    }

  const sourceLabel =
    scene.emitter === undefined ? 'Initial block' : 'Continuous emitter'

  return (
    <div className="flex h-full flex-col gap-4">
      <Card className="border-sky-500/20 bg-slate-950/70 shadow-2xl shadow-slate-950/20">
        <CardHeader className="space-y-3 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardDescription className="text-[0.68rem] uppercase tracking-[0.2em] text-sky-300">
                Controls
              </CardDescription>
              <CardTitle className="mt-2 flex items-center gap-2 text-white">
                <Gauge className="size-4 text-sky-300" />
                Scene panel
              </CardTitle>
            </div>
            <div className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-sky-200">
              {sourceLabel}
            </div>
          </div>
          <CardDescription className="leading-6 text-slate-300">
            This panel drives the current smoke-scene store while the viewport
            stays visible as the primary workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Play className="size-4 text-sky-300" />
                Simulation control bar
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-200">
                {simulationRunning ? 'Running' : 'Paused'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!hasSimulationController}
                onClick={
                  simulationRunning ? onPauseSimulation : onPlaySimulation
                }
                variant={simulationRunning ? 'secondary' : 'default'}
              >
                {simulationRunning ? (
                  <>
                    Pause
                    <Pause className="size-4" />
                  </>
                ) : (
                  <>
                    Play
                    <Play className="size-4" />
                  </>
                )}
              </Button>
              <Button
                disabled={!hasSimulationController || simulationRunning}
                onClick={onStepSimulation}
                variant="secondary"
              >
                Step
                <StepForward className="size-4" />
              </Button>
              <Button
                disabled={!hasSimulationController}
                onClick={onResetSimulation}
                variant="secondary"
              >
                Reset sim
                <RotateCw className="size-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Simulation speed</span>
                <span>{simulationSpeed.toFixed(2)}x</span>
              </div>
              <Slider
                max={3}
                min={0.25}
                onValueChange={(value) =>
                  onSimulationSpeedChange(value[0] ?? 1)
                }
                step={0.05}
                value={[simulationSpeed]}
              />
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Shortcuts: Space play/pause, R reset
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="gap-2" onClick={reset}>
              Reset viewport
              <RotateCw className="size-4" />
            </Button>
            <Button onClick={toggleHelpers} variant="secondary">
              {showHelpers ? 'Hide helpers' : 'Show helpers'}
            </Button>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Viewport rotation</span>
              <span>{rotationSpeed.toFixed(3)} rad / frame</span>
            </div>
            <Slider
              max={0.08}
              min={0.005}
              onValueChange={(value) => setRotationSpeed(value[0] ?? 0.02)}
              step={0.001}
              value={[rotationSpeed]}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
              <Cuboid className="size-4 text-sky-300" />
              Container dimensions
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Width
                </span>
                <Input
                  min="1"
                  onChange={updateContainerDimension('width')}
                  step="0.1"
                  type="number"
                  value={containerSize.width}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Height
                </span>
                <Input
                  min="1"
                  onChange={updateContainerDimension('height')}
                  step="0.1"
                  type="number"
                  value={containerSize.height}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Depth
                </span>
                <Input
                  min="1"
                  onChange={updateContainerDimension('depth')}
                  step="0.1"
                  type="number"
                  value={containerSize.depth}
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Sparkles className="size-4 text-emerald-300" />
              Current defaults
            </div>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-300">
              <p>
                Particle budget defaults to{' '}
                <span className="font-semibold text-white">
                  {appDefaults.defaultParticleCount}
                </span>{' '}
                and emitter rate defaults to{' '}
                <span className="font-semibold text-white">
                  {appDefaults.defaultEmitterRate} particles/s
                </span>
                .
              </p>
              <p>
                Current container: {containerSize.width.toFixed(1)} x{' '}
                {containerSize.height.toFixed(1)} x{' '}
                {containerSize.depth.toFixed(1)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ModuleSummaryCards />
    </div>
  )
}

export function AppShell() {
  const [panelOpen, setPanelOpen] = useState(true)
  const [simulationController, setSimulationController] =
    useState<HelloCubeController | null>(null)
  const [simulationRunning, setSimulationRunning] = useState(true)
  const [simulationSpeed, setSimulationSpeed] = useState(1)
  const scene = useSceneStore((state) => state.scene)
  const showHelpers = useHelloCubeStore((state) => state.showHelpers)
  const hasSimulationController = simulationController !== null

  const handleControllerChange = (controller: HelloCubeController | null) => {
    setSimulationController(controller)

    if (controller === null) {
      setSimulationRunning(false)
    }
  }

  const controlActions = useMemo(
    () => ({
      pause: () => simulationController?.pauseSimulation(),
      play: () => simulationController?.playSimulation(),
      reset: () => simulationController?.resetSimulation(),
      step: () => simulationController?.stepSimulation(),
    }),
    [simulationController],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()

        if (simulationRunning) {
          controlActions.pause()
        } else {
          controlActions.play()
        }
      }

      if (event.key.toLowerCase() === 'r') {
        event.preventDefault()
        controlActions.reset()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [controlActions, simulationRunning])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_28%),linear-gradient(180deg,_#07111f,_#020617_62%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-3 py-3 sm:px-5 sm:py-5">
        <header className="sticky top-0 z-30 rounded-[1.75rem] border border-white/10 bg-slate-950/70 px-4 py-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3 sm:items-center">
              <Button
                className="shrink-0"
                onClick={() => setPanelOpen((current) => !current)}
                size="icon"
                variant="secondary"
              >
                {panelOpen ? (
                  <ChevronLeft className="size-4" />
                ) : (
                  <PanelLeft className="size-4" />
                )}
              </Button>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-sky-300">
                  <span className="h-px w-8 bg-current" />
                  Issue 24 of 38
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Fluid playground workspace shell
                  </h1>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                    {scene.emitter === undefined
                      ? 'Block source active'
                      : 'Emitter source active'}
                  </div>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-slate-300">
                  The viewport stays center stage while a collapsible control
                  rail holds scene controls, status context, and module
                  summaries.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <MetricPill label="Viewport" value="Three.js + worker frames" />
              <MetricPill
                label="Panel"
                value={panelOpen ? 'Expanded' : 'Collapsed'}
              />
              <MetricPill
                label="Helpers"
                value={showHelpers ? 'Visible' : 'Hidden'}
              />
              <MetricPill
                label="Simulation"
                value={simulationRunning ? 'Running' : 'Paused'}
              />
              <MetricPill
                label="Layout"
                value={panelOpen ? 'Canvas + rail' : 'Canvas focus'}
              />
            </div>
          </div>
        </header>

        <div className="relative mt-4 flex-1">
          <div
            className={cn(
              'grid min-h-[calc(100vh-10rem)] gap-4 transition-[grid-template-columns] duration-300 lg:items-start',
              panelOpen
                ? 'lg:grid-cols-[minmax(0,1fr)_360px]'
                : 'lg:grid-cols-[minmax(0,1fr)]',
            )}
          >
            <section className="min-w-0">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-2 shadow-2xl shadow-black/20">
                <HelloCubeCanvas
                  onControllerChange={handleControllerChange}
                  onSimulationReadyChange={setSimulationRunning}
                  simulationSpeed={simulationSpeed}
                />
              </div>
            </section>

            {panelOpen ? (
              <aside className="hidden min-h-0 lg:block">
                <div className="h-full max-h-[calc(100vh-10rem)] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
                  <ControlPanelBody
                    hasSimulationController={hasSimulationController}
                    onPauseSimulation={controlActions.pause}
                    onPlaySimulation={controlActions.play}
                    onResetSimulation={controlActions.reset}
                    onSimulationSpeedChange={setSimulationSpeed}
                    onStepSimulation={controlActions.step}
                    simulationRunning={simulationRunning}
                    simulationSpeed={simulationSpeed}
                  />
                </div>
              </aside>
            ) : null}
          </div>

          {panelOpen ? (
            <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden">
              <div className="absolute inset-y-0 right-0 w-full max-w-[420px] overflow-y-auto border-l border-white/10 bg-slate-950 px-4 py-4 shadow-2xl shadow-black/40 sm:px-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Boxes className="size-4 text-sky-300" />
                    Control rail
                  </div>
                  <Button
                    onClick={() => setPanelOpen(false)}
                    size="icon"
                    variant="secondary"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>
                <ControlPanelBody
                  hasSimulationController={hasSimulationController}
                  onPauseSimulation={controlActions.pause}
                  onPlaySimulation={controlActions.play}
                  onResetSimulation={controlActions.reset}
                  onSimulationSpeedChange={setSimulationSpeed}
                  onStepSimulation={controlActions.step}
                  simulationRunning={simulationRunning}
                  simulationSpeed={simulationSpeed}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
