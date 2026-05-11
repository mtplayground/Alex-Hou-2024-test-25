import { appDefaults } from '@/config/env'
import { defaultSimParams } from '@/sim/particles'
import type { Scene } from '@/types/scene'
import { cloneScene } from './scenePersistence'
import type { ViewportCameraPose } from './viewportStore'

export interface BuiltInScenePreset {
  camera: ViewportCameraPose
  description: string
  id: string
  name: string
  scene: Scene
}

export const DEFAULT_BUILT_IN_SCENE_ID = 'dam-break'

const DAM_BREAK_SCENE: Scene = {
  container: {
    depth: 4.8,
    height: 3.4,
    width: 5.6,
  },
  initialFluid: {
    origin: [0.35, 0.35, 0.55],
    size: [1.15, 1.45, 1.1],
  },
  obstacles: [
    {
      center: [3.95, 0.7, 2.4],
      id: 'dam-break-baffle',
      size: [0.7, 0.55, 0.7],
    },
  ],
  simParams: {
    ...defaultSimParams,
    containerSize: [5.6, 3.4, 4.8],
  },
}

const FOUNTAIN_SCENE: Scene = {
  container: {
    depth: 4.2,
    height: 4.8,
    width: 4.2,
  },
  emitter: {
    direction: [0, 1, 0],
    particleCap: Math.min(appDefaults.defaultParticleCount, 1536),
    position: [2.1, 0.65, 2.1],
    rate: appDefaults.defaultEmitterRate,
    speed: 3.8,
  },
  obstacles: [
    {
      center: [2.1, 0.3, 2.1],
      id: 'fountain-basin',
      size: [1.3, 0.2, 1.3],
    },
  ],
  simParams: {
    ...defaultSimParams,
    containerSize: [4.2, 4.8, 4.2],
    gravity: [0, -10.5, 0],
  },
}

const DROP_INTO_POOL_SCENE: Scene = {
  container: {
    depth: 5,
    height: 4.1,
    width: 5,
  },
  initialFluid: {
    origin: [1.65, 2.35, 1.65],
    size: [1.1, 0.95, 1.1],
  },
  obstacles: [
    {
      center: [2.5, 0.25, 2.5],
      id: 'pool-floor',
      size: [1.6, 0.2, 1.6],
    },
    {
      center: [2.5, 0.75, 2.5],
      id: 'pool-core',
      size: [0.95, 0.35, 0.95],
    },
  ],
  simParams: {
    ...defaultSimParams,
    containerSize: [5, 4.1, 5],
    viscosity: 0.14,
  },
}

export const BUILT_IN_SCENES: BuiltInScenePreset[] = [
  {
    camera: {
      position: [4.9, 2.8, 6.1],
      target: [2.4, 1.2, 2.3],
    },
    description:
      'A dense wall of fluid collapses into a wider chamber with a central baffle.',
    id: 'dam-break',
    name: 'Dam break',
    scene: DAM_BREAK_SCENE,
  },
  {
    camera: {
      position: [5.2, 3.6, 5.1],
      target: [2.1, 1.4, 2.1],
    },
    description:
      'A continuous emitter jets upward from a compact basin until it reaches the particle cap.',
    id: 'fountain',
    name: 'Fountain',
    scene: FOUNTAIN_SCENE,
  },
  {
    camera: {
      position: [5.8, 3.1, 5.4],
      target: [2.5, 1.05, 2.45],
    },
    description:
      'A suspended fluid block drops into a shallow obstacle-defined pool to show impact motion.',
    id: 'drop-into-pool',
    name: 'Drop into pool',
    scene: DROP_INTO_POOL_SCENE,
  },
]

export function getBuiltInSceneById(
  id: string,
): BuiltInScenePreset | undefined {
  return BUILT_IN_SCENES.find((scenePreset) => scenePreset.id === id)
}

export function getDefaultBuiltInScenePreset(): BuiltInScenePreset {
  const preset = getBuiltInSceneById(DEFAULT_BUILT_IN_SCENE_ID)

  if (preset === undefined) {
    throw new Error(
      `Built-in default scene "${DEFAULT_BUILT_IN_SCENE_ID}" is not defined.`,
    )
  }

  return preset
}

export function getDefaultBuiltInScene(): Scene {
  return cloneScene(getDefaultBuiltInScenePreset().scene)
}
