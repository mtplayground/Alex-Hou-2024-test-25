import { poly6Kernel, type Vec3 } from '@/sim/kernels'
import { type ParticleBuffer, type SimParams } from '@/sim/particles'
import { SpatialHashGrid } from '@/sim/spatialHashGrid'

function readPosition(buffer: ParticleBuffer, index: number): Vec3 {
  const offset = index * 3
  const x = buffer.positions[offset]
  const y = buffer.positions[offset + 1]
  const z = buffer.positions[offset + 2]

  if (x === undefined || y === undefined || z === undefined) {
    throw new RangeError(
      `Particle index ${String(index)} is out of bounds for a buffer of ${String(buffer.count)} particles.`,
    )
  }

  return [x, y, z]
}

function distanceBetween(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

function validateSimParams(params: SimParams): void {
  if (params.smoothingLength <= 0) {
    throw new RangeError('SimParams smoothingLength must be greater than zero.')
  }

  if (params.particleMass < 0) {
    throw new RangeError('SimParams particleMass must be non-negative.')
  }
}

export function computeDensityPressure(
  particles: ParticleBuffer,
  params: SimParams,
): void {
  validateSimParams(params)

  const grid = new SpatialHashGrid(params.smoothingLength)
  const positions = Array.from({ length: particles.count }, (_value, index) =>
    readPosition(particles, index),
  )

  grid.rebuild(positions)

  for (let index = 0; index < particles.count; index += 1) {
    const position = positions[index]

    if (position === undefined) {
      throw new RangeError(
        `Particle index ${String(index)} is out of bounds for a buffer of ${String(particles.count)} particles.`,
      )
    }

    let density = 0

    grid.query(position).forEach((neighborIndex) => {
      const neighborPosition = positions[neighborIndex]

      if (neighborPosition === undefined) {
        return
      }

      const distance = distanceBetween(position, neighborPosition)
      density +=
        params.particleMass * poly6Kernel(distance, params.smoothingLength)
    })

    particles.setDensity(index, density)
    particles.setPressure(
      index,
      params.gasConstant * (density - params.restDensity),
    )
  }
}
