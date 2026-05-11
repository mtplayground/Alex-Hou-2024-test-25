import { computeDensityPressure } from '@/sim/densityPressure'
import { accumulateForces } from '@/sim/forces'
import { integrateParticles, type BoxObstacle } from '@/sim/integrator'
import { type Vec3 } from '@/sim/kernels'
import {
  defaultSimParams,
  ParticleBuffer,
  type SimParams,
} from '@/sim/particles'

export interface SimulationInit {
  readonly params?: Partial<SimParams>
  readonly obstacles?: readonly BoxObstacle[]
  readonly positions: readonly Vec3[]
  readonly velocities?: readonly Vec3[]
}

function cloneVectorList(vectors: readonly Vec3[]): Vec3[] {
  return vectors.map((vector) => [vector[0], vector[1], vector[2]])
}

function mergeSimParams(overrides?: Partial<SimParams>): SimParams {
  return {
    ...defaultSimParams,
    ...overrides,
    containerSize: overrides?.containerSize ?? defaultSimParams.containerSize,
    gravity: overrides?.gravity ?? defaultSimParams.gravity,
  }
}

function cloneObstacles(
  obstacles: readonly BoxObstacle[],
): readonly BoxObstacle[] {
  return obstacles.map((obstacle) => ({
    center: [...obstacle.center] as Vec3,
    size: [...obstacle.size] as Vec3,
  }))
}

function assertInitialized<T>(value: T | null, name: string): T {
  if (value === null) {
    throw new Error(`Simulation ${name} is not initialized. Call init() first.`)
  }

  return value
}

function buildVelocitySnapshot(
  count: number,
  velocities?: readonly Vec3[],
): Vec3[] {
  if (!velocities) {
    return Array.from({ length: count }, () => [0, 0, 0] as Vec3)
  }

  if (velocities.length !== count) {
    throw new RangeError(
      'Simulation velocities must match the number of initial positions.',
    )
  }

  return cloneVectorList(velocities)
}

export class Simulation {
  private initialObstacles: readonly BoxObstacle[] = []

  private initialPositions: Vec3[] | null = null

  private initialVelocities: Vec3[] | null = null

  private params: SimParams | null = null

  private particles: ParticleBuffer | null = null

  init(config: SimulationInit): void {
    if (config.positions.length === 0) {
      throw new RangeError(
        'Simulation requires at least one particle position to initialize.',
      )
    }

    const params = mergeSimParams(config.params)
    const positions = cloneVectorList(config.positions)
    const velocities = buildVelocitySnapshot(
      positions.length,
      config.velocities,
    )
    const particles = new ParticleBuffer(positions.length)

    positions.forEach((position, index) => {
      particles.setPosition(index, position)
      particles.setVelocity(index, velocities[index] ?? [0, 0, 0])
      particles.setForce(index, [0, 0, 0])
      particles.setDensity(index, 0)
      particles.setPressure(index, 0)
    })

    this.params = params
    this.initialPositions = positions
    this.initialVelocities = velocities
    this.initialObstacles = config.obstacles
      ? cloneObstacles(config.obstacles)
      : []
    this.particles = particles
  }

  get positions(): Float32Array {
    return new Float32Array(
      assertInitialized(this.particles, 'particle buffer').positions,
    )
  }

  get simulationParams(): SimParams {
    return {
      ...assertInitialized(this.params, 'params'),
    }
  }

  reset(): void {
    const particles = assertInitialized(this.particles, 'particle buffer')
    const initialPositions = assertInitialized(
      this.initialPositions,
      'initial positions',
    )
    const initialVelocities = assertInitialized(
      this.initialVelocities,
      'initial velocities',
    )

    particles.clear()

    initialPositions.forEach((position, index) => {
      particles.setPosition(index, position)
      particles.setVelocity(index, initialVelocities[index] ?? [0, 0, 0])
    })
  }

  step(dt: number): void {
    const particles = assertInitialized(this.particles, 'particle buffer')
    const params = assertInitialized(this.params, 'params')

    if (dt < 0) {
      throw new RangeError('Simulation step dt must be non-negative.')
    }

    const stepParams: SimParams = {
      ...params,
      timeStep: dt,
    }

    computeDensityPressure(particles, stepParams)
    accumulateForces(particles, stepParams)
    integrateParticles(particles, stepParams, this.initialObstacles)
  }

  updateParams(overrides: Partial<SimParams>): void {
    const params = assertInitialized(this.params, 'params')
    this.params = mergeSimParams({
      ...params,
      ...overrides,
    })
  }

  updateObstacles(obstacles: readonly BoxObstacle[]): void {
    assertInitialized(this.particles, 'particle buffer')
    this.initialObstacles = cloneObstacles(obstacles)
  }
}
