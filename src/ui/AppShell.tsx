import { useState } from 'react'
import { ArrowRight, SlidersHorizontal } from 'lucide-react'
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
import { renderModuleSummary } from '@/render'
import { simulationModuleSummary } from '@/sim'
import { storeModuleSummary } from '@/store'
import { workerModuleSummary } from '@/workers'

const sections = [
  simulationModuleSummary,
  renderModuleSummary,
  storeModuleSummary,
  workerModuleSummary,
]

export function AppShell() {
  const [particleCount, setParticleCount] = useState('2048')
  const [emitterRate, setEmitterRate] = useState([36])
  const emitterRateValue = emitterRate[0] ?? 36

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_32%),linear-gradient(180deg,_hsl(222_47%_11%),_hsl(224_45%_9%))]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
          <span className="h-px w-10 bg-current" />
          Issue 3 of 38
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_360px]">
          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Tailwind and shadcn/ui are now part of the project foundation.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300">
              This pass wires the design system layer only: Tailwind CSS,
              `shadcn/ui`, and the first reusable primitives. Later issues can
              build layout and controls on top of these components without
              revisiting the app shell.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button className="gap-2">
                Explore project shell
                <ArrowRight className="size-4" />
              </Button>
              <Button variant="secondary">
                Tailwind + shadcn/ui configured
              </Button>
            </div>
          </div>

          <Card className="border-sky-500/20 bg-slate-950/60 shadow-2xl shadow-slate-950/30 backdrop-blur">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-white">
                <SlidersHorizontal className="size-4 text-sky-300" />
                Base components live
              </CardTitle>
              <CardDescription>
                The starter screen uses the first shared primitives directly so
                the integration is verified in the running app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-200"
                  htmlFor="particle-count"
                >
                  Particle count target
                </label>
                <Input
                  id="particle-count"
                  value={particleCount}
                  onChange={(event) => setParticleCount(event.target.value)}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Emitter rate</span>
                  <span>{emitterRateValue} particles / frame</span>
                </div>
                <Slider
                  max={80}
                  min={8}
                  onValueChange={setEmitterRate}
                  step={1}
                  value={emitterRate}
                />
              </div>
            </CardContent>
          </Card>
        </section>

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
