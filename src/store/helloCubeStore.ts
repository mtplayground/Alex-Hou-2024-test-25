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

interface HelloCubeState {
  containerSize: ContainerSize
  rotationSpeed: number
  setVisualizationMode: (visualizationMode: VisualizationMode) => void
  showHelpers: boolean
  setContainerSize: (nextContainerSize: ContainerSize) => void
  setRotationSpeed: (rotationSpeed: number) => void
  toggleHelpers: () => void
  reset: () => void
  visualizationMode: VisualizationMode
}

export const useHelloCubeStore = create<HelloCubeState>((set) => ({
  containerSize: DEFAULT_CONTAINER_SIZE,
  rotationSpeed: appDefaults.rotationSpeed,
  setVisualizationMode: (visualizationMode) => set({ visualizationMode }),
  showHelpers: appDefaults.showHelpers,
  setContainerSize: (nextContainerSize) =>
    set({ containerSize: nextContainerSize }),
  setRotationSpeed: (rotationSpeed) => set({ rotationSpeed }),
  toggleHelpers: () => set((state) => ({ showHelpers: !state.showHelpers })),
  reset: () =>
    set({
      containerSize: DEFAULT_CONTAINER_SIZE,
      rotationSpeed: appDefaults.rotationSpeed,
      showHelpers: appDefaults.showHelpers,
      visualizationMode: 'speed',
    }),
  visualizationMode: 'speed',
}))
