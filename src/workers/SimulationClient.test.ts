import { describe, expect, it, vi } from 'vitest'
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from '@/workers/protocol'
import {
  SimulationClient,
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
    const frameListener = vi.fn<(positions: Float32Array) => void>()
    const readyListener =
      vi.fn<(payload: { initialized: boolean; running: boolean }) => void>()
    const unsubscribeFrames = client.subscribeToFrames(frameListener)
    client.subscribeToReady(readyListener)

    worker.emit({
      payload: {
        initialized: true,
        running: false,
      },
      type: 'READY',
    })
    worker.emit({
      payload: {
        positions: new Float32Array([1, 2, 3]),
      },
      type: 'POSITIONS',
    })

    expect(readyListener).toHaveBeenCalledWith({
      initialized: true,
      running: false,
    })
    expect(frameListener).toHaveBeenCalledTimes(1)
    const firstFrame = frameListener.mock.calls[0]?.[0]

    if (!firstFrame) {
      throw new Error(
        'Expected the frame listener to receive a position frame.',
      )
    }

    expect([...firstFrame]).toEqual([1, 2, 3])
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
        positions: new Float32Array([4, 5, 6]),
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
