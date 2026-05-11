export const storeModuleSummary = {
  path: 'src/store',
  title: 'State layer',
  description:
    'Zustand now covers both the temporary Hello-Cube smoke controls and the first durable scene model/state boundary, with scene serialization and preset persistence utilities for later editor UI work.',
}

export { useSceneStore, type SceneStoreState } from './sceneStore'
export {
  BUILT_IN_SCENES,
  DEFAULT_BUILT_IN_SCENE_ID,
  getBuiltInSceneById,
  getDefaultBuiltInScene,
  getDefaultBuiltInScenePreset,
  type BuiltInScenePreset,
} from './builtInScenes'
export {
  assertValidScene,
  cloneScene,
  deserializeScene,
  LocalStorageScenePresetManager,
  serializeScene,
  type ScenePreset,
} from './scenePersistence'
