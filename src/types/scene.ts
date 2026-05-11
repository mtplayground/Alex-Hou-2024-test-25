import type { Vec3 } from '@/sim/kernels'
import type { SimParams } from '@/sim/particles'

export interface SceneContainer {
  depth: number
  height: number
  width: number
}

export interface SceneObstacle {
  id: string
  center: Vec3
  size: Vec3
}

export interface InitialFluidBlock {
  origin: Vec3
  size: Vec3
}

export interface SceneEmitter {
  direction: Vec3
  position: Vec3
  rate: number
  speed: number
}

interface SceneBase {
  container: SceneContainer
  obstacles: SceneObstacle[]
  simParams: SimParams
}

export interface SceneWithInitialFluid extends SceneBase {
  emitter?: undefined
  initialFluid: InitialFluidBlock
}

export interface SceneWithEmitter extends SceneBase {
  emitter: SceneEmitter
  initialFluid?: undefined
}

export type Scene = SceneWithEmitter | SceneWithInitialFluid
