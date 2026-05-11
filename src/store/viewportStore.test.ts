import { afterEach, describe, expect, it } from 'vitest'
import { appDefaults } from '@/config/env'
import { useViewportStore } from '@/store/viewportStore'

afterEach(() => {
  useViewportStore.getState().reset()
})

describe('useViewportStore', () => {
  it('resets to the configured environment defaults', () => {
    useViewportStore.getState().setContainerSize({
      depth: 5.5,
      height: 4,
      width: 5,
    })
    useViewportStore.getState().setVisualizationMode('pressure')
    useViewportStore.getState().toggleHelpers()

    useViewportStore.getState().reset()
    const nextState = useViewportStore.getState()

    expect(nextState.containerSize).toEqual({
      depth: 4.5,
      height: 3,
      width: 4.5,
    })
    expect(nextState.showHelpers).toBe(appDefaults.showHelpers)
    expect(nextState.visualizationMode).toBe('speed')
  })
})
