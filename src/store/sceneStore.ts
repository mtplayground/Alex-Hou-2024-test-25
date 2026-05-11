import { create } from 'zustand'
import { defaultSimParams, type SimParams } from '@/sim/particles'
import type {
  InitialFluidBlock,
  Scene,
  SceneContainer,
  SceneEmitter,
  SceneObstacle,
} from '@/types/scene'

const DEFAULT_CONTAINER: SceneContainer = {
  depth: defaultSimParams.containerSize[2],
  height: defaultSimParams.containerSize[1],
  width: defaultSimParams.containerSize[0],
}

const DEFAULT_INITIAL_FLUID: InitialFluidBlock = {
  origin: [1.25, 1.1, 1.25],
  size: [1, 0.8, 1],
}

const DEFAULT_SCENE: Scene = {
  container: DEFAULT_CONTAINER,
  initialFluid: DEFAULT_INITIAL_FLUID,
  obstacles: [],
  simParams: defaultSimParams,
}

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
  return {
    ...params,
    containerSize: cloneVec3(params.containerSize),
    gravity: cloneVec3(params.gravity),
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
        obstacles: [...state.scene.obstacles, cloneObstacle(obstacle)],
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
      scene: cloneScene(scene),
    }),
  resetScene: () =>
    set({
      scene: cloneScene(DEFAULT_SCENE),
    }),
  scene: cloneScene(DEFAULT_SCENE),
  setContainer: (container) =>
    set((state) => ({
      scene: {
        ...state.scene,
        container: cloneContainer(container),
      },
    })),
  setEmitter: (emitter) =>
    set((state) => ({
      scene: {
        container: state.scene.container,
        emitter: cloneEmitter(emitter),
        obstacles: state.scene.obstacles,
        simParams: state.scene.simParams,
      },
    })),
  setInitialFluid: (initialFluid) =>
    set((state) => ({
      scene: {
        container: state.scene.container,
        initialFluid: cloneInitialFluid(initialFluid),
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

          return cloneObstacle({
            ...obstacle,
            ...patch,
            center: patch.center ? cloneVec3(patch.center) : obstacle.center,
            size: patch.size ? cloneVec3(patch.size) : obstacle.size,
          })
        }),
      },
    })),
  updateSimParams: (patch) =>
    set((state) => ({
      scene: {
        ...state.scene,
        simParams: cloneSimParams({
          ...state.scene.simParams,
          ...patch,
          containerSize: patch.containerSize
            ? cloneVec3(patch.containerSize)
            : state.scene.simParams.containerSize,
          gravity: patch.gravity
            ? cloneVec3(patch.gravity)
            : state.scene.simParams.gravity,
        }),
      },
    })),
}))
