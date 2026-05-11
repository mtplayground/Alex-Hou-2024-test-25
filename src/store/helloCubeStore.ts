import { appDefaults } from '@/config/env'
import { create } from 'zustand'

interface HelloCubeState {
  rotationSpeed: number
  showHelpers: boolean
  setRotationSpeed: (rotationSpeed: number) => void
  toggleHelpers: () => void
  reset: () => void
}

export const useHelloCubeStore = create<HelloCubeState>((set) => ({
  rotationSpeed: appDefaults.rotationSpeed,
  showHelpers: appDefaults.showHelpers,
  setRotationSpeed: (rotationSpeed) => set({ rotationSpeed }),
  toggleHelpers: () => set((state) => ({ showHelpers: !state.showHelpers })),
  reset: () =>
    set({
      rotationSpeed: appDefaults.rotationSpeed,
      showHelpers: appDefaults.showHelpers,
    }),
}))
