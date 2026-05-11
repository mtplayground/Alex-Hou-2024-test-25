import { afterEach, describe, expect, it } from 'vitest'
import { appDefaults } from '@/config/env'
import { useHelloCubeStore } from '@/store/helloCubeStore'

afterEach(() => {
  useHelloCubeStore.getState().reset()
})

describe('useHelloCubeStore', () => {
  it('resets to the configured environment defaults', () => {
    useHelloCubeStore.getState().setContainerSize({
      depth: 5.5,
      height: 4,
      width: 5,
    })
    useHelloCubeStore.getState().setRotationSpeed(0.061)
    useHelloCubeStore.getState().toggleHelpers()

    useHelloCubeStore.getState().reset()
    const nextState = useHelloCubeStore.getState()

    expect(nextState.containerSize).toEqual({
      depth: 4.5,
      height: 3,
      width: 4.5,
    })
    expect(nextState.rotationSpeed).toBe(appDefaults.rotationSpeed)
    expect(nextState.showHelpers).toBe(appDefaults.showHelpers)
  })
})
