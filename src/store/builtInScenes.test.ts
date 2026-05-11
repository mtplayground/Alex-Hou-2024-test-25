import { describe, expect, it } from 'vitest'
import {
  assertValidScene,
  BUILT_IN_SCENES,
  DEFAULT_BUILT_IN_SCENE_ID,
  getBuiltInSceneById,
  getDefaultBuiltInScene,
  getDefaultBuiltInScenePreset,
} from '@/store'

describe('built-in scenes', () => {
  it('ships three validated starter scenes', () => {
    expect(BUILT_IN_SCENES).toHaveLength(3)
    expect(BUILT_IN_SCENES.map((scenePreset) => scenePreset.id)).toEqual([
      'dam-break',
      'fountain',
      'drop-into-pool',
    ])

    for (const scenePreset of BUILT_IN_SCENES) {
      expect(() => assertValidScene(scenePreset.scene)).not.toThrow()
    }
  })

  it('returns a cloned default scene from the configured default preset', () => {
    const defaultPreset = getDefaultBuiltInScenePreset()

    expect(defaultPreset.id).toBe(DEFAULT_BUILT_IN_SCENE_ID)
    expect(getBuiltInSceneById(DEFAULT_BUILT_IN_SCENE_ID)).toEqual(
      defaultPreset,
    )

    const firstScene = getDefaultBuiltInScene()
    const secondScene = getDefaultBuiltInScene()

    expect(firstScene).toEqual(defaultPreset.scene)
    expect(secondScene).toEqual(defaultPreset.scene)
    expect(firstScene).not.toBe(secondScene)
    expect(firstScene.container).not.toBe(secondScene.container)
  })
})
