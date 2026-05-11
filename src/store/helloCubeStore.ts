import { appDefaults } from '@/config/env'
import { create } from 'zustand'

interface HelloCubeState {
  rotationSpeed: number
  showAxes: boolean
  setRotationSpeed: (rotationSpeed: number) => void
  toggleAxes: () => void
  reset: () => void
}

export const useHelloCubeStore = create<HelloCubeState>((set) => ({
  rotationSpeed: appDefaults.rotationSpeed,
  showAxes: appDefaults.showAxes,
  setRotationSpeed: (rotationSpeed) => set({ rotationSpeed }),
  toggleAxes: () => set((state) => ({ showAxes: !state.showAxes })),
  reset: () =>
    set({
      rotationSpeed: appDefaults.rotationSpeed,
      showAxes: appDefaults.showAxes,
    }),
}))
