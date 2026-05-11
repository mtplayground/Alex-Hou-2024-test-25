import '../App.css'
import { renderModuleSummary } from '../render'
import { simulationModuleSummary } from '../sim'
import { storeModuleSummary } from '../store'
import { workerModuleSummary } from '../workers'

const sections = [
  simulationModuleSummary,
  renderModuleSummary,
  storeModuleSummary,
  workerModuleSummary,
]

export function AppShell() {
  return (
    <main className="app-shell">
      <div className="app-shell__content">
        <p className="app-shell__eyebrow">Issue 1 of 38</p>
        <section className="app-shell__hero">
          <div>
            <h1 className="app-shell__headline">Fluid sandbox scaffold</h1>
            <p className="app-shell__lede">
              The repository now has a Vite + React + TypeScript foundation with
              the first source boundaries for simulation, rendering, state, UI,
              and workers.
            </p>
          </div>
          <aside className="app-shell__panel" aria-label="Project status">
            <h2>Project status</h2>
            <p>
              This screen intentionally stays narrow in scope. It verifies the
              frontend bootstraps cleanly before later issues add Tailwind,
              Three.js, Zustand, testing, and the simulation runtime.
            </p>
            <div className="app-shell__meta">
              <div>
                <span>Tooling</span>
                <strong>Vite + React + TypeScript</strong>
              </div>
              <div>
                <span>Server</span>
                <strong>0.0.0.0:8080</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="app-shell__grid" aria-label="Source modules">
          {sections.map((section) => (
            <article className="app-shell__card" key={section.path}>
              <span className="app-shell__path">{section.path}</span>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </article>
          ))}
        </section>

        <p className="app-shell__footer">
          Next sessions can build on this without reshaping the root app. The
          entrypoint remains <code>src/main.tsx</code>, and each core area now
          has a stable home under <code>src/</code>.
        </p>
      </div>
    </main>
  )
}
