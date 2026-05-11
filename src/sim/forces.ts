import { spikyGradient, viscosityLaplacian, type Vec3 } from '@/sim/kernels'
import { type ParticleBuffer, type SimParams } from '@/sim/particles'
import { SpatialHashGrid } from '@/sim/spatialHashGrid'

function createOutOfRangeError(index: number, count: number): RangeError {
  return new RangeError(
    `Particle index ${String(index)} is out of bounds for a buffer of ${String(count)} particles.`,
  )
}

function readScalar(
  buffer: Float32Array,
  index: number,
  count: number,
): number {
  const value = buffer[index]

  if (value === undefined) {
    throw createOutOfRangeError(index, count)
  }

  return value
}

function readVector(buffer: Float32Array, index: number, count: number): Vec3 {
  const offset = index * 3
  const x = buffer[offset]
  const y = buffer[offset + 1]
  const z = buffer[offset + 2]

  if (x === undefined || y === undefined || z === undefined) {
    throw createOutOfRangeError(index, count)
  }

  return [x, y, z]
}

function subtractVectors(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function addVectors(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function scaleVector(vector: Vec3, scalar: number): Vec3 {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar]
}

function distanceOf(vector: Vec3): number {
  return Math.hypot(vector[0], vector[1], vector[2])
}

function validateSimParams(params: SimParams): void {
  if (params.smoothingLength <= 0) {
    throw new RangeError('SimParams smoothingLength must be greater than zero.')
  }

  if (params.particleMass < 0) {
    throw new RangeError('SimParams particleMass must be non-negative.')
  }

  if (params.viscosity < 0) {
    throw new RangeError('SimParams viscosity must be non-negative.')
  }
}

export function accumulateForces(
  particles: ParticleBuffer,
  params: SimParams,
): void {
  validateSimParams(params)

  const positions = Array.from({ length: particles.count }, (_value, index) =>
    readVector(particles.positions, index, particles.count),
  )
  const velocities = Array.from({ length: particles.count }, (_value, index) =>
    readVector(particles.velocities, index, particles.count),
  )

  const grid = new SpatialHashGrid(params.smoothingLength)
  grid.rebuild(positions)

  for (let index = 0; index < particles.count; index += 1) {
    const position = positions[index]
    const velocity = velocities[index]

    if (position === undefined || velocity === undefined) {
      throw createOutOfRangeError(index, particles.count)
    }

    const density = readScalar(particles.densities, index, particles.count)
    const pressure = readScalar(particles.pressures, index, particles.count)

    let totalForce = scaleVector(params.gravity, density)

    grid.query(position).forEach((neighborIndex) => {
      if (neighborIndex === index) {
        return
      }

      const neighborPosition = positions[neighborIndex]
      const neighborVelocity = velocities[neighborIndex]

      if (neighborPosition === undefined || neighborVelocity === undefined) {
        return
      }

      const neighborDensity = readScalar(
        particles.densities,
        neighborIndex,
        particles.count,
      )

      if (neighborDensity <= 0) {
        return
      }

      const neighborPressure = readScalar(
        particles.pressures,
        neighborIndex,
        particles.count,
      )
      const offset = subtractVectors(position, neighborPosition)
      const distance = distanceOf(offset)

      if (distance <= 0 || distance > params.smoothingLength) {
        return
      }

      const pressureContribution = scaleVector(
        spikyGradient(offset, params.smoothingLength),
        (-params.particleMass * (pressure + neighborPressure)) /
          (2 * neighborDensity),
      )
      const viscosityContribution = scaleVector(
        subtractVectors(neighborVelocity, velocity),
        (params.viscosity *
          params.particleMass *
          viscosityLaplacian(distance, params.smoothingLength)) /
          neighborDensity,
      )

      totalForce = addVectors(
        totalForce,
        addVectors(pressureContribution, viscosityContribution),
      )
    })

    particles.setForce(index, totalForce)
  }
}
