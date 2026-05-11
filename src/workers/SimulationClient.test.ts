import { describe, expect, it, vi } from 'vitest'
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from '@/workers/protocol'
import {
  SimulationClient,
  type SimulationFrame,
  type SimulationClientWorker,
} from '@/workers/SimulationClient'

class FakeWorker implements SimulationClientWorker {
  onerror: ((event: ErrorEvent) => void) | null = null

  onmessage: ((event: MessageEvent<SimulationWorkerResponse>) => void) | null =
    null

  readonly sentMessages: SimulationWorkerRequest[] = []

  terminated = false

  postMessage(message: SimulationWorkerRequest): void {
    this.sentMessages.push(message)
  }

  terminate(): void {
    this.terminated = true
  }

  emit(message: SimulationWorkerResponse): void {
    this.onmessage?.({
      data: message,
    } as MessageEvent<SimulationWorkerResponse>)
  }

  emitError(message: string): void {
    this.onerror?.({ message } as ErrorEvent)
  }
}

describe('SimulationClient', () => {
  it('sends the expected worker commands', () => {
    const worker = new FakeWorker()
    const client = new SimulationClient(() => worker)

    client.init({
      positions: [[0, 0, 0]],
    })
    client.start(1 / 60)
    client.pause()
    client.step(1 / 120)
    client.reset()
    client.updateParams(
      {
        viscosity: 0.2,
      },
      [
        {
          center: [0.5, 0.5, 0.5],
          size: [0.2, 0.2, 0.2],
        },
      ],
    )

    expect(worker.sentMessages).toEqual([
      {
        payload: {
          positions: [[0, 0, 0]],
        },
        type: 'INIT',
      },
      {
        payload: {
          dt: 1 / 60,
        },
        type: 'START',
      },
      {
        type: 'PAUSE',
      },
      {
        payload: {
          dt: 1 / 120,
        },
        type: 'STEP',
      },
      {
        type: 'RESET',
      },
      {
        payload: {
          obstacles: [
            {
              center: [0.5, 0.5, 0.5],
              size: [0.2, 0.2, 0.2],
            },
          ],
          params: {
            viscosity: 0.2,
          },
        },
        type: 'UPDATE_PARAMS',
      },
    ])
  })

  it('notifies frame and ready subscribers from worker messages', () => {
    const worker = new FakeWorker()
    const client = new SimulationClient(() => worker)
    const frameListener = vi.fn<(frame: SimulationFrame) => void>()
    const readyListener =
      vi.fn<(payload: { initialized: boolean; running: boolean }) => void>()
    const statsListener =
      vi.fn<
        (payload: {
          particleCount: number
          simTime: number
          stepRate: number
        }) => void
      >()
    const unsubscribeFrames = client.subscribeToFrames(frameListener)
    client.subscribeToReady(readyListener)
    client.subscribeToStats(statsListener)

    worker.emit({
      payload: {
        initialized: true,
        running: false,
      },
      type: 'READY',
    })
    worker.emit({
      payload: {
        densities: new Float32Array([950]),
        positions: new Float32Array([1, 2, 3]),
        pressures: new Float32Array([25]),
        speeds: new Float32Array([1.75]),
      },
      type: 'POSITIONS',
    })
    worker.emit({
      payload: {
        particleCount: 1,
        simTime: 0.5,
        stepRate: 60,
      },
      type: 'STATS',
    })

    expect(readyListener).toHaveBeenCalledWith({
      initialized: true,
      running: false,
    })
    expect(statsListener).toHaveBeenCalledWith({
      particleCount: 1,
      simTime: 0.5,
      stepRate: 60,
    })
    expect(frameListener).toHaveBeenCalledTimes(1)
    const firstFrame = frameListener.mock.calls[0]?.[0]

    if (!firstFrame) {
      throw new Error(
        'Expected the frame listener to receive a position frame.',
      )
    }

    expect([...firstFrame.positions]).toEqual([1, 2, 3])
    expect([...firstFrame.speeds]).toEqual([1.75])
    expect([...firstFrame.densities]).toEqual([950])
    expect([...firstFrame.pressures]).toEqual([25])
    const positions = client.positions

    if (!positions) {
      throw new Error(
        'Expected the client to retain the latest position frame.',
      )
    }

    expect([...positions]).toEqual([1, 2, 3])

    unsubscribeFrames()

    worker.emit({
      payload: {
        densities: new Float32Array([970]),
        positions: new Float32Array([4, 5, 6]),
        pressures: new Float32Array([30]),
        speeds: new Float32Array([2]),
      },
      type: 'POSITIONS',
    })

    expect(frameListener).toHaveBeenCalledTimes(1)
  })

  it('forwards worker errors and tears down the worker', () => {
    const worker = new FakeWorker()
    const client = new SimulationClient(() => worker)
    const errorListener = vi.fn<(message: string) => void>()

    client.subscribeToErrors(errorListener)
    worker.emit({
      payload: {
        message: 'frame failed',
      },
      type: 'ERROR',
    })
    worker.emitError('worker crashed')

    expect(errorListener).toHaveBeenNthCalledWith(1, 'frame failed')
    expect(errorListener).toHaveBeenNthCalledWith(2, 'worker crashed')

    client.destroy()

    expect(worker.terminated).toBe(true)
  })
})
