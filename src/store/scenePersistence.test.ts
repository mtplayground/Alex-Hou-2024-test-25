import { describe, expect, it } from 'vitest'
import { defaultSimParams } from '@/sim/particles'
import type { Scene } from '@/types/scene'
import {
  deserializeScene,
  LocalStorageScenePresetManager,
  serializeScene,
} from '@/store/scenePersistence'

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

function createScene(): Scene {
  return {
    container: {
      depth: 4.5,
      height: 3,
      width: 4.5,
    },
    initialFluid: {
      origin: [1, 1.2, 1],
      size: [0.8, 0.7, 0.8],
    },
    obstacles: [
      {
        center: [2.25, 0.9, 2.25],
        id: 'obstacle-a',
        size: [0.8, 0.6, 0.8],
      },
    ],
    simParams: {
      ...defaultSimParams,
      containerSize: [4.5, 3, 4.5],
      gravity: [0, -9.81, 0],
    },
  }
}

describe('scenePersistence', () => {
  it('serializes and deserializes a scene JSON snapshot', () => {
    const scene = createScene()

    const serialized = serializeScene(scene)
    const roundTrip = deserializeScene(serialized)

    expect(roundTrip).toEqual(scene)
  })

  it('rejects invalid scene JSON shapes', () => {
    expect(() =>
      deserializeScene(
        JSON.stringify({
          container: {
            depth: 4.5,
            height: 3,
            width: 4.5,
          },
          emitter: {
            direction: [0, -1, 0],
            particleCap: 128,
            position: [2, 2, 2],
            rate: 120,
            speed: 2,
          },
          initialFluid: {
            origin: [1, 1, 1],
            size: [1, 1, 1],
          },
          obstacles: [],
          simParams: defaultSimParams,
        }),
      ),
    ).toThrow('exactly one of emitter or initialFluid')
  })

  it('sanitizes unsafe but structurally valid scene values on deserialize', () => {
    const deserialized = deserializeScene(
      JSON.stringify({
        container: {
          depth: 999,
          height: 0.1,
          width: 0.2,
        },
        emitter: {
          direction: [0, -1, 0],
          particleCap: 99999,
          position: [999, -4, 999],
          rate: 999,
          speed: 999,
        },
        obstacles: [],
        simParams: {
          ...defaultSimParams,
          viscosity: 999,
        },
      }),
    )

    expect(deserialized.container.depth).toBe(8)
    expect(deserialized.container.height).toBe(1)
    expect(deserialized.emitter?.particleCap).toBe(2048)
    expect(deserialized.simParams.viscosity).toBe(2)
  })

  it('stores, lists, loads, and deletes named presets in storage', () => {
    const storage = new MemoryStorage()
    const manager = new LocalStorageScenePresetManager({ storage })
    const baseScene = createScene()
    const emitterScene: Scene = {
      container: {
        depth: 5,
        height: 4,
        width: 5,
      },
      emitter: {
        direction: [0, -1, 0],
        particleCap: 256,
        position: [2.5, 3, 2.5],
        rate: 180,
        speed: 3.5,
      },
      obstacles: [],
      simParams: {
        ...defaultSimParams,
        containerSize: [5, 4, 5],
        gravity: [0, -12, 0],
      },
    }

    manager.savePreset('Base Scene', baseScene)
    manager.savePreset('Emitter Scene', emitterScene)

    expect(manager.listPresets().map((preset) => preset.name)).toEqual([
      'Base Scene',
      'Emitter Scene',
    ])
    expect(manager.loadPreset('Base Scene')).toEqual(baseScene)
    expect(manager.loadPreset('Emitter Scene')).toEqual(emitterScene)
    expect(manager.deletePreset('Base Scene')).toBe(true)
    expect(manager.deletePreset('Missing Scene')).toBe(false)
    expect(manager.listPresets().map((preset) => preset.name)).toEqual([
      'Emitter Scene',
    ])
  })

  it('rejects invalid preset storage payloads', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      'presets',
      JSON.stringify({
        presets: [
          {
            name: 'Broken',
            scene: {
              container: {
                depth: 4.5,
                height: 3,
                width: 4.5,
              },
              obstacles: [],
              simParams: defaultSimParams,
            },
            updatedAt: '2026-05-11T00:00:00.000Z',
          },
        ],
        version: 1,
      }),
    )

    const manager = new LocalStorageScenePresetManager({
      storage,
      storageKey: 'presets',
    })

    expect(() => manager.listPresets()).toThrow(
      'exactly one of emitter or initialFluid',
    )
  })
})
