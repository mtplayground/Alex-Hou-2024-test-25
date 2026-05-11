import { appDefaults } from '@/config/env'
import { create } from 'zustand'

export interface ContainerSize {
  depth: number
  height: number
  width: number
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
export type VisualizationMode = 'density' | 'pressure' | 'speed'

const DEFAULT_CONTAINER_SIZE: ContainerSize = {
  depth: 4.5,
  height: 3,
  width: 4.5,
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
  containerSize: ContainerSize
  renderMode: RenderMode
  ssfrAppearanceSettings: SsfrAppearanceSettings
  ssfrBlurSettings: SsfrBlurSettings
  setRenderMode: (renderMode: RenderMode) => void
  setSsfrAppearanceSettings: (
    ssfrAppearanceSettings: SsfrAppearanceSettings,
  ) => void
  setSsfrBlurSettings: (ssfrBlurSettings: SsfrBlurSettings) => void
  setVisualizationMode: (visualizationMode: VisualizationMode) => void
  showHelpers: boolean
  setContainerSize: (nextContainerSize: ContainerSize) => void
  toggleHelpers: () => void
  reset: () => void
  visualizationMode: VisualizationMode
}

export const useViewportStore = create<ViewportState>((set) => ({
  containerSize: DEFAULT_CONTAINER_SIZE,
  renderMode: 'fluid',
  setRenderMode: (renderMode) => set({ renderMode }),
  ssfrAppearanceSettings: DEFAULT_SSFR_APPEARANCE_SETTINGS,
  setSsfrAppearanceSettings: (ssfrAppearanceSettings) =>
    set({ ssfrAppearanceSettings }),
  ssfrBlurSettings: DEFAULT_SSFR_BLUR_SETTINGS,
  setSsfrBlurSettings: (ssfrBlurSettings) => set({ ssfrBlurSettings }),
  setVisualizationMode: (visualizationMode) => set({ visualizationMode }),
  showHelpers: appDefaults.showHelpers,
  setContainerSize: (nextContainerSize) =>
    set({ containerSize: nextContainerSize }),
  toggleHelpers: () => set((state) => ({ showHelpers: !state.showHelpers })),
  reset: () =>
    set({
      containerSize: DEFAULT_CONTAINER_SIZE,
      renderMode: 'fluid',
      ssfrAppearanceSettings: DEFAULT_SSFR_APPEARANCE_SETTINGS,
      ssfrBlurSettings: DEFAULT_SSFR_BLUR_SETTINGS,
      showHelpers: appDefaults.showHelpers,
      visualizationMode: 'speed',
    }),
  visualizationMode: 'speed',
}))
