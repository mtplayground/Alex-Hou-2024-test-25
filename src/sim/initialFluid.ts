import type { SimParams } from '@/sim/particles'
import type { InitialFluidBlock } from '@/types/scene'

const DEFAULT_JITTER_RATIO = 0.08

type AxisKey = 'x' | 'y' | 'z'

interface AxisLayout {
  count: number
  offset: number
}

function hashCoordinate(
  x: number,
  y: number,
  z: number,
  axis: AxisKey,
): number {
  const axisOffset = axis === 'x' ? 0x9e37 : axis === 'y' ? 0x85eb : 0xc2b2
  let hash = ((x + 1) * 73856093) ^ ((y + 1) * 19349663) ^ ((z + 1) * 83492791)
  hash ^= axisOffset
  hash = Math.imul(hash ^ (hash >>> 16), 2246822519)
  hash ^= hash >>> 13
  hash = Math.imul(hash, 3266489917)
  hash ^= hash >>> 16
  return (hash >>> 0) / 4294967295
}

function resolveSpacing(params: SimParams): number {
  const spacing = params.smoothingLength * 0.5

  if (!Number.isFinite(spacing) || spacing <= 0) {
    throw new RangeError(
      `Initial fluid spacing must be positive. Received smoothingLength=${String(params.smoothingLength)}.`,
    )
  }

  return spacing
}

function createAxisLayout(size: number, spacing: number): AxisLayout {
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError(
      `Initial fluid block dimensions must be positive. Received size=${String(size)}.`,
    )
  }

  const count = Math.max(1, Math.floor(size / spacing))

  if (count === 1) {
    return {
      count,
      offset: size * 0.5,
    }
  }

  const usedSpan = (count - 1) * spacing
  return {
    count,
    offset: (size - usedSpan) * 0.5,
  }
}

function resolveJitter(
  axisValue: number,
  axisMin: number,
  axisMax: number,
  spacing: number,
  x: number,
  y: number,
  z: number,
  axis: AxisKey,
): number {
  const maxJitter = Math.min(
    spacing * DEFAULT_JITTER_RATIO,
    axisValue - axisMin,
    axisMax - axisValue,
  )

  if (maxJitter <= 0) {
    return axisValue
  }

  const signedNoise = hashCoordinate(x, y, z, axis) * 2 - 1
  return axisValue + signedNoise * maxJitter
}

export function buildInitialFluidBlockPositions(
  block: InitialFluidBlock,
  params: SimParams,
): [number, number, number][] {
  const spacing = resolveSpacing(params)
  const xLayout = createAxisLayout(block.size[0], spacing)
  const yLayout = createAxisLayout(block.size[1], spacing)
  const zLayout = createAxisLayout(block.size[2], spacing)
  const [originX, originY, originZ] = block.origin
  const maxX = originX + block.size[0]
  const maxY = originY + block.size[1]
  const maxZ = originZ + block.size[2]
  const positions: [number, number, number][] = []

  for (let y = 0; y < yLayout.count; y += 1) {
    for (let z = 0; z < zLayout.count; z += 1) {
      for (let x = 0; x < xLayout.count; x += 1) {
        const baseX = originX + xLayout.offset + x * spacing
        const baseY = originY + yLayout.offset + y * spacing
        const baseZ = originZ + zLayout.offset + z * spacing

        positions.push([
          resolveJitter(baseX, originX, maxX, spacing, x, y, z, 'x'),
          resolveJitter(baseY, originY, maxY, spacing, x, y, z, 'y'),
          resolveJitter(baseZ, originZ, maxZ, spacing, x, y, z, 'z'),
        ])
      }
    }
  }

  return positions
}
