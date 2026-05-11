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
    const initStats = postMessage.mock.calls[2]?.[0]
    const steppedPositions = postMessage.mock.calls[3]?.[0]
    const steppedTransfer = postMessage.mock.calls[3]?.[1]
    const steppedStats = postMessage.mock.calls[4]?.[0]

    expect(initReady).toEqual({
      payload: {
        initialized: true,
        running: false,
      },
      type: 'READY',
    })
    if (initPositions?.type !== 'POSITIONS') {
      throw new Error('Expected a POSITIONS response after INIT.')
    }

    expect(initPositions.payload.densities).toHaveLength(1)
    expect(initPositions.payload.pressures).toHaveLength(1)
    expect(initPositions.payload.speeds).toHaveLength(1)
    expect(initStats).toEqual({
      payload: {
        particleCount: 1,
        simTime: 0,
        stepRate: 0,
      },
      type: 'STATS',
    })
    expect(steppedPositions?.type).toBe('POSITIONS')
    expect(steppedStats?.type).toBe('STATS')
    expect(steppedTransfer).toEqual([
      (steppedPositions?.type === 'POSITIONS'
        ? steppedPositions.payload.positions.buffer
        : null) as Transferable,
      (steppedPositions?.type === 'POSITIONS'
        ? steppedPositions.payload.speeds.buffer
        : null) as Transferable,
      (steppedPositions?.type === 'POSITIONS'
        ? steppedPositions.payload.densities.buffer
        : null) as Transferable,
      (steppedPositions?.type === 'POSITIONS'
        ? steppedPositions.payload.pressures.buffer
        : null) as Transferable,
    ])

    if (steppedPositions?.type !== 'POSITIONS') {
      throw new Error('Expected a POSITIONS response after STEP.')
    }

    expectBufferCloseTo(
      [...steppedPositions.payload.positions],
      [0.25, 0.7019000053405762, 0.25],
    )
    expect(steppedPositions.payload.speeds).toHaveLength(1)
    expect(steppedPositions.payload.densities).toHaveLength(1)
    expect(steppedPositions.payload.pressures).toHaveLength(1)

    expect(steppedStats).toEqual({
      payload: {
        particleCount: 1,
        simTime: 0.1,
        stepRate: 10,
      },
      type: 'STATS',
    })

    host.handleMessage({
      type: 'RESET',
    })

    const resetPositions = postMessage.mock.calls[6]?.[0]
    const resetStats = postMessage.mock.calls[7]?.[0]

    if (resetPositions?.type !== 'POSITIONS') {
      throw new Error('Expected a POSITIONS response after RESET.')
    }

    expectBufferCloseTo(
      [...resetPositions.payload.positions],
      [0.25, 0.8, 0.25],
    )
    expect(resetStats).toEqual({
      payload: {
        particleCount: 1,
        simTime: 0,
        stepRate: 0,
      },
      type: 'STATS',
    })
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

    const runningReady = postMessage.mock.calls[3]?.[0]

    expect(runningReady).toEqual({
      payload: {
        initialized: true,
        running: true,
      },
      type: 'READY',
    })

    vi.advanceTimersByTime(50)

    const startedStep = postMessage.mock.calls[4]?.[0]
    const startedStats = postMessage.mock.calls[5]?.[0]
    expect(startedStep?.type).toBe('POSITIONS')
    expect(startedStats).toEqual({
      payload: {
        particleCount: 1,
        simTime: 0.05,
        stepRate: 20,
      },
      type: 'STATS',
    })

    host.handleMessage({
      type: 'PAUSE',
    })

    const pausedReady = postMessage.mock.calls.at(-2)?.[0]
    const pausedStats = postMessage.mock.calls.at(-1)?.[0]
    expect(pausedReady).toEqual({
      payload: {
        initialized: true,
        running: false,
      },
      type: 'READY',
    })
    expect(pausedStats).toEqual({
      payload: {
        particleCount: 1,
        simTime: 0.05,
        stepRate: 0,
      },
      type: 'STATS',
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

  it('supports emitter initialization with an empty initial position set', () => {
    const postMessage =
      vi.fn<
        (message: SimulationWorkerResponse, transfer?: Transferable[]) => void
      >()
    const host = new SimulationWorkerHost(postMessage)

    host.handleMessage({
      payload: {
        emitter: {
          cap: 2,
          position: [0.5, 0.8, 0.5],
          rate: 4,
          velocity: [0, -1, 0],
        },
        params: {
          gravity: [0, 0, 0],
          particleMass: 0,
          viscosity: 0,
        },
        positions: [],
      },
      type: 'INIT',
    })

    host.handleMessage({
      payload: {
        dt: 0.25,
      },
      type: 'STEP',
    })

    const initPositions = postMessage.mock.calls[1]?.[0]
    const steppedPositions = postMessage.mock.calls[3]?.[0]
    const steppedStats = postMessage.mock.calls[4]?.[0]

    if (initPositions?.type !== 'POSITIONS') {
      throw new Error('Expected a POSITIONS response after emitter INIT.')
    }

    if (steppedPositions?.type !== 'POSITIONS') {
      throw new Error('Expected a POSITIONS response after emitter STEP.')
    }

    expect(initPositions.payload.positions).toHaveLength(0)
    expect(initPositions.payload.speeds).toHaveLength(0)
    expect(initPositions.payload.densities).toHaveLength(0)
    expect(initPositions.payload.pressures).toHaveLength(0)
    expect(steppedPositions.payload.positions).toHaveLength(3)
    expect(steppedPositions.payload.speeds).toHaveLength(1)
    expect(steppedPositions.payload.densities).toHaveLength(1)
    expect(steppedPositions.payload.pressures).toHaveLength(1)
    expect(steppedStats).toEqual({
      payload: {
        particleCount: 1,
        simTime: 0.25,
        stepRate: 4,
      },
      type: 'STATS',
    })
  })

  it('clamps unsafe params and large dt values before stepping', () => {
    const postMessage =
      vi.fn<
        (message: SimulationWorkerResponse, transfer?: Transferable[]) => void
      >()
    const host = new SimulationWorkerHost(postMessage)

    host.handleMessage({
      payload: {
        params: {
          gravity: [0, -999, 0],
          particleMass: 0,
          timeStep: 99,
          viscosity: 999,
        },
        positions: [[0.1, 0.9, 0.1]],
      },
      type: 'INIT',
    })

    host.handleMessage({
      payload: {
        dt: 999,
      },
      type: 'STEP',
    })

    const steppedStats = postMessage.mock.calls.at(-1)?.[0]

    expect(steppedStats).toEqual({
      payload: {
        particleCount: 1,
        simTime: 0.25,
        stepRate: 4,
      },
      type: 'STATS',
    })
  })
})
