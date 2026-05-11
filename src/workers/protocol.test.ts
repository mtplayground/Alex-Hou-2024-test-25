import { describe, expect, it } from 'vitest'
import {
  createPositionsMessage,
  positionsTransferList,
  type SimulationWorkerRequest,
} from '@/workers/protocol'

describe('worker protocol', () => {
  it('defines transferable position messages around Float32Array buffers', () => {
    const positions = new Float32Array([1, 2, 3, 4, 5, 6])
    const message = createPositionsMessage(positions)
    const transferList = positionsTransferList(message)

    expect(message.type).toBe('POSITIONS')
    expect(message.payload.positions).toBe(positions)
    expect(transferList).toEqual([positions.buffer])
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
})
