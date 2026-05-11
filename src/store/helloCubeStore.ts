import { create } from 'zustand'

const DEFAULT_ROTATION_SPEED = 0.02

interface HelloCubeState {
  rotationSpeed: number
  showAxes: boolean
  setRotationSpeed: (rotationSpeed: number) => void
  toggleAxes: () => void
  reset: () => void
}

export const useHelloCubeStore = create<HelloCubeState>((set) => ({
  rotationSpeed: DEFAULT_ROTATION_SPEED,
  showAxes: true,
  setRotationSpeed: (rotationSpeed) => set({ rotationSpeed }),
  toggleAxes: () => set((state) => ({ showAxes: !state.showAxes })),
  reset: () =>
    set({
      rotationSpeed: DEFAULT_ROTATION_SPEED,
      showAxes: true,
    }),
}))
