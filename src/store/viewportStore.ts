import { appDefaults } from '@/config/env'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface ContainerSize {
  depth: number
  height: number
  width: number
}

export interface ViewportCameraPose {
  position: [number, number, number]
  target: [number, number, number]
}

export interface SsfrBlurSettings {
  iterations: number
  radius: number
}

export interface SsfrAppearanceSettings {
  absorptionStrength: number
  fresnelPower: number
  showThicknessDebug: boolean
  thicknessScale: number
  waterColor: string
}

export type RenderMode = 'fluid' | 'particles'
export type SsfrDebugView = 'depth' | 'final' | 'normals' | 'thickness'
export type VisualizationMode = 'density' | 'pressure' | 'speed'
export const VIEWPORT_PERSIST_VERSION = 1

const DEFAULT_CONTAINER_SIZE: ContainerSize = {
  depth: 4.5,
  height: 3,
  width: 4.5,
}

const DEFAULT_CAMERA_POSE: ViewportCameraPose = {
  position: [4.9, 2.8, 6.1],
  target: [2.4, 1.2, 2.3],
}

const DEFAULT_SSFR_BLUR_SETTINGS: SsfrBlurSettings = {
  iterations: 2,
  radius: 4,
}

const DEFAULT_SSFR_APPEARANCE_SETTINGS: SsfrAppearanceSettings = {
  absorptionStrength: 1,
  fresnelPower: 4.5,
  showThicknessDebug: false,
  thicknessScale: 2.2,
  waterColor: '#0f4c72',
}

const VIEWPORT_STORAGE_KEY = 'viewport-store'

type PersistedViewportState = Pick<
  ViewportState,
  | 'cameraPose'
  | 'containerSize'
  | 'renderMode'
  | 'showHelpers'
  | 'ssfrAppearanceSettings'
  | 'ssfrBlurSettings'
  | 'ssfrDebugView'
  | 'visualizationMode'
>

const noopStorage: Storage = {
  clear: () => undefined,
  getItem: () => null,
  key: () => null,
  length: 0,
  removeItem: () => undefined,
  setItem: () => undefined,
}

const getViewportStorage = () => {
  if (typeof window === 'undefined') {
    return noopStorage
  }

  return window.localStorage
}

export const migrateViewportPersistedState = (
  persistedState: unknown,
  persistedVersion: number,
): PersistedViewportState => {
  if (
    persistedState === null ||
    typeof persistedState !== 'object' ||
    Array.isArray(persistedState)
  ) {
    return {
      cameraPose: DEFAULT_CAMERA_POSE,
      containerSize: DEFAULT_CONTAINER_SIZE,
      renderMode: 'particles',
      showHelpers: appDefaults.showHelpers,
      ssfrAppearanceSettings: DEFAULT_SSFR_APPEARANCE_SETTINGS,
      ssfrBlurSettings: DEFAULT_SSFR_BLUR_SETTINGS,
      ssfrDebugView: 'final',
      visualizationMode: 'speed',
    }
  }

  const nextState = persistedState as Partial<PersistedViewportState>

  if (persistedVersion <= VIEWPORT_PERSIST_VERSION) {
    return {
      cameraPose: nextState.cameraPose ?? DEFAULT_CAMERA_POSE,
      containerSize: nextState.containerSize ?? DEFAULT_CONTAINER_SIZE,
      renderMode: 'particles',
      showHelpers: nextState.showHelpers ?? appDefaults.showHelpers,
      ssfrAppearanceSettings:
        nextState.ssfrAppearanceSettings ?? DEFAULT_SSFR_APPEARANCE_SETTINGS,
      ssfrBlurSettings: nextState.ssfrBlurSettings ?? DEFAULT_SSFR_BLUR_SETTINGS,
      ssfrDebugView: nextState.ssfrDebugView ?? 'final',
      visualizationMode: nextState.visualizationMode ?? 'speed',
    }
  }

  return {
    cameraPose: nextState.cameraPose ?? DEFAULT_CAMERA_POSE,
    containerSize: nextState.containerSize ?? DEFAULT_CONTAINER_SIZE,
    renderMode: nextState.renderMode ?? 'particles',
    showHelpers: nextState.showHelpers ?? appDefaults.showHelpers,
    ssfrAppearanceSettings:
      nextState.ssfrAppearanceSettings ?? DEFAULT_SSFR_APPEARANCE_SETTINGS,
    ssfrBlurSettings: nextState.ssfrBlurSettings ?? DEFAULT_SSFR_BLUR_SETTINGS,
    ssfrDebugView: nextState.ssfrDebugView ?? 'final',
    visualizationMode: nextState.visualizationMode ?? 'speed',
  }
}

interface ViewportState {
  cameraPose: ViewportCameraPose
  containerSize: ContainerSize
  renderMode: RenderMode
  ssfrFallbackActive: boolean
  ssfrAppearanceSettings: SsfrAppearanceSettings
  ssfrBlurSettings: SsfrBlurSettings
  ssfrDebugView: SsfrDebugView
  setRenderMode: (renderMode: RenderMode) => void
  setSsfrFallbackActive: (ssfrFallbackActive: boolean) => void
  setSsfrAppearanceSettings: (
    ssfrAppearanceSettings: SsfrAppearanceSettings,
  ) => void
  setSsfrBlurSettings: (ssfrBlurSettings: SsfrBlurSettings) => void
  setSsfrDebugView: (ssfrDebugView: SsfrDebugView) => void
  setSsfrUnavailableReason: (ssfrUnavailableReason: string | null) => void
  setVisualizationMode: (visualizationMode: VisualizationMode) => void
  showHelpers: boolean
  ssfrUnavailableReason: string | null
  setContainerSize: (nextContainerSize: ContainerSize) => void
  setCameraPose: (cameraPose: ViewportCameraPose) => void
  toggleHelpers: () => void
  reset: () => void
  visualizationMode: VisualizationMode
}

export const useViewportStore = create<ViewportState>()(
  persist(
    (set) => ({
      cameraPose: DEFAULT_CAMERA_POSE,
      containerSize: DEFAULT_CONTAINER_SIZE,
      renderMode: 'particles',
      setRenderMode: (renderMode) => set({ renderMode }),
      ssfrFallbackActive: false,
      setSsfrFallbackActive: (ssfrFallbackActive) => set({ ssfrFallbackActive }),
      ssfrAppearanceSettings: DEFAULT_SSFR_APPEARANCE_SETTINGS,
      setSsfrAppearanceSettings: (ssfrAppearanceSettings) =>
        set({ ssfrAppearanceSettings }),
      ssfrBlurSettings: DEFAULT_SSFR_BLUR_SETTINGS,
      setSsfrBlurSettings: (ssfrBlurSettings) => set({ ssfrBlurSettings }),
      ssfrDebugView: 'final',
      setSsfrDebugView: (ssfrDebugView) => set({ ssfrDebugView }),
      setSsfrUnavailableReason: (ssfrUnavailableReason) =>
        set({ ssfrUnavailableReason }),
      setVisualizationMode: (visualizationMode) => set({ visualizationMode }),
      showHelpers: appDefaults.showHelpers,
      ssfrUnavailableReason: null,
      setContainerSize: (nextContainerSize) =>
        set({ containerSize: nextContainerSize }),
      setCameraPose: (cameraPose) => set({ cameraPose }),
      toggleHelpers: () => set((state) => ({ showHelpers: !state.showHelpers })),
      reset: () =>
        set({
          cameraPose: DEFAULT_CAMERA_POSE,
          containerSize: DEFAULT_CONTAINER_SIZE,
          renderMode: 'particles',
          ssfrFallbackActive: false,
          ssfrAppearanceSettings: DEFAULT_SSFR_APPEARANCE_SETTINGS,
          ssfrBlurSettings: DEFAULT_SSFR_BLUR_SETTINGS,
          ssfrDebugView: 'final',
          showHelpers: appDefaults.showHelpers,
          ssfrUnavailableReason: null,
          visualizationMode: 'speed',
        }),
      visualizationMode: 'speed',
    }),
    {
      migrate: migrateViewportPersistedState,
      name: VIEWPORT_STORAGE_KEY,
      partialize: (state): PersistedViewportState => ({
        cameraPose: state.cameraPose,
        containerSize: state.containerSize,
        renderMode: state.renderMode,
        showHelpers: state.showHelpers,
        ssfrAppearanceSettings: state.ssfrAppearanceSettings,
        ssfrBlurSettings: state.ssfrBlurSettings,
        ssfrDebugView: state.ssfrDebugView,
        visualizationMode: state.visualizationMode,
      }),
      storage: createJSONStorage(getViewportStorage),
      version: VIEWPORT_PERSIST_VERSION,
    },
  ),
)
