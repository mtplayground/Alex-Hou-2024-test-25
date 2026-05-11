export const storeModuleSummary = {
  path: 'src/store',
  title: 'State layer',
  description:
    'Zustand now covers both the temporary Hello-Cube smoke controls and the first durable scene model/state boundary, with scene serialization and preset persistence utilities for later editor UI work.',
}

export { useSceneStore, type SceneStoreState } from './sceneStore'
export {
  assertValidScene,
  cloneScene,
  deserializeScene,
  LocalStorageScenePresetManager,
  serializeScene,
  type ScenePreset,
} from './scenePersistence'
