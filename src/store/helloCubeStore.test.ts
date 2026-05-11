import { afterEach, describe, expect, it } from 'vitest'
import { appDefaults } from '@/config/env'
import { useHelloCubeStore } from '@/store/helloCubeStore'

afterEach(() => {
  useHelloCubeStore.getState().reset()
})

describe('useHelloCubeStore', () => {
  it('resets to the configured environment defaults', () => {
    useHelloCubeStore.getState().setRotationSpeed(0.061)
    useHelloCubeStore.getState().toggleHelpers()

    useHelloCubeStore.getState().reset()
    const nextState = useHelloCubeStore.getState()

    expect(nextState.rotationSpeed).toBe(appDefaults.rotationSpeed)
    expect(nextState.showHelpers).toBe(appDefaults.showHelpers)
  })
})
