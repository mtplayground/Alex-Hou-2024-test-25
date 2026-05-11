import type { BoxObstacle } from '@/sim/integrator'
import type { Vec3 } from '@/sim/kernels'
import type { SimParams } from '@/sim/particles'
import type { SimulationEmitter } from '@/sim/Simulation'

export type SimulationWorkerCommandType =
  | 'INIT'
  | 'START'
  | 'PAUSE'
  | 'STEP'
  | 'RESET'
  | 'UPDATE_PARAMS'

export interface InitSimulationMessage {
  readonly type: 'INIT'
  readonly payload: {
    readonly emitter?: SimulationEmitter
    readonly obstacles?: readonly BoxObstacle[]
    readonly params?: Partial<SimParams>
    readonly positions: readonly Vec3[]
    readonly velocities?: readonly Vec3[]
  }
}

export interface StartSimulationMessage {
  readonly type: 'START'
  readonly payload?: {
    readonly dt?: number
  }
}

export interface PauseSimulationMessage {
  readonly type: 'PAUSE'
}

export interface StepSimulationMessage {
  readonly type: 'STEP'
  readonly payload: {
    readonly dt: number
  }
}

export interface ResetSimulationMessage {
  readonly type: 'RESET'
}

export interface UpdateParamsSimulationMessage {
  readonly type: 'UPDATE_PARAMS'
  readonly payload: {
    readonly obstacles?: readonly BoxObstacle[]
    readonly params: Partial<SimParams>
  }
}

export type SimulationWorkerRequest =
  | InitSimulationMessage
  | PauseSimulationMessage
  | ResetSimulationMessage
  | StartSimulationMessage
  | StepSimulationMessage
  | UpdateParamsSimulationMessage

export interface SimulationPositionsMessage {
  readonly type: 'POSITIONS'
  readonly payload: {
    readonly positions: Float32Array
  }
}

export interface SimulationReadyMessage {
  readonly type: 'READY'
  readonly payload: {
    readonly initialized: boolean
    readonly running: boolean
  }
}

export interface SimulationStatsMessage {
  readonly type: 'STATS'
  readonly payload: {
    readonly particleCount: number
    readonly simTime: number
    readonly stepRate: number
  }
}

export interface SimulationErrorMessage {
  readonly type: 'ERROR'
  readonly payload: {
    readonly message: string
  }
}

export type SimulationWorkerResponse =
  | SimulationErrorMessage
  | SimulationPositionsMessage
  | SimulationReadyMessage
  | SimulationStatsMessage

export function createPositionsMessage(
  positions: Float32Array,
): SimulationPositionsMessage {
  return {
    payload: {
      positions,
    },
    type: 'POSITIONS',
  }
}

export function positionsTransferList(
  message: SimulationPositionsMessage,
): Transferable[] {
  return [message.payload.positions.buffer]
}
