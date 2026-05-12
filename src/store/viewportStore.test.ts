import { afterEach, describe, expect, it } from 'vitest'
import { appDefaults } from '@/config/env'
import {
  migrateViewportPersistedState,
  useViewportStore,
  VIEWPORT_PERSIST_VERSION,
} from '@/store/viewportStore'

afterEach(() => {
  useViewportStore.getState().reset()
})

describe('useViewportStore', () => {
  it('resets to the configured environment defaults', () => {
    useViewportStore.getState().setCameraPose({
      position: [8, 6, 7],
      target: [3, 2, 1],
    })
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
    useViewportStore.getState().setSsfrDebugView('normals')
    useViewportStore.getState().setSsfrFallbackActive(true)
    useViewportStore.getState().setSsfrSilentlyBroken(true)
    useViewportStore.getState().setSsfrAppearanceSettings({
      absorptionStrength: 1.9,
      fresnelPower: 6.2,
      showThicknessDebug: true,
      thicknessScale: 3.4,
      waterColor: '#38bdf8',
    })
    useViewportStore
      .getState()
      .setSsfrUnavailableReason('SSFR unavailable during startup.')
    useViewportStore.getState().toggleHelpers()

    useViewportStore.getState().reset()
    const nextState = useViewportStore.getState()

    expect(nextState.containerSize).toEqual({
      depth: 4.5,
      height: 3,
      width: 4.5,
    })
    expect(nextState.cameraPose).toEqual({
      position: [4.9, 2.8, 6.1],
      target: [2.4, 1.2, 2.3],
    })
    expect(nextState.renderMode).toBe('particles')
    expect(nextState.ssfrFallbackActive).toBe(false)
    expect(nextState.ssfrSilentlyBroken).toBe(false)
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
    expect(nextState.ssfrDebugView).toBe('final')
    expect(nextState.showHelpers).toBe(appDefaults.showHelpers)
    expect(nextState.ssfrUnavailableReason).toBeNull()
    expect(nextState.visualizationMode).toBe('speed')
  })

  it('migrates persisted fluid mode to particles while preserving other fields', () => {
    const migratedState = migrateViewportPersistedState(
      {
        cameraPose: {
          position: [7, 5, 4] as [number, number, number],
          target: [1, 1.5, 2] as [number, number, number],
        },
        containerSize: {
          depth: 6,
          height: 4.2,
          width: 5.8,
        },
        renderMode: 'fluid',
        showHelpers: false,
        ssfrAppearanceSettings: {
          absorptionStrength: 2.3,
          fresnelPower: 5.8,
          showThicknessDebug: true,
          thicknessScale: 3.1,
          waterColor: '#22d3ee',
        },
        ssfrBlurSettings: {
          iterations: 5,
          radius: 8,
        },
        ssfrDebugView: 'thickness',
        visualizationMode: 'density',
      },
      VIEWPORT_PERSIST_VERSION - 1,
    )

    expect(migratedState).toEqual({
      cameraPose: {
        position: [7, 5, 4],
        target: [1, 1.5, 2],
      },
      containerSize: {
        depth: 6,
        height: 4.2,
        width: 5.8,
      },
      renderMode: 'particles',
      showHelpers: false,
      ssfrAppearanceSettings: {
        absorptionStrength: 2.3,
        fresnelPower: 5.8,
        showThicknessDebug: true,
        thicknessScale: 3.1,
        waterColor: '#22d3ee',
      },
      ssfrBlurSettings: {
        iterations: 5,
        radius: 8,
      },
      ssfrDebugView: 'thickness',
      visualizationMode: 'density',
    })
  })
})
