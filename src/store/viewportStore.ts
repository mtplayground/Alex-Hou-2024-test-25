import { appDefaults } from '@/config/env'
import { create } from 'zustand'

export interface ContainerSize {
  depth: number
  height: number
  width: number
}

export type VisualizationMode = 'density' | 'pressure' | 'speed'

const DEFAULT_CONTAINER_SIZE: ContainerSize = {
  depth: 4.5,
  height: 3,
  width: 4.5,
}

interface ViewportState {
  containerSize: ContainerSize
  setVisualizationMode: (visualizationMode: VisualizationMode) => void
  showHelpers: boolean
  setContainerSize: (nextContainerSize: ContainerSize) => void
  toggleHelpers: () => void
  reset: () => void
  visualizationMode: VisualizationMode
}

export const useViewportStore = create<ViewportState>((set) => ({
  containerSize: DEFAULT_CONTAINER_SIZE,
  setVisualizationMode: (visualizationMode) => set({ visualizationMode }),
  showHelpers: appDefaults.showHelpers,
  setContainerSize: (nextContainerSize) =>
    set({ containerSize: nextContainerSize }),
  toggleHelpers: () => set((state) => ({ showHelpers: !state.showHelpers })),
  reset: () =>
    set({
      containerSize: DEFAULT_CONTAINER_SIZE,
      showHelpers: appDefaults.showHelpers,
      visualizationMode: 'speed',
    }),
  visualizationMode: 'speed',
}))
