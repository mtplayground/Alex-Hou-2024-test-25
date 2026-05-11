import type { Vec3 } from '@/sim/kernels'
import { type ParticleBuffer, type SimParams } from '@/sim/particles'

export interface BoxObstacle {
  readonly center: Vec3
  readonly size: Vec3
}

type Axis = 0 | 1 | 2

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

function scaleVector(vector: Vec3, scalar: number): Vec3 {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar]
}

function addVectors(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function validateSimParams(params: SimParams): void {
  if (params.timeStep < 0) {
    throw new RangeError('SimParams timeStep must be non-negative.')
  }

  if (params.containerSize.some((axis) => axis <= 0)) {
    throw new RangeError(
      'SimParams containerSize axes must all be greater than zero.',
    )
  }
}

function resolveContainerCollision(
  position: Vec3,
  velocity: Vec3,
  params: SimParams,
): { position: Vec3; velocity: Vec3 } {
  const nextPosition = [...position] as [number, number, number]
  const nextVelocity = [...velocity] as [number, number, number]

  ;([0, 1, 2] as const).forEach((axis) => {
    const limit = params.containerSize[axis]

    if (nextPosition[axis] < 0) {
      nextPosition[axis] = 0

      if (nextVelocity[axis] < 0) {
        nextVelocity[axis] *= params.boundaryDamping
      }
    }

    if (nextPosition[axis] > limit) {
      nextPosition[axis] = limit

      if (nextVelocity[axis] > 0) {
        nextVelocity[axis] *= params.boundaryDamping
      }
    }
  })

  return { position: nextPosition, velocity: nextVelocity }
}

function obstacleBounds(obstacle: BoxObstacle): {
  min: Vec3
  max: Vec3
} {
  const halfSize = scaleVector(obstacle.size, 0.5)

  return {
    max: addVectors(obstacle.center, halfSize),
    min: [
      obstacle.center[0] - halfSize[0],
      obstacle.center[1] - halfSize[1],
      obstacle.center[2] - halfSize[2],
    ],
  }
}

function resolveObstacleCollision(
  previousPosition: Vec3,
  position: Vec3,
  velocity: Vec3,
  obstacle: BoxObstacle,
  damping: number,
): { position: Vec3; velocity: Vec3 } {
  const { min, max } = obstacleBounds(obstacle)

  if (
    position[0] < min[0] ||
    position[0] > max[0] ||
    position[1] < min[1] ||
    position[1] > max[1] ||
    position[2] < min[2] ||
    position[2] > max[2]
  ) {
    return { position, velocity }
  }

  const distances = [
    {
      axis: 0 as Axis,
      boundary: min[0],
      normal: -1,
      penetration: position[0] - min[0],
    },
    {
      axis: 0 as Axis,
      boundary: max[0],
      normal: 1,
      penetration: max[0] - position[0],
    },
    {
      axis: 1 as Axis,
      boundary: min[1],
      normal: -1,
      penetration: position[1] - min[1],
    },
    {
      axis: 1 as Axis,
      boundary: max[1],
      normal: 1,
      penetration: max[1] - position[1],
    },
    {
      axis: 2 as Axis,
      boundary: min[2],
      normal: -1,
      penetration: position[2] - min[2],
    },
    {
      axis: 2 as Axis,
      boundary: max[2],
      normal: 1,
      penetration: max[2] - position[2],
    },
  ]
  const entryFaces = distances.filter((candidate) => {
    if (candidate.normal < 0) {
      return previousPosition[candidate.axis] <= candidate.boundary
    }

    return previousPosition[candidate.axis] >= candidate.boundary
  })
  const nearestFace = (entryFaces.length > 0 ? entryFaces : distances).reduce(
    (closest, candidate) => {
      return candidate.penetration < closest.penetration ? candidate : closest
    },
  )
  const nextPosition = [...position] as [number, number, number]
  const nextVelocity = [...velocity] as [number, number, number]

  nextPosition[nearestFace.axis] = nearestFace.boundary

  if (nextVelocity[nearestFace.axis] * nearestFace.normal < 0) {
    nextVelocity[nearestFace.axis] *= damping
  }

  return { position: nextPosition, velocity: nextVelocity }
}

export function integrateParticles(
  particles: ParticleBuffer,
  params: SimParams,
  obstacles: readonly BoxObstacle[] = [],
): void {
  validateSimParams(params)

  for (let index = 0; index < particles.activeCount; index += 1) {
    const position = readVector(
      particles.positions,
      index,
      particles.activeCount,
    )
    const velocity = readVector(
      particles.velocities,
      index,
      particles.activeCount,
    )
    const force = readVector(particles.forces, index, particles.activeCount)
    const density = readScalar(
      particles.densities,
      index,
      particles.activeCount,
    )
    const acceleration =
      density > 0 ? scaleVector(force, 1 / density) : params.gravity
    const nextVelocity = addVectors(
      velocity,
      scaleVector(acceleration, params.timeStep),
    )
    let nextPosition = addVectors(
      position,
      scaleVector(nextVelocity, params.timeStep),
    )
    let resolvedVelocity = nextVelocity

    const containerResolved = resolveContainerCollision(
      nextPosition,
      resolvedVelocity,
      params,
    )
    nextPosition = containerResolved.position
    resolvedVelocity = containerResolved.velocity

    obstacles.forEach((obstacle) => {
      const resolved = resolveObstacleCollision(
        position,
        nextPosition,
        resolvedVelocity,
        obstacle,
        params.boundaryDamping,
      )

      nextPosition = resolved.position
      resolvedVelocity = resolved.velocity
    })

    particles.setVelocity(index, resolvedVelocity)
    particles.setPosition(index, [
      clamp(nextPosition[0], 0, params.containerSize[0]),
      clamp(nextPosition[1], 0, params.containerSize[1]),
      clamp(nextPosition[2], 0, params.containerSize[2]),
    ])
  }
}
