import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SimulationWorkerResponse } from '@/workers/protocol'
import { SimulationWorkerHost } from '@/workers/simulationWorker'

function expectBufferCloseTo(
  actual: readonly number[],
  expected: readonly number[],
): void {
  expected.forEach((component, index) => {
    expect(actual[index]).toBeCloseTo(component, 5)
  })
}

describe('SimulationWorkerHost', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes, steps, resets, and transfers position buffers', () => {
    const postMessage =
      vi.fn<
        (message: SimulationWorkerResponse, transfer?: Transferable[]) => void
      >()
    const host = new SimulationWorkerHost(postMessage)

    host.handleMessage({
      payload: {
        params: {
          gravity: [0, -9.81, 0],
          particleMass: 0,
          viscosity: 0,
        },
        positions: [[0.25, 0.8, 0.25]],
      },
      type: 'INIT',
    })

    host.handleMessage({
      payload: {
        dt: 0.1,
      },
      type: 'STEP',
    })

    const initReady = postMessage.mock.calls[0]?.[0]
    const initPositions = postMessage.mock.calls[1]?.[0]
    const steppedPositions = postMessage.mock.calls[2]?.[0]
    const steppedTransfer = postMessage.mock.calls[2]?.[1]

    expect(initReady).toEqual({
      payload: {
        initialized: true,
        running: false,
      },
      type: 'READY',
    })
    expect(initPositions?.type).toBe('POSITIONS')
    expect(steppedPositions?.type).toBe('POSITIONS')
    expect(steppedTransfer).toEqual([
      (steppedPositions?.type === 'POSITIONS'
        ? steppedPositions.payload.positions.buffer
        : null) as Transferable,
    ])

    if (steppedPositions?.type !== 'POSITIONS') {
      throw new Error('Expected a POSITIONS response after STEP.')
    }

    expectBufferCloseTo(
      [...steppedPositions.payload.positions],
      [0.25, 0.7019000053405762, 0.25],
    )

    host.handleMessage({
      type: 'RESET',
    })

    const resetPositions = postMessage.mock.calls[4]?.[0]

    if (resetPositions?.type !== 'POSITIONS') {
      throw new Error('Expected a POSITIONS response after RESET.')
    }

    expectBufferCloseTo(
      [...resetPositions.payload.positions],
      [0.25, 0.8, 0.25],
    )
  })

  it('starts and pauses the run loop', () => {
    const postMessage =
      vi.fn<
        (message: SimulationWorkerResponse, transfer?: Transferable[]) => void
      >()
    const host = new SimulationWorkerHost(postMessage)

    host.handleMessage({
      payload: {
        params: {
          gravity: [0, 0, 0],
          particleMass: 0,
          viscosity: 0,
        },
        positions: [[0.1, 0.1, 0.1]],
      },
      type: 'INIT',
    })

    host.handleMessage({
      payload: {
        dt: 0.05,
      },
      type: 'START',
    })

    const runningReady = postMessage.mock.calls[2]?.[0]

    expect(runningReady).toEqual({
      payload: {
        initialized: true,
        running: true,
      },
      type: 'READY',
    })

    vi.advanceTimersByTime(50)

    const startedStep = postMessage.mock.calls[3]?.[0]
    expect(startedStep?.type).toBe('POSITIONS')

    host.handleMessage({
      type: 'PAUSE',
    })

    const pausedReady = postMessage.mock.calls.at(-1)?.[0]
    expect(pausedReady).toEqual({
      payload: {
        initialized: true,
        running: false,
      },
      type: 'READY',
    })
  })

  it('emits errors for invalid control flow', () => {
    const postMessage =
      vi.fn<
        (message: SimulationWorkerResponse, transfer?: Transferable[]) => void
      >()
    const host = new SimulationWorkerHost(postMessage)

    host.handleMessage({
      payload: {
        dt: 0.1,
      },
      type: 'STEP',
    })

    expect(postMessage).toHaveBeenCalledWith({
      payload: {
        message: 'Simulation worker has not been initialized yet.',
      },
      type: 'ERROR',
    })
  })
})
