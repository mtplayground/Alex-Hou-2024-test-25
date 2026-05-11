import { appDefaults } from '@/config/env'
import { create } from 'zustand'

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

interface ViewportState {
  cameraPose: ViewportCameraPose
  containerSize: ContainerSize
  renderMode: RenderMode
  ssfrAppearanceSettings: SsfrAppearanceSettings
  ssfrBlurSettings: SsfrBlurSettings
  ssfrDebugView: SsfrDebugView
  setRenderMode: (renderMode: RenderMode) => void
  setSsfrAppearanceSettings: (
    ssfrAppearanceSettings: SsfrAppearanceSettings,
  ) => void
  setSsfrBlurSettings: (ssfrBlurSettings: SsfrBlurSettings) => void
  setSsfrDebugView: (ssfrDebugView: SsfrDebugView) => void
  setVisualizationMode: (visualizationMode: VisualizationMode) => void
  showHelpers: boolean
  setContainerSize: (nextContainerSize: ContainerSize) => void
  setCameraPose: (cameraPose: ViewportCameraPose) => void
  toggleHelpers: () => void
  reset: () => void
  visualizationMode: VisualizationMode
}

export const useViewportStore = create<ViewportState>((set) => ({
  cameraPose: DEFAULT_CAMERA_POSE,
  containerSize: DEFAULT_CONTAINER_SIZE,
  renderMode: 'fluid',
  setRenderMode: (renderMode) => set({ renderMode }),
  ssfrAppearanceSettings: DEFAULT_SSFR_APPEARANCE_SETTINGS,
  setSsfrAppearanceSettings: (ssfrAppearanceSettings) =>
    set({ ssfrAppearanceSettings }),
  ssfrBlurSettings: DEFAULT_SSFR_BLUR_SETTINGS,
  setSsfrBlurSettings: (ssfrBlurSettings) => set({ ssfrBlurSettings }),
  ssfrDebugView: 'final',
  setSsfrDebugView: (ssfrDebugView) => set({ ssfrDebugView }),
  setVisualizationMode: (visualizationMode) => set({ visualizationMode }),
  showHelpers: appDefaults.showHelpers,
  setContainerSize: (nextContainerSize) =>
    set({ containerSize: nextContainerSize }),
  setCameraPose: (cameraPose) => set({ cameraPose }),
  toggleHelpers: () => set((state) => ({ showHelpers: !state.showHelpers })),
  reset: () =>
    set({
      cameraPose: DEFAULT_CAMERA_POSE,
      containerSize: DEFAULT_CONTAINER_SIZE,
      renderMode: 'fluid',
      ssfrAppearanceSettings: DEFAULT_SSFR_APPEARANCE_SETTINGS,
      ssfrBlurSettings: DEFAULT_SSFR_BLUR_SETTINGS,
      ssfrDebugView: 'final',
      showHelpers: appDefaults.showHelpers,
      visualizationMode: 'speed',
    }),
  visualizationMode: 'speed',
}))
