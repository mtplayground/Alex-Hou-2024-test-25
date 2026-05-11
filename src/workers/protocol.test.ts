import { describe, expect, it } from 'vitest'
import {
  createPositionsMessage,
  positionsTransferList,
  type SimulationStatsMessage,
  type SimulationWorkerRequest,
} from '@/workers/protocol'

describe('worker protocol', () => {
  it('defines transferable position messages around Float32Array buffers', () => {
    const positions = new Float32Array([1, 2, 3, 4, 5, 6])
    const speeds = new Float32Array([0.1, 0.2])
    const densities = new Float32Array([900, 950])
    const pressures = new Float32Array([15, 25])
    const message = createPositionsMessage({
      densities,
      positions,
      pressures,
      speeds,
    })
    const transferList = positionsTransferList(message)

    expect(message.type).toBe('POSITIONS')
    expect(message.payload.positions).toBe(positions)
    expect(message.payload.speeds).toBe(speeds)
    expect(message.payload.densities).toBe(densities)
    expect(message.payload.pressures).toBe(pressures)
    expect(transferList).toEqual([
      positions.buffer,
      speeds.buffer,
      densities.buffer,
      pressures.buffer,
    ])
  })

  it('covers the supported request message types', () => {
    const requests: SimulationWorkerRequest[] = [
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
        payload: {
          dt: 1 / 60,
        },
        type: 'STEP',
      },
      {
        payload: {
          params: {
            timeStep: 1 / 120,
          },
        },
        type: 'UPDATE_PARAMS',
      },
      {
        type: 'PAUSE',
      },
      {
        type: 'RESET',
      },
    ]

    expect(requests).toHaveLength(6)
    expect(requests.map((request) => request.type)).toEqual([
      'INIT',
      'START',
      'STEP',
      'UPDATE_PARAMS',
      'PAUSE',
      'RESET',
    ])
  })

  it('defines the simulation stats payload shape', () => {
    const stats: SimulationStatsMessage = {
      payload: {
        particleCount: 128,
        simTime: 1.25,
        stepRate: 60,
      },
      type: 'STATS',
    }

    expect(stats.payload).toEqual({
      particleCount: 128,
      simTime: 1.25,
      stepRate: 60,
    })
  })
})
