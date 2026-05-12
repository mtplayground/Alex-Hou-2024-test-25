import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  ChevronLeft,
  Cuboid,
  Download,
  FolderOpen,
  Gauge,
  PanelLeft,
  Pause,
  Play,
  Plus,
  RotateCw,
  Save,
  Sparkles,
  StepForward,
  Trash2,
  Upload,
  Waves,
} from 'lucide-react'
import { appDefaults } from '@/config/env'
import { renderModuleSummary } from '@/render'
import { SIM_SAFETY_LIMITS, simulationModuleSummary } from '@/sim'
import {
  BUILT_IN_SCENES,
  DEFAULT_BUILT_IN_SCENE_ID,
  deserializeScene,
  getBuiltInSceneById,
  getDefaultBuiltInScenePreset,
  LocalStorageScenePresetManager,
  serializeScene,
  storeModuleSummary,
  useSceneStore,
} from '@/store'
import { type ContainerSize, useViewportStore } from '@/store/viewportStore'
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
import type { PlaygroundSceneController } from '@/render/playgroundScene'
import { SceneViewport } from '@/ui/SceneViewport'

const sections = [
  simulationModuleSummary,
  renderModuleSummary,
  storeModuleSummary,
  workerModuleSummary,
]

const AXES = ['x', 'y', 'z'] as const

type AxisKey = (typeof AXES)[number]

const SIM_PARAMETER_LIMITS = {
  gravity: {
    max: SIM_SAFETY_LIMITS.gravity.max,
    min: SIM_SAFETY_LIMITS.gravity.min,
    step: 0.1,
  },
  particleCount: {
    max: SIM_SAFETY_LIMITS.particleCount.max,
    min: 128,
    step: 32,
  },
  restDensity: {
    max: SIM_SAFETY_LIMITS.restDensity.max,
    min: SIM_SAFETY_LIMITS.restDensity.min,
    step: 10,
  },
  viscosity: {
    max: SIM_SAFETY_LIMITS.viscosity.max,
    min: SIM_SAFETY_LIMITS.viscosity.min,
    step: 0.01,
  },
} as const

const SSFR_APPEARANCE_LIMITS = {
  absorptionStrength: {
    max: 3,
    min: 0,
    step: 0.05,
  },
  blurIterations: {
    max: 6,
    min: 1,
    step: 1,
  },
  blurRadius: {
    max: 12,
    min: 1,
    step: 1,
  },
  fresnelPower: {
    max: 8,
    min: 0.5,
    step: 0.1,
  },
  thicknessScale: {
    max: 6,
    min: 0.2,
    step: 0.1,
  },
} as const

const ONBOARDING_STORAGE_KEY = 'fluid-playground.onboarding-scene-v1'

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

function axisLabel(axis: AxisKey): string {
  return axis.toUpperCase()
}

function axisIndex(axis: AxisKey): 0 | 1 | 2 {
  switch (axis) {
    case 'x':
      return 0
    case 'y':
      return 1
    case 'z':
      return 2
  }
}

function clampPositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function formatPresetTimestamp(timestamp: string): string {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  return date.toLocaleString()
}

function NumericInput({
  className,
  label,
  min,
  onChange,
  step = 0.1,
  value,
}: {
  className?: string
  label: string
  min?: number
  onChange: (value: number) => void
  step?: number
  value: number
}) {
  return (
    <label className={cn('space-y-2', className)}>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <Input
        {...(min === undefined ? {} : { min: min.toString() })}
        onChange={(event) => {
          const nextValue = Number(event.target.value)

          if (!Number.isFinite(nextValue)) {
            return
          }

          onChange(nextValue)
        }}
        step={step.toString()}
        type="number"
        value={value}
      />
    </label>
  )
}

function VectorEditor({
  label,
  min,
  onAxisChange,
  step = 0.1,
  values,
}: {
  label: string
  min?: number
  onAxisChange: (axis: AxisKey, value: number) => void
  step?: number
  values: readonly [number, number, number]
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {AXES.map((axis) => {
          const index = axisIndex(axis)
          const axisValue = values[index]

          return (
            <NumericInput
              key={axis}
              label={axisLabel(axis)}
              {...(min === undefined ? {} : { min })}
              onChange={(value) => onAxisChange(axis, value)}
              step={step}
              value={axisValue}
            />
          )
        })}
      </div>
    </div>
  )
}

interface ControlPanelBodyProps {
  hasSimulationController: boolean
  onPauseSimulation: () => void
  onPlaySimulation: () => void
  onStartPngCapture: () => void
  onStartWebmCapture: (framerate: number) => void
  onResetSimulation: () => void
  onStopPngCapture: () => void
  onStopWebmCapture: () => void
  onStepSimulation: () => void
  pngCaptureActive: boolean
  pngCaptureBusy: boolean
  pngCaptureFrameCount: number
  onSimulationSpeedChange: (value: number) => void
  simulationRunning: boolean
  simulationSpeed: number
  webmCaptureActive: boolean
  webmCaptureBusy: boolean
  webmCaptureFramerate: number
  onWebmCaptureFramerateChange: (value: number) => void
}

function ControlPanelBody({
  hasSimulationController,
  onPauseSimulation,
  onPlaySimulation,
  onStartPngCapture,
  onStartWebmCapture,
  onResetSimulation,
  onStopPngCapture,
  onStopWebmCapture,
  onStepSimulation,
  pngCaptureActive,
  pngCaptureBusy,
  pngCaptureFrameCount,
  onSimulationSpeedChange,
  simulationRunning,
  simulationSpeed,
  webmCaptureActive,
  webmCaptureBusy,
  webmCaptureFramerate,
  onWebmCaptureFramerateChange,
}: ControlPanelBodyProps) {
  const showHelpers = useViewportStore((state) => state.showHelpers)
  const renderMode = useViewportStore((state) => state.renderMode)
  const setRenderMode = useViewportStore((state) => state.setRenderMode)
  const ssfrFallbackActive = useViewportStore(
    (state) => state.ssfrFallbackActive,
  )
  const setSsfrAppearanceSettings = useViewportStore(
    (state) => state.setSsfrAppearanceSettings,
  )
  const setSsfrFallbackActive = useViewportStore(
    (state) => state.setSsfrFallbackActive,
  )
  const setSsfrBlurSettings = useViewportStore(
    (state) => state.setSsfrBlurSettings,
  )
  const setSsfrDebugView = useViewportStore((state) => state.setSsfrDebugView)
  const setVisualizationMode = useViewportStore(
    (state) => state.setVisualizationMode,
  )
  const ssfrAppearanceSettings = useViewportStore(
    (state) => state.ssfrAppearanceSettings,
  )
  const ssfrBlurSettings = useViewportStore((state) => state.ssfrBlurSettings)
  const ssfrDebugView = useViewportStore((state) => state.ssfrDebugView)
  const ssfrUnavailableReason = useViewportStore(
    (state) => state.ssfrUnavailableReason,
  )
  const toggleHelpers = useViewportStore((state) => state.toggleHelpers)
  const visualizationMode = useViewportStore((state) => state.visualizationMode)
  const reset = useViewportStore((state) => state.reset)
  const setCameraPose = useViewportStore((state) => state.setCameraPose)
  const syncViewportContainer = useViewportStore(
    (state) => state.setContainerSize,
  )
  const scene = useSceneStore((state) => state.scene)
  const addObstacle = useSceneStore((state) => state.addObstacle)
  const removeObstacle = useSceneStore((state) => state.removeObstacle)
  const resetScene = useSceneStore((state) => state.resetScene)
  const replaceScene = useSceneStore((state) => state.replaceScene)
  const setEmitter = useSceneStore((state) => state.setEmitter)
  const setInitialFluid = useSceneStore((state) => state.setInitialFluid)
  const setSceneContainer = useSceneStore((state) => state.setContainer)
  const updateSimParams = useSceneStore((state) => state.updateSimParams)
  const updateObstacle = useSceneStore((state) => state.updateObstacle)
  const presetManager = useMemo(() => new LocalStorageScenePresetManager(), [])
  const [presetName, setPresetName] = useState('')
  const [particleCountDraft, setParticleCountDraft] = useState(
    scene.emitter?.particleCap ?? appDefaults.defaultParticleCount,
  )
  const [presetStatus, setPresetStatus] = useState<string | null>(null)
  const [presets, setPresets] = useState(() => {
    try {
      return presetManager.listPresets()
    } catch {
      return []
    }
  })
  const particleCountValue = scene.emitter?.particleCap ?? particleCountDraft
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === null
    } catch {
      return true
    }
  })

  const syncPresets = useCallback(() => {
    const nextPresets = presetManager.listPresets()
    setPresets(nextPresets)
    return nextPresets
  }, [presetManager])

  const applySceneSnapshot = useCallback(
    (nextScene: typeof scene) => {
      replaceScene(nextScene)
      syncViewportContainer(nextScene.container)
    },
    [replaceScene, syncViewportContainer],
  )

  useEffect(() => {
    try {
      if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== null) {
        return
      }

      const defaultPreset = getDefaultBuiltInScenePreset()
      applySceneSnapshot(defaultPreset.scene)
      setCameraPose(defaultPreset.camera)
      window.localStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        DEFAULT_BUILT_IN_SCENE_ID,
      )
    } catch {
      return
    }
  }, [applySceneSnapshot, setCameraPose])

  const updateContainerDimension =
    (dimension: keyof ContainerSize) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value)

      if (!Number.isFinite(nextValue) || nextValue <= 0) {
        return
      }

      const nextContainer = {
        ...scene.container,
        [dimension]: nextValue,
      }

      setSceneContainer(nextContainer)
      syncViewportContainer(nextContainer)
    }

  const sourceLabel =
    scene.emitter === undefined ? 'Initial block' : 'Continuous emitter'

  const createEmitterScene = () => {
    const { depth, height, width } = scene.container

    setEmitter({
      direction: [0, -1, 0],
      particleCap: particleCountValue,
      position: [width * 0.5, height * 0.85, depth * 0.5],
      rate: appDefaults.defaultEmitterRate,
      speed: 2.5,
    })
  }

  const createInitialFluidScene = () => {
    const { depth, height, width } = scene.container

    setInitialFluid({
      origin: [width * 0.22, height * 0.32, depth * 0.22],
      size: [width * 0.3, height * 0.24, depth * 0.3],
    })
  }

  const updateObstacleAxis = (
    obstacleId: string,
    vectorKey: 'center' | 'size',
    axis: AxisKey,
    nextValue: number,
  ) => {
    const obstacle = scene.obstacles.find(
      (candidate) => candidate.id === obstacleId,
    )

    if (obstacle === undefined) {
      return
    }

    const currentVector = obstacle[vectorKey]
    const nextVector: [number, number, number] = [
      currentVector[0],
      currentVector[1],
      currentVector[2],
    ]

    nextVector[axisIndex(axis)] =
      vectorKey === 'size'
        ? clampPositive(nextValue, nextVector[axisIndex(axis)])
        : nextValue

    updateObstacle(obstacleId, {
      [vectorKey]: nextVector,
    })
  }

  const updateEmitterAxis = (
    vectorKey: 'direction' | 'position',
    axis: AxisKey,
    nextValue: number,
  ) => {
    if (scene.emitter === undefined) {
      return
    }

    const currentVector = scene.emitter[vectorKey]
    const nextVector: [number, number, number] = [
      currentVector[0],
      currentVector[1],
      currentVector[2],
    ]
    nextVector[axisIndex(axis)] = nextValue

    setEmitter({
      ...scene.emitter,
      [vectorKey]: nextVector,
    })
  }

  const handleSavePreset = () => {
    try {
      const savedPreset = presetManager.savePreset(presetName, scene)
      syncPresets()
      setPresetName(savedPreset.name)
      setPresetStatus(`Saved preset "${savedPreset.name}".`)
    } catch (error) {
      setPresetStatus(
        error instanceof Error ? error.message : 'Preset save failed.',
      )
    }
  }

  const handleLoadPreset = (name: string) => {
    try {
      const nextScene = presetManager.loadPreset(name)
      applySceneSnapshot(nextScene)
      setPresetName(name)
      setPresetStatus(`Loaded preset "${name}".`)
    } catch (error) {
      setPresetStatus(
        error instanceof Error ? error.message : 'Preset load failed.',
      )
    }
  }

  const handleDeletePreset = (name: string) => {
    try {
      const deleted = presetManager.deletePreset(name)
      syncPresets()
      setPresetStatus(
        deleted
          ? `Deleted preset "${name}".`
          : `Preset "${name}" was not found.`,
      )
    } catch (error) {
      setPresetStatus(
        error instanceof Error ? error.message : 'Preset delete failed.',
      )
    }
  }

  const handleExportScene = () => {
    try {
      const serializedScene = serializeScene(scene)
      const blob = new Blob([serializedScene], {
        type: 'application/json',
      })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const exportName = presetName.trim() || 'scene-preset'
      link.href = objectUrl
      link.download = `${exportName}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      setPresetStatus(`Exported "${exportName}.json".`)
    } catch (error) {
      setPresetStatus(
        error instanceof Error ? error.message : 'Scene export failed.',
      )
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const raw = await file.text()
      const importedScene = deserializeScene(raw)
      applySceneSnapshot(importedScene)
      setPresetStatus(`Imported scene from "${file.name}".`)
    } catch (error) {
      setPresetStatus(
        error instanceof Error ? error.message : 'Scene import failed.',
      )
    } finally {
      event.target.value = ''
    }
  }

  const handleLoadBuiltInScene = (sceneId: string) => {
    const scenePreset = getBuiltInSceneById(sceneId)

    if (scenePreset === undefined) {
      setPresetStatus('Built-in scene was not found.')
      return
    }

    applySceneSnapshot(scenePreset.scene)
    setCameraPose(scenePreset.camera)
    setShowOnboarding(false)
    setPresetStatus(`Loaded built-in scene "${scenePreset.name}".`)
  }

  const updateSsfrAppearance = (
    patch: Partial<typeof ssfrAppearanceSettings>,
  ) => {
    setSsfrAppearanceSettings({
      ...ssfrAppearanceSettings,
      ...patch,
    })
  }

  const updateSsfrBlur = (patch: Partial<typeof ssfrBlurSettings>) => {
    setSsfrBlurSettings({
      ...ssfrBlurSettings,
      ...patch,
    })
  }

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
                data-testid="simulation-toggle"
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
                data-testid="simulation-step"
                disabled={!hasSimulationController || simulationRunning}
                onClick={onStepSimulation}
                variant="secondary"
              >
                Step
                <StepForward className="size-4" />
              </Button>
              <Button
                data-testid="simulation-reset"
                disabled={!hasSimulationController}
                onClick={onResetSimulation}
                variant="secondary"
              >
                Reset sim
                <RotateCw className="size-4" />
              </Button>
              <Button
                data-testid="png-capture-toggle"
                disabled={!hasSimulationController || pngCaptureBusy}
                onClick={
                  pngCaptureActive ? onStopPngCapture : onStartPngCapture
                }
                variant="secondary"
              >
                {pngCaptureActive ? 'Stop PNG capture' : 'Start PNG capture'}
                <Download className="size-4" />
              </Button>
              <Button
                data-testid="webm-capture-toggle"
                disabled={!hasSimulationController || webmCaptureBusy}
                onClick={() => {
                  if (webmCaptureActive) {
                    onStopWebmCapture()
                    return
                  }

                  onStartWebmCapture(webmCaptureFramerate)
                }}
                variant="secondary"
              >
                {webmCaptureActive ? 'Stop WebM export' : 'Start WebM export'}
                <Waves className="size-4" />
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
              <p className="text-xs leading-5 text-slate-400">
                {pngCaptureBusy
                  ? 'Packaging PNG frames into a zip for download.'
                  : pngCaptureActive
                    ? `Capturing PNG frames: ${String(pngCaptureFrameCount)}`
                    : 'Capture the viewport canvas into PNG frames and download them as a zip.'}
              </p>
              <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>WebM framerate</span>
                  <span>{webmCaptureFramerate} fps</span>
                </div>
                <Slider
                  data-testid="webm-framerate-slider"
                  max={60}
                  min={12}
                  onValueChange={(value) =>
                    onWebmCaptureFramerateChange(value[0] ?? 30)
                  }
                  step={1}
                  value={[webmCaptureFramerate]}
                />
                <p className="text-xs leading-5 text-slate-400">
                  {webmCaptureBusy
                    ? 'Finalizing the recorded WebM file for download.'
                    : webmCaptureActive
                      ? `Recording WebM at ${String(webmCaptureFramerate)} fps.`
                      : 'Record the live viewport to a WebM video with MediaRecorder.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              className="gap-2"
              onClick={() => {
                reset()
                resetScene()
              }}
            >
              Reset viewport
              <RotateCw className="size-4" />
            </Button>
            <Button onClick={toggleHelpers} variant="secondary">
              {showHelpers ? 'Hide helpers' : 'Show helpers'}
            </Button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
              <Cuboid className="size-4 text-sky-300" />
              Container dimensions
            </div>
            <div className="mb-4 space-y-4">
              {(
                [
                  ['width', 'Container width'],
                  ['height', 'Container height'],
                  ['depth', 'Container depth'],
                ] as const
              ).map(([dimension, label]) => (
                <div className="space-y-3" key={dimension}>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>{label}</span>
                    <span>{scene.container[dimension].toFixed(1)}</span>
                  </div>
                  <Slider
                    max={dimension === 'height' ? 6 : 8}
                    min={2}
                    onValueChange={(value) => {
                      const nextValue = value[0]

                      if (nextValue === undefined) {
                        return
                      }

                      const nextContainer = {
                        ...scene.container,
                        [dimension]: nextValue,
                      }

                      setSceneContainer(nextContainer)
                      syncViewportContainer(nextContainer)
                    }}
                    step={0.1}
                    value={[scene.container[dimension]]}
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">
                  Width
                </span>
                <Input
                  data-testid="container-width-input"
                  min="1"
                  onChange={updateContainerDimension('width')}
                  step="0.1"
                  type="number"
                  value={scene.container.width}
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
                  value={scene.container.height}
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
                  value={scene.container.depth}
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
              <Gauge className="size-4 text-sky-300" />
              Sim parameters
            </div>
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Gravity Y</span>
                  <span>{scene.simParams.gravity[1].toFixed(1)}</span>
                </div>
                <Slider
                  max={SIM_PARAMETER_LIMITS.gravity.max}
                  min={SIM_PARAMETER_LIMITS.gravity.min}
                  onValueChange={(value) => {
                    const nextValue = value[0]

                    if (nextValue === undefined) {
                      return
                    }

                    updateSimParams({
                      gravity: [0, nextValue, 0],
                    })
                  }}
                  step={SIM_PARAMETER_LIMITS.gravity.step}
                  value={[scene.simParams.gravity[1]]}
                />
                <NumericInput
                  label="Gravity"
                  min={SIM_PARAMETER_LIMITS.gravity.min}
                  onChange={(value) =>
                    updateSimParams({
                      gravity: [
                        0,
                        Math.min(
                          SIM_PARAMETER_LIMITS.gravity.max,
                          Math.max(SIM_PARAMETER_LIMITS.gravity.min, value),
                        ),
                        0,
                      ],
                    })
                  }
                  step={SIM_PARAMETER_LIMITS.gravity.step}
                  value={scene.simParams.gravity[1]}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Viscosity</span>
                  <span>{scene.simParams.viscosity.toFixed(2)}</span>
                </div>
                <Slider
                  max={SIM_PARAMETER_LIMITS.viscosity.max}
                  min={SIM_PARAMETER_LIMITS.viscosity.min}
                  onValueChange={(value) => {
                    const nextValue = value[0]

                    if (nextValue === undefined) {
                      return
                    }

                    updateSimParams({
                      viscosity: nextValue,
                    })
                  }}
                  step={SIM_PARAMETER_LIMITS.viscosity.step}
                  value={[scene.simParams.viscosity]}
                />
                <NumericInput
                  label="Viscosity"
                  min={SIM_PARAMETER_LIMITS.viscosity.min}
                  onChange={(value) =>
                    updateSimParams({
                      viscosity: Math.min(
                        SIM_PARAMETER_LIMITS.viscosity.max,
                        Math.max(SIM_PARAMETER_LIMITS.viscosity.min, value),
                      ),
                    })
                  }
                  step={SIM_PARAMETER_LIMITS.viscosity.step}
                  value={scene.simParams.viscosity}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Rest density</span>
                  <span>{scene.simParams.restDensity.toFixed(0)}</span>
                </div>
                <Slider
                  max={SIM_PARAMETER_LIMITS.restDensity.max}
                  min={SIM_PARAMETER_LIMITS.restDensity.min}
                  onValueChange={(value) => {
                    const nextValue = value[0]

                    if (nextValue === undefined) {
                      return
                    }

                    updateSimParams({
                      restDensity: nextValue,
                    })
                  }}
                  step={SIM_PARAMETER_LIMITS.restDensity.step}
                  value={[scene.simParams.restDensity]}
                />
                <NumericInput
                  label="Density"
                  min={SIM_PARAMETER_LIMITS.restDensity.min}
                  onChange={(value) =>
                    updateSimParams({
                      restDensity: Math.min(
                        SIM_PARAMETER_LIMITS.restDensity.max,
                        Math.max(SIM_PARAMETER_LIMITS.restDensity.min, value),
                      ),
                    })
                  }
                  step={SIM_PARAMETER_LIMITS.restDensity.step}
                  value={scene.simParams.restDensity}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Particle budget</span>
                  <span>{particleCountValue}</span>
                </div>
                <Slider
                  max={SIM_PARAMETER_LIMITS.particleCount.max}
                  min={SIM_PARAMETER_LIMITS.particleCount.min}
                  onValueChange={(value) => {
                    const nextValue = value[0]

                    if (nextValue === undefined) {
                      return
                    }

                    const clampedValue = Math.round(
                      Math.min(
                        SIM_PARAMETER_LIMITS.particleCount.max,
                        Math.max(
                          SIM_PARAMETER_LIMITS.particleCount.min,
                          nextValue,
                        ),
                      ),
                    )
                    if (scene.emitter !== undefined) {
                      setEmitter({
                        ...scene.emitter,
                        particleCap: clampedValue,
                      })
                      return
                    }

                    setParticleCountDraft(clampedValue)
                  }}
                  step={SIM_PARAMETER_LIMITS.particleCount.step}
                  value={[particleCountValue]}
                />
                <NumericInput
                  label="Particle count"
                  min={SIM_PARAMETER_LIMITS.particleCount.min}
                  onChange={(value) => {
                    const clampedValue = Math.round(
                      Math.min(
                        SIM_PARAMETER_LIMITS.particleCount.max,
                        Math.max(SIM_PARAMETER_LIMITS.particleCount.min, value),
                      ),
                    )
                    if (scene.emitter !== undefined) {
                      setEmitter({
                        ...scene.emitter,
                        particleCap: clampedValue,
                      })
                      return
                    }

                    setParticleCountDraft(clampedValue)
                  }}
                  step={SIM_PARAMETER_LIMITS.particleCount.step}
                  value={particleCountValue}
                />
                <p className="text-xs leading-5 text-slate-400">
                  Safe ranges are enforced to reduce unstable particle bursts.
                  Particle budget applies directly to emitter mode and becomes
                  the next emitter cap when you switch sources.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
              <Sparkles className="size-4 text-sky-300" />
              Visualization
            </div>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Render mode
              </span>
              {ssfrFallbackActive && ssfrUnavailableReason ? (
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
                  SSFR 不可用，已回退到粒子模式：{ssfrUnavailableReason}
                </div>
              ) : null}
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400/60"
                data-testid="render-mode-select"
                onChange={(event) => {
                  const nextRenderMode = event.target.value as
                    | 'fluid'
                    | 'particles'

                  if (
                    nextRenderMode === 'fluid' &&
                    ssfrUnavailableReason !== null
                  ) {
                    return
                  }

                  setRenderMode(nextRenderMode)
                  if (nextRenderMode !== 'fluid') {
                    setSsfrFallbackActive(false)
                  }
                }}
                title={ssfrUnavailableReason ?? undefined}
                value={renderMode}
              >
                <option
                  disabled={ssfrUnavailableReason !== null}
                  title={ssfrUnavailableReason ?? undefined}
                  value="fluid"
                >
                  SSFR fluid surface
                </option>
                <option value="particles">Instanced particle spheres</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Particle color mode
              </span>
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400/60"
                onChange={(event) =>
                  setVisualizationMode(
                    event.target.value as 'density' | 'pressure' | 'speed',
                  )
                }
                value={visualizationMode}
              >
                <option value="speed">Color by speed</option>
                <option value="density">Color by density</option>
                <option value="pressure">Color by pressure</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                SSFR debug view
              </span>
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400/60"
                data-testid="ssfr-debug-view-select"
                onChange={(event) =>
                  setSsfrDebugView(
                    event.target.value as
                      | 'depth'
                      | 'final'
                      | 'normals'
                      | 'thickness',
                  )
                }
                value={ssfrDebugView}
              >
                <option value="final">Final composite</option>
                <option value="depth">Depth target</option>
                <option value="thickness">Thickness target</option>
                <option value="normals">Normal reconstruction</option>
              </select>
            </label>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Switch between the legacy instanced-sphere view and the SSFR fluid
              surface. Particle colors still come from the worker&apos;s latest
              frame, so both render modes update without restarting the
              simulation. The debug view selector swaps the SSFR output between
              the final composite and the intermediate diagnostic textures.
              {ssfrUnavailableReason
                ? ` Fluid mode is currently unavailable on this renderer: ${ssfrUnavailableReason}`
                : ''}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
              <Waves className="size-4 text-sky-300" />
              Fluid appearance
            </div>
            <div className="space-y-5">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Water color
                </span>
                <div className="flex items-center gap-3">
                  <Input
                    className="h-11 w-16 cursor-pointer overflow-hidden border-white/10 bg-slate-950/70 p-1"
                    onChange={(event) =>
                      updateSsfrAppearance({
                        waterColor: event.target.value,
                      })
                    }
                    type="color"
                    value={ssfrAppearanceSettings.waterColor}
                  />
                  <Input
                    className="font-mono uppercase"
                    onChange={(event) => {
                      const nextValue = event.target.value

                      if (/^#[0-9a-fA-F]{6}$/.test(nextValue)) {
                        updateSsfrAppearance({
                          waterColor: nextValue,
                        })
                      }
                    }}
                    value={ssfrAppearanceSettings.waterColor.toUpperCase()}
                  />
                </div>
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Absorption strength</span>
                  <span>
                    {ssfrAppearanceSettings.absorptionStrength.toFixed(2)}
                  </span>
                </div>
                <Slider
                  max={SSFR_APPEARANCE_LIMITS.absorptionStrength.max}
                  min={SSFR_APPEARANCE_LIMITS.absorptionStrength.min}
                  onValueChange={(value) => {
                    const nextValue = value[0]

                    if (nextValue === undefined) {
                      return
                    }

                    updateSsfrAppearance({
                      absorptionStrength: nextValue,
                    })
                  }}
                  step={SSFR_APPEARANCE_LIMITS.absorptionStrength.step}
                  value={[ssfrAppearanceSettings.absorptionStrength]}
                />
                <NumericInput
                  label="Absorption"
                  min={SSFR_APPEARANCE_LIMITS.absorptionStrength.min}
                  onChange={(value) =>
                    updateSsfrAppearance({
                      absorptionStrength: Math.min(
                        SSFR_APPEARANCE_LIMITS.absorptionStrength.max,
                        Math.max(
                          SSFR_APPEARANCE_LIMITS.absorptionStrength.min,
                          value,
                        ),
                      ),
                    })
                  }
                  step={SSFR_APPEARANCE_LIMITS.absorptionStrength.step}
                  value={ssfrAppearanceSettings.absorptionStrength}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Thickness scale</span>
                  <span>
                    {ssfrAppearanceSettings.thicknessScale.toFixed(1)}
                  </span>
                </div>
                <Slider
                  max={SSFR_APPEARANCE_LIMITS.thicknessScale.max}
                  min={SSFR_APPEARANCE_LIMITS.thicknessScale.min}
                  onValueChange={(value) => {
                    const nextValue = value[0]

                    if (nextValue === undefined) {
                      return
                    }

                    updateSsfrAppearance({
                      thicknessScale: nextValue,
                    })
                  }}
                  step={SSFR_APPEARANCE_LIMITS.thicknessScale.step}
                  value={[ssfrAppearanceSettings.thicknessScale]}
                />
                <NumericInput
                  label="Thickness"
                  min={SSFR_APPEARANCE_LIMITS.thicknessScale.min}
                  onChange={(value) =>
                    updateSsfrAppearance({
                      thicknessScale: Math.min(
                        SSFR_APPEARANCE_LIMITS.thicknessScale.max,
                        Math.max(
                          SSFR_APPEARANCE_LIMITS.thicknessScale.min,
                          value,
                        ),
                      ),
                    })
                  }
                  step={SSFR_APPEARANCE_LIMITS.thicknessScale.step}
                  value={ssfrAppearanceSettings.thicknessScale}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Fresnel power</span>
                  <span>{ssfrAppearanceSettings.fresnelPower.toFixed(1)}</span>
                </div>
                <Slider
                  max={SSFR_APPEARANCE_LIMITS.fresnelPower.max}
                  min={SSFR_APPEARANCE_LIMITS.fresnelPower.min}
                  onValueChange={(value) => {
                    const nextValue = value[0]

                    if (nextValue === undefined) {
                      return
                    }

                    updateSsfrAppearance({
                      fresnelPower: nextValue,
                    })
                  }}
                  step={SSFR_APPEARANCE_LIMITS.fresnelPower.step}
                  value={[ssfrAppearanceSettings.fresnelPower]}
                />
                <NumericInput
                  label="Fresnel"
                  min={SSFR_APPEARANCE_LIMITS.fresnelPower.min}
                  onChange={(value) =>
                    updateSsfrAppearance({
                      fresnelPower: Math.min(
                        SSFR_APPEARANCE_LIMITS.fresnelPower.max,
                        Math.max(
                          SSFR_APPEARANCE_LIMITS.fresnelPower.min,
                          value,
                        ),
                      ),
                    })
                  }
                  step={SSFR_APPEARANCE_LIMITS.fresnelPower.step}
                  value={ssfrAppearanceSettings.fresnelPower}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Blur radius</span>
                  <span>{ssfrBlurSettings.radius}</span>
                </div>
                <Slider
                  max={SSFR_APPEARANCE_LIMITS.blurRadius.max}
                  min={SSFR_APPEARANCE_LIMITS.blurRadius.min}
                  onValueChange={(value) => {
                    const nextValue = value[0]

                    if (nextValue === undefined) {
                      return
                    }

                    updateSsfrBlur({
                      radius: Math.round(nextValue),
                    })
                  }}
                  step={SSFR_APPEARANCE_LIMITS.blurRadius.step}
                  value={[ssfrBlurSettings.radius]}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Blur iterations</span>
                  <span>{ssfrBlurSettings.iterations}</span>
                </div>
                <Slider
                  max={SSFR_APPEARANCE_LIMITS.blurIterations.max}
                  min={SSFR_APPEARANCE_LIMITS.blurIterations.min}
                  onValueChange={(value) => {
                    const nextValue = value[0]

                    if (nextValue === undefined) {
                      return
                    }

                    updateSsfrBlur({
                      iterations: Math.round(nextValue),
                    })
                  }}
                  step={SSFR_APPEARANCE_LIMITS.blurIterations.step}
                  value={[ssfrBlurSettings.iterations]}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
              <Sparkles className="size-4 text-sky-300" />
              Built-in scenes
            </div>
            {showOnboarding ? (
              <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
                <div className="flex items-center justify-between gap-3">
                  <p>
                    Starter scenes are bundled into the workspace.{' '}
                    <span className="font-semibold text-white">
                      {getDefaultBuiltInScenePreset().name}
                    </span>{' '}
                    loads automatically for first-time visitors so the viewport
                    never opens empty.
                  </p>
                  <Button
                    onClick={() => setShowOnboarding(false)}
                    size="sm"
                    variant="secondary"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="space-y-3">
              {BUILT_IN_SCENES.map((scenePreset) => (
                <div
                  className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
                  data-testid={`builtin-scene-${scenePreset.id}`}
                  key={scenePreset.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100">
                        {scenePreset.name}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-slate-400">
                        {scenePreset.description}
                      </div>
                    </div>
                    <Button
                      data-testid={`builtin-scene-load-${scenePreset.id}`}
                      onClick={() => handleLoadBuiltInScene(scenePreset.id)}
                      size="sm"
                      variant="secondary"
                    >
                      Load
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
              <FolderOpen className="size-4 text-sky-300" />
              Preset manager
            </div>
            <div className="space-y-3">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Save current scene as
                </span>
                <Input
                  data-testid="preset-name-input"
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder="Preset name"
                  value={presetName}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="gap-2"
                  data-testid="save-preset"
                  onClick={handleSavePreset}
                >
                  Save preset
                  <Save className="size-4" />
                </Button>
                <Button
                  className="gap-2"
                  onClick={handleExportScene}
                  variant="secondary"
                >
                  Export JSON
                  <Download className="size-4" />
                </Button>
                <Button
                  className="gap-2"
                  onClick={handleImportClick}
                  variant="secondary"
                >
                  Import JSON
                  <Upload className="size-4" />
                </Button>
                <input
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => {
                    void handleImportFile(event)
                  }}
                  ref={fileInputRef}
                  type="file"
                />
              </div>
              {presetStatus ? (
                <p className="text-xs leading-5 text-slate-400">
                  {presetStatus}
                </p>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Saved presets
              </div>
              {presets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-3 py-4 text-sm text-slate-400">
                  No saved presets yet. Save the current scene or import a JSON
                  snapshot to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {presets.map((preset) => (
                    <div
                      className="rounded-xl border border-white/10 bg-slate-950/40 p-3"
                      data-testid={`preset-row-${preset.name}`}
                      key={preset.name}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-100">
                            {preset.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            Updated {formatPresetTimestamp(preset.updatedAt)}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            data-testid={`preset-load-${preset.name}`}
                            onClick={() => handleLoadPreset(preset.name)}
                            size="sm"
                            variant="secondary"
                          >
                            Load
                          </Button>
                          <Button
                            onClick={() => handleDeletePreset(preset.name)}
                            size="sm"
                            variant="secondary"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Waves className="size-4 text-sky-300" />
                Fluid source
              </div>
              <Button
                onClick={() => {
                  if (scene.emitter === undefined) {
                    createEmitterScene()
                    return
                  }

                  createInitialFluidScene()
                }}
                size="sm"
                variant="secondary"
              >
                {scene.emitter === undefined ? 'Enable emitter' : 'Use block'}
              </Button>
            </div>

            {scene.emitter ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
                  Continuous emitter mode is active. New particles stream from
                  the emitter position at the configured rate until the cap is
                  reached.
                </div>
                <VectorEditor
                  label="Emitter position"
                  min={0}
                  onAxisChange={(axis, value) =>
                    updateEmitterAxis('position', axis, value)
                  }
                  values={scene.emitter.position}
                />
                <VectorEditor
                  label="Emitter direction"
                  onAxisChange={(axis, value) =>
                    updateEmitterAxis('direction', axis, value)
                  }
                  values={scene.emitter.direction}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <NumericInput
                    label="Rate"
                    min={1}
                    onChange={(value) =>
                      setEmitter({
                        ...scene.emitter,
                        rate: clampPositive(value, scene.emitter.rate),
                      })
                    }
                    step={1}
                    value={scene.emitter.rate}
                  />
                  <NumericInput
                    label="Speed"
                    min={0}
                    onChange={(value) =>
                      setEmitter({
                        ...scene.emitter,
                        speed: clampPositive(value, scene.emitter.speed),
                      })
                    }
                    step={0.1}
                    value={scene.emitter.speed}
                  />
                  <NumericInput
                    label="Cap"
                    min={1}
                    onChange={(value) =>
                      setEmitter({
                        ...scene.emitter,
                        particleCap: Math.max(1, Math.round(value)),
                      })
                    }
                    step={1}
                    value={scene.emitter.particleCap}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
                Initial block mode is active. Toggle the emitter on to stream
                particles continuously from a live source.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Boxes className="size-4 text-sky-300" />
                Obstacles
              </div>
              <Button
                onClick={() =>
                  addObstacle({
                    center: [
                      scene.container.width * 0.5,
                      scene.container.height * 0.35,
                      scene.container.depth * 0.5,
                    ],
                    id: `obstacle-${Math.random().toString(36).slice(2, 8)}`,
                    size: [0.8, 0.6, 0.8],
                  })
                }
                size="sm"
              >
                Add obstacle
                <Plus className="size-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {scene.obstacles.map((obstacle, index) => (
                <div
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                  key={obstacle.id}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">
                        Obstacle {index + 1}
                      </div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {obstacle.id}
                      </div>
                    </div>
                    <Button
                      onClick={() => removeObstacle(obstacle.id)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <VectorEditor
                      label="Center"
                      onAxisChange={(axis, value) =>
                        updateObstacleAxis(obstacle.id, 'center', axis, value)
                      }
                      values={obstacle.center}
                    />
                    <VectorEditor
                      label="Size"
                      min={0.1}
                      onAxisChange={(axis, value) =>
                        updateObstacleAxis(obstacle.id, 'size', axis, value)
                      }
                      values={obstacle.size}
                    />
                  </div>
                </div>
              ))}
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
                Current container: {scene.container.width.toFixed(1)} x{' '}
                {scene.container.height.toFixed(1)} x{' '}
                {scene.container.depth.toFixed(1)}
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
    useState<PlaygroundSceneController | null>(null)
  const [pngCaptureActive, setPngCaptureActive] = useState(false)
  const [pngCaptureBusy, setPngCaptureBusy] = useState(false)
  const [pngCaptureFrameCount, setPngCaptureFrameCount] = useState(0)
  const [webmCaptureActive, setWebmCaptureActive] = useState(false)
  const [webmCaptureBusy, setWebmCaptureBusy] = useState(false)
  const [webmCaptureFramerate, setWebmCaptureFramerate] = useState(30)
  const [simulationRunning, setSimulationRunning] = useState(true)
  const [simulationSpeed, setSimulationSpeed] = useState(1)
  const [simulationToast, setSimulationToast] = useState<string | null>(null)
  const scene = useSceneStore((state) => state.scene)
  const showHelpers = useViewportStore((state) => state.showHelpers)
  const setRenderMode = useViewportStore((state) => state.setRenderMode)
  const setSsfrFallbackActive = useViewportStore(
    (state) => state.setSsfrFallbackActive,
  )
  const setSsfrUnavailableReason = useViewportStore(
    (state) => state.setSsfrUnavailableReason,
  )
  const hasSimulationController = simulationController !== null

  const handleControllerChange = useCallback(
    (controller: PlaygroundSceneController | null) => {
      setSimulationController(controller)

      if (controller === null) {
        setPngCaptureActive(false)
        setPngCaptureBusy(false)
        setPngCaptureFrameCount(0)
        setWebmCaptureActive(false)
        setWebmCaptureBusy(false)
        setSimulationRunning(false)
      }
    },
    [],
  )

  const handleSimulationError = useCallback((message: string) => {
    setSimulationToast(message)
  }, [])

  const handleSsfrAvailabilityChange = useCallback(
    (reason: string | null) => {
      setSsfrUnavailableReason(reason)

      if (reason === null) {
        setSsfrFallbackActive(false)
      }
    },
    [setSsfrFallbackActive, setSsfrUnavailableReason],
  )

  const handleSsfrFallback = useCallback(
    (message: string, reason: string) => {
      setRenderMode('particles')
      setSsfrFallbackActive(true)
      setSsfrUnavailableReason(reason)
      setSimulationToast(message)
    },
    [setRenderMode, setSsfrFallbackActive, setSsfrUnavailableReason],
  )

  const handleStartPngCapture = () => {
    simulationController?.startPngCapture()
  }

  const handleStopPngCapture = () => {
    if (simulationController === null) {
      return
    }

    setPngCaptureBusy(true)
    void simulationController.stopPngCapture().finally(() => {
      setPngCaptureBusy(false)
    })
  }

  const handleStartWebmCapture = (framerate: number) => {
    simulationController?.startWebmCapture(framerate)
  }

  const handleStopWebmCapture = () => {
    if (simulationController === null) {
      return
    }

    setWebmCaptureBusy(true)
    void simulationController.stopWebmCapture().finally(() => {
      setWebmCaptureBusy(false)
    })
  }

  const handlePngCaptureChange = useCallback(
    (state: { active: boolean; frameCount: number }) => {
      setPngCaptureActive(state.active)
      setPngCaptureFrameCount(state.frameCount)
    },
    [],
  )

  const handleWebmCaptureChange = useCallback(
    (state: { active: boolean; framerate: number }) => {
      setWebmCaptureActive(state.active)
      if (state.active) {
        setWebmCaptureFramerate(state.framerate)
      }
    },
    [],
  )

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
    if (simulationToast === null) {
      return
    }

    const timeout = window.setTimeout(() => {
      setSimulationToast(null)
    }, 5000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [simulationToast])

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
                <SceneViewport
                  onControllerChange={handleControllerChange}
                  onPngCaptureChange={handlePngCaptureChange}
                  onSsfrAvailabilityChange={handleSsfrAvailabilityChange}
                  onSsfrFallback={handleSsfrFallback}
                  onSimulationError={handleSimulationError}
                  onSimulationReadyChange={setSimulationRunning}
                  onWebmCaptureChange={handleWebmCaptureChange}
                  simulationSpeed={simulationSpeed}
                />
                {simulationToast ? (
                  <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex justify-center">
                    <div
                      className="pointer-events-auto flex max-w-xl items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/15 px-4 py-3 text-sm text-amber-50 shadow-2xl shadow-black/40 backdrop-blur-md"
                      role="alert"
                    >
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-200" />
                      <div className="min-w-0 flex-1 leading-6">
                        {simulationToast}
                      </div>
                      <Button
                        className="pointer-events-auto"
                        onClick={() => setSimulationToast(null)}
                        size="sm"
                        variant="secondary"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            {panelOpen ? (
              <aside className="hidden min-h-0 lg:block">
                <div className="h-full max-h-[calc(100vh-10rem)] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-3 shadow-2xl shadow-black/20 backdrop-blur-xl">
                  <ControlPanelBody
                    hasSimulationController={hasSimulationController}
                    onPauseSimulation={controlActions.pause}
                    onPlaySimulation={controlActions.play}
                    onStartPngCapture={handleStartPngCapture}
                    onStartWebmCapture={handleStartWebmCapture}
                    onResetSimulation={controlActions.reset}
                    onStopPngCapture={handleStopPngCapture}
                    onStopWebmCapture={handleStopWebmCapture}
                    onSimulationSpeedChange={setSimulationSpeed}
                    onStepSimulation={controlActions.step}
                    onWebmCaptureFramerateChange={(value) =>
                      setWebmCaptureFramerate(Math.max(12, Math.round(value)))
                    }
                    pngCaptureActive={pngCaptureActive}
                    pngCaptureBusy={pngCaptureBusy}
                    pngCaptureFrameCount={pngCaptureFrameCount}
                    simulationRunning={simulationRunning}
                    simulationSpeed={simulationSpeed}
                    webmCaptureActive={webmCaptureActive}
                    webmCaptureBusy={webmCaptureBusy}
                    webmCaptureFramerate={webmCaptureFramerate}
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
                  onStartPngCapture={handleStartPngCapture}
                  onStartWebmCapture={handleStartWebmCapture}
                  onResetSimulation={controlActions.reset}
                  onStopPngCapture={handleStopPngCapture}
                  onStopWebmCapture={handleStopWebmCapture}
                  onSimulationSpeedChange={setSimulationSpeed}
                  onStepSimulation={controlActions.step}
                  onWebmCaptureFramerateChange={(value) =>
                    setWebmCaptureFramerate(Math.max(12, Math.round(value)))
                  }
                  pngCaptureActive={pngCaptureActive}
                  pngCaptureBusy={pngCaptureBusy}
                  pngCaptureFrameCount={pngCaptureFrameCount}
                  simulationRunning={simulationRunning}
                  simulationSpeed={simulationSpeed}
                  webmCaptureActive={webmCaptureActive}
                  webmCaptureBusy={webmCaptureBusy}
                  webmCaptureFramerate={webmCaptureFramerate}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
