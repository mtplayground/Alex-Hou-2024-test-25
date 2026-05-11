import { create } from 'zustand'
import {
  sanitizeInitialFluidBlock,
  sanitizeScene,
  sanitizeSceneContainer,
  sanitizeSceneEmitter,
  sanitizeSceneObstacle,
  sanitizeSimParams,
  type SimParams,
} from '@/sim'
import type {
  InitialFluidBlock,
  Scene,
  SceneContainer,
  SceneEmitter,
  SceneObstacle,
} from '@/types/scene'
import { getDefaultBuiltInScene } from './builtInScenes'

function cloneVec3(vector: readonly number[]): [number, number, number] {
  return [vector[0] ?? 0, vector[1] ?? 0, vector[2] ?? 0]
}

function cloneContainer(container: SceneContainer): SceneContainer {
  return { ...container }
}

function cloneObstacle(obstacle: SceneObstacle): SceneObstacle {
  return {
    center: cloneVec3(obstacle.center),
    id: obstacle.id,
    size: cloneVec3(obstacle.size),
  }
}

function cloneSimParams(params: SimParams): SimParams {
  const sanitized = sanitizeSimParams(params)
  return {
    ...sanitized,
    containerSize: cloneVec3(sanitized.containerSize),
    gravity: cloneVec3(sanitized.gravity),
  }
}

function cloneInitialFluid(initialFluid: InitialFluidBlock): InitialFluidBlock {
  return {
    origin: cloneVec3(initialFluid.origin),
    size: cloneVec3(initialFluid.size),
  }
}

function cloneEmitter(emitter: SceneEmitter): SceneEmitter {
  return {
    direction: cloneVec3(emitter.direction),
    particleCap: emitter.particleCap,
    position: cloneVec3(emitter.position),
    rate: emitter.rate,
    speed: emitter.speed,
  }
}

function cloneScene(scene: Scene): Scene {
  const base = {
    container: cloneContainer(scene.container),
    obstacles: scene.obstacles.map(cloneObstacle),
    simParams: cloneSimParams(scene.simParams),
  }

  if (scene.initialFluid !== undefined) {
    return {
      ...base,
      initialFluid: cloneInitialFluid(scene.initialFluid),
    }
  }

  return {
    ...base,
    emitter: cloneEmitter(scene.emitter),
  }
}

function nextDefaultScene(): Scene {
  return cloneScene(getDefaultBuiltInScene())
}

function sanitizeNextScene(scene: Scene): Scene {
  return cloneScene(sanitizeScene(scene))
}

export interface SceneStoreState {
  addObstacle: (obstacle: SceneObstacle) => void
  removeObstacle: (id: string) => void
  replaceScene: (scene: Scene) => void
  resetScene: () => void
  scene: Scene
  setContainer: (container: SceneContainer) => void
  setEmitter: (emitter: SceneEmitter) => void
  setInitialFluid: (initialFluid: InitialFluidBlock) => void
  updateObstacle: (id: string, patch: Partial<SceneObstacle>) => void
  updateSimParams: (patch: Partial<SimParams>) => void
}

export const useSceneStore = create<SceneStoreState>((set) => ({
  addObstacle: (obstacle) =>
    set((state) => ({
      scene: {
        ...state.scene,
        obstacles: [
          ...state.scene.obstacles,
          sanitizeSceneObstacle(obstacle, state.scene.container),
        ],
      },
    })),
  removeObstacle: (id) =>
    set((state) => ({
      scene: {
        ...state.scene,
        obstacles: state.scene.obstacles.filter(
          (obstacle) => obstacle.id !== id,
        ),
      },
    })),
  replaceScene: (scene) =>
    set({
      scene: sanitizeNextScene(scene),
    }),
  resetScene: () =>
    set({
      scene: nextDefaultScene(),
    }),
  scene: nextDefaultScene(),
  setContainer: (container) =>
    set((state) => ({
      scene: sanitizeNextScene({
        ...state.scene,
        container: sanitizeSceneContainer(container, state.scene.container),
      }),
    })),
  setEmitter: (emitter) =>
    set((state) => ({
      scene: {
        container: state.scene.container,
        emitter: sanitizeSceneEmitter(emitter, state.scene.container),
        obstacles: state.scene.obstacles,
        simParams: state.scene.simParams,
      },
    })),
  setInitialFluid: (initialFluid) =>
    set((state) => ({
      scene: {
        container: state.scene.container,
        initialFluid: sanitizeInitialFluidBlock(
          initialFluid,
          state.scene.container,
        ),
        obstacles: state.scene.obstacles,
        simParams: state.scene.simParams,
      },
    })),
  updateObstacle: (id, patch) =>
    set((state) => ({
      scene: {
        ...state.scene,
        obstacles: state.scene.obstacles.map((obstacle) => {
          if (obstacle.id !== id) {
            return obstacle
          }

          return sanitizeSceneObstacle(
            {
              ...obstacle,
              ...patch,
              center: patch.center ? cloneVec3(patch.center) : obstacle.center,
              size: patch.size ? cloneVec3(patch.size) : obstacle.size,
            },
            state.scene.container,
          )
        }),
      },
    })),
  updateSimParams: (patch) =>
    set((state) => ({
      scene: {
        ...state.scene,
        simParams: cloneSimParams(
          sanitizeSimParams({
            ...state.scene.simParams,
            ...patch,
            containerSize: patch.containerSize
              ? cloneVec3(patch.containerSize)
              : state.scene.simParams.containerSize,
            gravity: patch.gravity
              ? cloneVec3(patch.gravity)
              : state.scene.simParams.gravity,
          }),
        ),
      },
    })),
}))
