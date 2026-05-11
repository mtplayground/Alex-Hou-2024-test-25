import type { Vec3 } from '@/sim/kernels'

function distanceBetween(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

function floorToCell(value: number, cellSize: number): number {
  return Math.floor(value / cellSize)
}

export class SpatialHashGrid {
  private readonly cellSize: number

  private readonly cells = new Map<string, number[]>()

  private readonly points = new Map<number, Vec3>()

  constructor(cellSize: number) {
    if (cellSize <= 0) {
      throw new Error('SpatialHashGrid cellSize must be greater than zero.')
    }

    this.cellSize = cellSize
  }

  clear(): void {
    this.cells.clear()
    this.points.clear()
  }

  rebuild(points: readonly Vec3[]): void {
    this.clear()

    points.forEach((point, index) => {
      this.insert(index, point)
    })
  }

  insert(index: number, point: Vec3): void {
    this.points.set(index, point)
    const key = this.getCellKey(point)
    const bucket = this.cells.get(key)

    if (bucket) {
      bucket.push(index)
      return
    }

    this.cells.set(key, [index])
  }

  query(point: Vec3): number[] {
    const [cellX, cellY, cellZ] = this.toCellCoordinates(point)
    const matches = new Set<number>()

    for (let x = cellX - 1; x <= cellX + 1; x += 1) {
      for (let y = cellY - 1; y <= cellY + 1; y += 1) {
        for (let z = cellZ - 1; z <= cellZ + 1; z += 1) {
          const bucket = this.cells.get(this.hashCell(x, y, z))

          if (!bucket) {
            continue
          }

          bucket.forEach((index) => {
            matches.add(index)
          })
        }
      }
    }

    return [...matches]
  }

  findNeighbors(
    point: Vec3,
    smoothingRadius: number,
    excludeIndex?: number,
  ): number[] {
    if (smoothingRadius < 0) {
      return []
    }

    return this.query(point).filter((index) => {
      if (excludeIndex !== undefined && index === excludeIndex) {
        return false
      }

      const candidate = this.points.get(index)

      if (!candidate) {
        return false
      }

      return distanceBetween(point, candidate) <= smoothingRadius
    })
  }

  private getCellKey(point: Vec3): string {
    const [x, y, z] = this.toCellCoordinates(point)
    return this.hashCell(x, y, z)
  }

  private hashCell(x: number, y: number, z: number): string {
    return [x, y, z].map(String).join(',')
  }

  private toCellCoordinates(point: Vec3): [number, number, number] {
    return [
      floorToCell(point[0], this.cellSize),
      floorToCell(point[1], this.cellSize),
      floorToCell(point[2], this.cellSize),
    ]
  }
}
