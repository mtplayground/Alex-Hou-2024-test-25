import { Simulation, type SimulationInit } from '@/sim'
import type { BoxObstacle } from '@/sim/integrator'
import type { SimParams } from '@/sim/particles'
import { sanitizeSimParams, sanitizeTimeStep } from '@/sim/safety'
import {
  createPositionsMessage,
  positionsTransferList,
  type SimulationErrorMessage,
  type SimulationReadyMessage,
  type SimulationStatsMessage,
  type SimulationWorkerRequest,
  type SimulationWorkerResponse,
} from '@/workers/protocol'

type HostPostMessage = (
  message: SimulationWorkerResponse,
  transfer?: Transferable[],
) => void

export class SimulationWorkerHost {
  private readonly postMessage: HostPostMessage

  private frameDt = 1 / 60

  private initialized = false

  private lastStepTimestamp: number | null = null

  private readonly simulation = new Simulation()

  private stepTimer: ReturnType<typeof setInterval> | null = null

  constructor(postMessage: HostPostMessage) {
    this.postMessage = postMessage
  }

  handleMessage(message: SimulationWorkerRequest): void {
    try {
      switch (message.type) {
        case 'INIT':
          this.handleInit(message.payload)
          return
        case 'START':
          this.handleStart(message.payload?.dt)
          return
        case 'PAUSE':
          this.handlePause()
          return
        case 'STEP':
          this.handleStep(message.payload.dt)
          return
        case 'RESET':
          this.handleReset()
          return
        case 'UPDATE_PARAMS':
          this.handleUpdateParams(
            message.payload.params,
            message.payload.obstacles,
          )
          return
      }
    } catch (error) {
      this.handlePause()
      this.postMessage(this.toErrorMessage(error))
    }
  }

  dispose(): void {
    this.handlePause()
  }

  private emitPositions(): void {
    const message = createPositionsMessage(this.simulation.frame)
    this.postMessage(message, positionsTransferList(message))
  }

  private emitReady(): void {
    const message: SimulationReadyMessage = {
      payload: {
        initialized: this.initialized,
        running: this.stepTimer !== null,
      },
      type: 'READY',
    }

    this.postMessage(message)
  }

  private emitStats(stepRate: number): void {
    const message: SimulationStatsMessage = {
      payload: {
        particleCount: this.simulation.particleCount,
        simTime: this.simulation.simTime,
        stepRate,
      },
      type: 'STATS',
    }

    this.postMessage(message)
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Simulation worker has not been initialized yet.')
    }
  }

  private handleInit(payload: SimulationInit): void {
    this.handlePause()
    this.simulation.init(payload)
    this.initialized = true
    this.lastStepTimestamp = null
    this.emitReady()
    this.emitPositions()
    this.emitStats(0)
  }

  private handlePause(): void {
    if (this.stepTimer !== null) {
      clearInterval(this.stepTimer)
      this.stepTimer = null
      this.lastStepTimestamp = null
      this.emitReady()
      this.emitStats(0)
    }
  }

  private handleReset(): void {
    this.ensureInitialized()
    this.simulation.reset()
    this.lastStepTimestamp = null
    this.emitReady()
    this.emitPositions()
    this.emitStats(0)
  }

  private handleStart(dt?: number): void {
    this.ensureInitialized()
    this.handlePause()
    if (dt !== undefined && (!Number.isFinite(dt) || dt < 0)) {
      throw new RangeError(
        'Simulation worker start dt must be a finite non-negative value.',
      )
    }
    this.frameDt = sanitizeTimeStep(dt ?? this.frameDt, this.frameDt)

    this.stepTimer = setInterval(() => {
      try {
        this.simulation.step(this.frameDt)
        this.emitPositions()
        this.emitStats(this.resolveStepRate(this.frameDt))
      } catch (error) {
        this.handlePause()
        this.postMessage(this.toErrorMessage(error))
      }
    }, this.frameDt * 1000)

    this.emitReady()
  }

  private handleStep(dt: number): void {
    this.ensureInitialized()
    if (!Number.isFinite(dt) || dt < 0) {
      throw new RangeError(
        'Simulation worker step dt must be a finite non-negative value.',
      )
    }

    const safeDt = sanitizeTimeStep(dt, this.frameDt)
    this.simulation.step(safeDt)
    this.emitPositions()
    this.emitStats(this.resolveStepRate(safeDt))
  }

  private handleUpdateParams(
    params: Partial<SimParams>,
    obstacles?: readonly BoxObstacle[],
  ): void {
    this.ensureInitialized()
    this.simulation.updateParams(sanitizeSimParams(params))

    if (obstacles) {
      this.simulation.updateObstacles(obstacles)
    }

    this.emitReady()
  }

  private toErrorMessage(error: unknown): SimulationErrorMessage {
    return {
      payload: {
        message:
          error instanceof Error ? error.message : 'Unknown worker error.',
      },
      type: 'ERROR',
    }
  }

  private resolveStepRate(fallbackDt: number): number {
    const now = this.now()
    const previousTimestamp = this.lastStepTimestamp
    this.lastStepTimestamp = now

    if (previousTimestamp !== null) {
      const elapsedMs = now - previousTimestamp

      if (elapsedMs > 0) {
        return 1000 / elapsedMs
      }
    }

    return fallbackDt > 0 ? 1 / fallbackDt : 0
  }

  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now()
  }
}

interface WorkerHostScope {
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  postMessage: (
    message: SimulationWorkerResponse,
    transfer?: Transferable[],
  ) => void
}

function isSimulationWorkerRequest(
  value: unknown,
): value is SimulationWorkerRequest {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as { type?: unknown }

  return (
    candidate.type === 'INIT' ||
    candidate.type === 'START' ||
    candidate.type === 'PAUSE' ||
    candidate.type === 'STEP' ||
    candidate.type === 'RESET' ||
    candidate.type === 'UPDATE_PARAMS'
  )
}

function isWorkerHostScope(value: unknown): value is WorkerHostScope {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as {
    onmessage?: unknown
    postMessage?: unknown
  }

  return typeof candidate.postMessage === 'function'
}

const workerScope = isWorkerHostScope(globalThis) ? globalThis : null

if (workerScope) {
  const host = new SimulationWorkerHost((message, transfer) => {
    workerScope.postMessage(message, transfer ? { transfer } : undefined)
  })

  workerScope.onmessage = (event) => {
    if (!isSimulationWorkerRequest(event.data)) {
      host.handleMessage({
        type: 'PAUSE',
      })
      workerScope.postMessage({
        payload: {
          message: 'Worker received an invalid simulation request.',
        },
        type: 'ERROR',
      })
      return
    }

    host.handleMessage(event.data)
  }
}
