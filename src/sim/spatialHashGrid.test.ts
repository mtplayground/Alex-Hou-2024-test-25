import { describe, expect, it } from 'vitest'
import { SpatialHashGrid } from '@/sim/spatialHashGrid'

describe('SpatialHashGrid', () => {
  it('queries indices from the current and adjacent cells', () => {
    const grid = new SpatialHashGrid(1)
    grid.insert(0, [0.1, 0.1, 0.1])
    grid.insert(1, [0.9, 0.2, 0.1])
    grid.insert(2, [1.05, 0.1, 0.2])
    grid.insert(3, [2.6, 0.1, 0.1])

    expect(grid.query([0.2, 0.2, 0.2]).sort((a, b) => a - b)).toEqual([0, 1, 2])
  })

  it('finds only neighbors within the smoothing radius', () => {
    const grid = new SpatialHashGrid(1)
    const pointA: readonly [number, number, number] = [0, 0, 0]
    const pointB: readonly [number, number, number] = [0.5, 0, 0]
    const pointC: readonly [number, number, number] = [1.4, 0, 0]
    const pointD: readonly [number, number, number] = [0, 1.1, 0]
    const points = [pointA, pointB, pointC, pointD]
    grid.rebuild(points)

    expect(grid.findNeighbors(pointA, 1, 0).sort((a, b) => a - b)).toEqual([1])
    expect(grid.findNeighbors(pointC, 1, 2).sort((a, b) => a - b)).toEqual([1])
  })

  it('rebuilds from a new point set and drops old buckets', () => {
    const grid = new SpatialHashGrid(1)
    grid.insert(0, [0, 0, 0])
    grid.insert(1, [0.5, 0.5, 0.5])

    grid.rebuild([
      [3, 3, 3],
      [3.4, 3.2, 3.1],
    ])

    expect(grid.query([0, 0, 0])).toEqual([])
    expect(grid.findNeighbors([3, 3, 3], 0.6).sort((a, b) => a - b)).toEqual([
      0, 1,
    ])
  })
})
