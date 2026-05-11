interface AppDefaults {
  defaultEmitterRate: number
  defaultParticleCount: number
  showHelpers: boolean
}

interface FrontendEnv {
  VITE_DEFAULT_EMITTER_RATE?: string
  VITE_DEFAULT_PARTICLE_COUNT?: string
  VITE_DEFAULT_SHOW_AXES?: string
  VITE_DEFAULT_SHOW_HELPERS?: string
}

const env = (import.meta as ImportMeta & { env: FrontendEnv }).env

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback
  }

  const normalized = value.trim().toLowerCase()

  if (normalized === 'true') {
    return true
  }

  if (normalized === 'false') {
    return false
  }

  return fallback
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const appDefaults: AppDefaults = {
  defaultEmitterRate: parseNumber(env.VITE_DEFAULT_EMITTER_RATE, 36),
  defaultParticleCount: parseNumber(env.VITE_DEFAULT_PARTICLE_COUNT, 2048),
  showHelpers: parseBoolean(
    env.VITE_DEFAULT_SHOW_HELPERS ?? env.VITE_DEFAULT_SHOW_AXES,
    true,
  ),
}
