import { Cuboid, Gauge, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { HelloCubeCanvas } from '@/ui/HelloCubeCanvas'
import { renderModuleSummary } from '@/render'
import { simulationModuleSummary } from '@/sim'
import { useHelloCubeStore } from '@/store/helloCubeStore'
import { storeModuleSummary } from '@/store'
import { workerModuleSummary } from '@/workers'

const sections = [
  simulationModuleSummary,
  renderModuleSummary,
  storeModuleSummary,
  workerModuleSummary,
]

export function AppShell() {
  const rotationSpeed = useHelloCubeStore((state) => state.rotationSpeed)
  const showAxes = useHelloCubeStore((state) => state.showAxes)
  const setRotationSpeed = useHelloCubeStore((state) => state.setRotationSpeed)
  const toggleAxes = useHelloCubeStore((state) => state.toggleAxes)
  const reset = useHelloCubeStore((state) => state.reset)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_28%),linear-gradient(180deg,_hsl(222_47%_11%),_hsl(224_45%_9%))]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
          <span className="h-px w-10 bg-current" />
          Issue 4 of 38
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_360px]">
          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Three.js is integrated with a live Hello-Cube smoke scene.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300">
              This pass introduces the first runtime renderer boundary. A
              rotating cube and axes helper now validate the Three.js pipeline,
              while Zustand owns the demo controls that later issues can expand
              into scene and simulation state.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button className="gap-2" onClick={reset}>
                Reset smoke test
                <RotateCw className="size-4" />
              </Button>
              <Button onClick={toggleAxes} variant="secondary">
                {showAxes ? 'Hide axes helper' : 'Show axes helper'}
              </Button>
            </div>
          </div>

          <Card className="border-sky-500/20 bg-slate-950/60 shadow-2xl shadow-slate-950/30 backdrop-blur">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <Gauge className="size-4 text-sky-300" />
                Smoke controls
              </CardTitle>
              <CardDescription>
                These controls drive a Zustand store that the Three.js scene
                subscribes to through the React boundary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Rotation speed</span>
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
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                <div className="flex items-center gap-2 font-medium text-white">
                  <Cuboid className="size-4 text-sky-300" />
                  Active scene
                </div>
                <p className="mt-2 leading-6 text-slate-300">
                  A lit cube rotates in place with an axes helper anchored at
                  the origin. This is a smoke path only, not the final renderer
                  architecture.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <HelloCubeCanvas />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <Card
              className="border-white/10 bg-white/5 backdrop-blur-sm"
              key={section.path}
            >
              <CardHeader>
                <CardDescription>{section.path}</CardDescription>
                <CardTitle className="text-lg text-white">
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-300">
                  {section.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  )
}
