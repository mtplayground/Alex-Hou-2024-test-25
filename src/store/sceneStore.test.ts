import { afterEach, describe, expect, it } from 'vitest'
import { appDefaults } from '@/config/env'
import { useSceneStore } from '@/store/sceneStore'

afterEach(() => {
  useSceneStore.getState().resetScene()
})

describe('useSceneStore', () => {
  it('updates scene container, sim params, and obstacle mutations', () => {
    const store = useSceneStore.getState()

    store.setContainer({
      depth: 6,
      height: 4,
      width: 5,
    })
    store.updateSimParams({
      gravity: [0, -12, 0],
      viscosity: 0.2,
    })
    store.addObstacle({
      center: [1, 1, 1],
      id: 'obstacle-1',
      size: [0.5, 0.5, 0.5],
    })
    store.updateObstacle('obstacle-1', {
      center: [1.5, 1, 1],
      size: [0.75, 0.5, 0.5],
    })

    const nextState = useSceneStore.getState().scene

    expect(nextState.container).toEqual({
      depth: 6,
      height: 4,
      width: 5,
    })
    expect(nextState.simParams.gravity).toEqual([0, -12, 0])
    expect(nextState.simParams.viscosity).toBe(0.2)
    expect(nextState.obstacles).toEqual([
      {
        center: [2.25, 0.9, 2.25],
        id: 'obstacle-default',
        size: [0.8, 0.6, 0.8],
      },
      {
        center: [1.5, 1, 1],
        id: 'obstacle-1',
        size: [0.75, 0.5, 0.5],
      },
    ])
  })

  it('switches between initial fluid and emitter scene variants', () => {
    useSceneStore.getState().setEmitter({
      direction: [0, -1, 0],
      particleCap: appDefaults.defaultParticleCount,
      position: [2, 2.5, 2],
      rate: 120,
      speed: 3,
    })

    const emitterScene = useSceneStore.getState().scene

    expect('emitter' in emitterScene).toBe(true)
    expect(emitterScene).toMatchObject({
      emitter: {
        direction: [0, -1, 0],
        particleCap: appDefaults.defaultParticleCount,
        position: [2, 2.5, 2],
        rate: 120,
        speed: 3,
      },
    })
    expect('initialFluid' in emitterScene).toBe(false)

    useSceneStore.getState().setInitialFluid({
      origin: [1, 1.2, 1],
      size: [0.8, 0.8, 0.8],
    })

    const fluidScene = useSceneStore.getState().scene

    expect('initialFluid' in fluidScene).toBe(true)
    expect(fluidScene).toMatchObject({
      initialFluid: {
        origin: [1, 1.2, 1],
        size: [0.8, 0.8, 0.8],
      },
    })
    expect('emitter' in fluidScene).toBe(false)
  })

  it('replaces and resets the entire scene snapshot', () => {
    useSceneStore.getState().replaceScene({
      container: {
        depth: 7,
        height: 5,
        width: 6,
      },
      emitter: {
        direction: [0, -1, 0],
        particleCap: appDefaults.defaultParticleCount,
        position: [3, 4, 2],
        rate: 240,
        speed: 5,
      },
      obstacles: [
        {
          center: [2, 1, 2],
          id: 'obstacle-2',
          size: [1, 0.5, 1],
        },
      ],
      simParams: {
        ...useSceneStore.getState().scene.simParams,
        viscosity: 0.35,
      },
    })

    expect(useSceneStore.getState().scene.container).toEqual({
      depth: 7,
      height: 5,
      width: 6,
    })

    useSceneStore.getState().resetScene()

    const resetScene = useSceneStore.getState().scene

    expect(resetScene.container).toEqual({
      depth: 4.5,
      height: 3,
      width: 4.5,
    })
    expect(resetScene.obstacles).toEqual([
      {
        center: [2.25, 0.9, 2.25],
        id: 'obstacle-default',
        size: [0.8, 0.6, 0.8],
      },
    ])
    expect('initialFluid' in resetScene).toBe(true)
  })
})
