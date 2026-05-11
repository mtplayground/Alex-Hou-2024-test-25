import type { BoxObstacle } from '@/sim/integrator'
import type { SimParams } from '@/sim/particles'
import type { SimulationInit } from '@/sim/Simulation'
import type {
  SimulationErrorMessage,
  SimulationPositionsMessage,
  SimulationReadyMessage,
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from '@/workers/protocol'

export interface SimulationClientWorker {
  onerror: ((event: ErrorEvent) => void) | null
  onmessage: ((event: MessageEvent<SimulationWorkerResponse>) => void) | null
  postMessage: (message: SimulationWorkerRequest) => void
  terminate: () => void
}

export type SimulationClientWorkerFactory = () => SimulationClientWorker

export type PositionFrameListener = (positions: Float32Array) => void
export type SimulationErrorListener = (message: string) => void
export type SimulationReadyListener = (
  payload: SimulationReadyMessage['payload'],
) => void

function createDefaultWorker(): SimulationClientWorker {
  return new Worker(new URL('./simulationWorker.ts', import.meta.url), {
    type: 'module',
  })
}

export class SimulationClient {
  private readonly errorListeners = new Set<SimulationErrorListener>()

  private lastPositions: Float32Array | null = null

  private readonly positionListeners = new Set<PositionFrameListener>()

  private readonly readyListeners = new Set<SimulationReadyListener>()

  private readonly worker: SimulationClientWorker

  constructor(
    workerFactory: SimulationClientWorkerFactory = createDefaultWorker,
  ) {
    this.worker = workerFactory()
    this.worker.onmessage = (event) => {
      this.handleWorkerMessage(event.data)
    }
    this.worker.onerror = (event) => {
      const message =
        event.message || 'Simulation worker emitted an unknown error.'
      this.errorListeners.forEach((listener) => {
        listener(message)
      })
    }
  }

  init(config: SimulationInit): void {
    this.worker.postMessage({
      payload: config,
      type: 'INIT',
    })
  }

  start(dt?: number): void {
    this.worker.postMessage(
      dt === undefined
        ? { type: 'START' }
        : {
            payload: {
              dt,
            },
            type: 'START',
          },
    )
  }

  pause(): void {
    this.worker.postMessage({
      type: 'PAUSE',
    })
  }

  step(dt: number): void {
    this.worker.postMessage({
      payload: {
        dt,
      },
      type: 'STEP',
    })
  }

  reset(): void {
    this.worker.postMessage({
      type: 'RESET',
    })
  }

  updateParams(
    params: Partial<SimParams>,
    obstacles?: readonly BoxObstacle[],
  ): void {
    const payload =
      obstacles === undefined
        ? { params }
        : {
            obstacles,
            params,
          }

    this.worker.postMessage({
      payload,
      type: 'UPDATE_PARAMS',
    })
  }

  subscribeToFrames(listener: PositionFrameListener): () => void {
    this.positionListeners.add(listener)

    if (this.lastPositions) {
      listener(new Float32Array(this.lastPositions))
    }

    return () => {
      this.positionListeners.delete(listener)
    }
  }

  subscribeToErrors(listener: SimulationErrorListener): () => void {
    this.errorListeners.add(listener)

    return () => {
      this.errorListeners.delete(listener)
    }
  }

  subscribeToReady(listener: SimulationReadyListener): () => void {
    this.readyListeners.add(listener)

    return () => {
      this.readyListeners.delete(listener)
    }
  }

  destroy(): void {
    this.worker.onmessage = null
    this.worker.onerror = null
    this.worker.terminate()
    this.positionListeners.clear()
    this.readyListeners.clear()
    this.errorListeners.clear()
  }

  get positions(): Float32Array | null {
    return this.lastPositions ? new Float32Array(this.lastPositions) : null
  }

  private handleWorkerMessage(message: SimulationWorkerResponse): void {
    switch (message.type) {
      case 'POSITIONS':
        this.handlePositions(message)
        return
      case 'READY':
        this.readyListeners.forEach((listener) => {
          listener(message.payload)
        })
        return
      case 'ERROR':
        this.handleError(message)
        return
    }
  }

  private handleError(message: SimulationErrorMessage): void {
    this.errorListeners.forEach((listener) => {
      listener(message.payload.message)
    })
  }

  private handlePositions(message: SimulationPositionsMessage): void {
    this.lastPositions = new Float32Array(message.payload.positions)
    const snapshot = new Float32Array(this.lastPositions)

    this.positionListeners.forEach((listener) => {
      listener(new Float32Array(snapshot))
    })
  }
}
