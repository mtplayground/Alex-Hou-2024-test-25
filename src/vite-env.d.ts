/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_EMITTER_RATE?: string
  readonly VITE_DEFAULT_PARTICLE_COUNT?: string
  readonly VITE_DEFAULT_ROTATION_SPEED?: string
  readonly VITE_DEFAULT_SHOW_AXES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
