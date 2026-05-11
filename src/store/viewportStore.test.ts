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
    useViewportStore.getState().setRenderMode('particles')
    useViewportStore.getState().setVisualizationMode('pressure')
    useViewportStore.getState().setSsfrBlurSettings({
      iterations: 4,
      radius: 7,
    })
    useViewportStore.getState().setSsfrAppearanceSettings({
      absorptionStrength: 1.9,
      fresnelPower: 6.2,
      showThicknessDebug: true,
      thicknessScale: 3.4,
      waterColor: '#38bdf8',
    })
    useViewportStore.getState().toggleHelpers()

    useViewportStore.getState().reset()
    const nextState = useViewportStore.getState()

    expect(nextState.containerSize).toEqual({
      depth: 4.5,
      height: 3,
      width: 4.5,
    })
    expect(nextState.renderMode).toBe('fluid')
    expect(nextState.ssfrAppearanceSettings).toEqual({
      absorptionStrength: 1,
      fresnelPower: 4.5,
      showThicknessDebug: false,
      thicknessScale: 2.2,
      waterColor: '#0f4c72',
    })
    expect(nextState.ssfrBlurSettings).toEqual({
      iterations: 2,
      radius: 4,
    })
    expect(nextState.showHelpers).toBe(appDefaults.showHelpers)
    expect(nextState.visualizationMode).toBe('speed')
  })
})
