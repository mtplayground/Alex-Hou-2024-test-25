import { computeDensityPressure } from '@/sim/densityPressure'
import { accumulateForces } from '@/sim/forces'
import { integrateParticles, type BoxObstacle } from '@/sim/integrator'
import { type Vec3 } from '@/sim/kernels'
import {
  defaultSimParams,
  ParticleBuffer,
  type SimParams,
} from '@/sim/particles'

export interface SimulationEmitter {
  readonly cap: number
  readonly position: Vec3
  readonly rate: number
  readonly velocity: Vec3
}

export interface SimulationFrameSnapshot {
  readonly densities: Float32Array
  readonly positions: Float32Array
  readonly pressures: Float32Array
  readonly speeds: Float32Array
}

export interface SimulationInit {
  readonly emitter?: SimulationEmitter
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

function cloneEmitter(emitter: SimulationEmitter): SimulationEmitter {
  return {
    cap: emitter.cap,
    position: [...emitter.position] as Vec3,
    rate: emitter.rate,
    velocity: [...emitter.velocity] as Vec3,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export class Simulation {
  private emissionAccumulator = 0

  private emitter: SimulationEmitter | null = null

  private elapsedTime = 0

  private emittedParticleCount = 0

  private initialObstacles: readonly BoxObstacle[] = []

  private initialPositions: Vec3[] | null = null

  private initialVelocities: Vec3[] | null = null

  private params: SimParams | null = null

  private particles: ParticleBuffer | null = null

  init(config: SimulationInit): void {
    if (config.positions.length === 0 && config.emitter === undefined) {
      throw new RangeError(
        'Simulation requires at least one particle position or an emitter to initialize.',
      )
    }

    const params = mergeSimParams(config.params)
    const positions = cloneVectorList(config.positions)
    const velocities = buildVelocitySnapshot(
      positions.length,
      config.velocities,
    )
    const emitter = config.emitter ? cloneEmitter(config.emitter) : null

    if (emitter !== null) {
      if (!Number.isInteger(emitter.cap) || emitter.cap <= 0) {
        throw new RangeError(
          'Simulation emitter cap must be a positive integer.',
        )
      }

      if (emitter.rate < 0) {
        throw new RangeError('Simulation emitter rate must be non-negative.')
      }
    }

    const particles = new ParticleBuffer(
      Math.max(positions.length, emitter?.cap ?? 0),
    )
    particles.clear()

    positions.forEach((position, index) => {
      particles.setPosition(index, position)
      particles.setVelocity(index, velocities[index] ?? [0, 0, 0])
      particles.setForce(index, [0, 0, 0])
      particles.setDensity(index, 0)
      particles.setPressure(index, 0)
    })
    particles.setActiveCount(positions.length)

    this.params = params
    this.elapsedTime = 0
    this.emissionAccumulator = 0
    this.emittedParticleCount = 0
    this.emitter = emitter
    this.initialPositions = positions
    this.initialVelocities = velocities
    this.initialObstacles = config.obstacles
      ? cloneObstacles(config.obstacles)
      : []
    this.particles = particles
  }

  get positions(): Float32Array {
    const particles = assertInitialized(this.particles, 'particle buffer')
    return new Float32Array(
      particles.positions.subarray(0, particles.activeCount * 3),
    )
  }

  get frame(): SimulationFrameSnapshot {
    const particles = assertInitialized(this.particles, 'particle buffer')
    const activeCount = particles.activeCount
    const speeds = new Float32Array(activeCount)

    for (let index = 0; index < activeCount; index += 1) {
      const offset = index * 3
      const x = particles.velocities[offset] ?? 0
      const y = particles.velocities[offset + 1] ?? 0
      const z = particles.velocities[offset + 2] ?? 0
      speeds[index] = Math.hypot(x, y, z)
    }

    return {
      densities: new Float32Array(particles.densities.subarray(0, activeCount)),
      positions: new Float32Array(
        particles.positions.subarray(0, activeCount * 3),
      ),
      pressures: new Float32Array(particles.pressures.subarray(0, activeCount)),
      speeds,
    }
  }

  get simulationParams(): SimParams {
    return {
      ...assertInitialized(this.params, 'params'),
    }
  }

  get particleCount(): number {
    return assertInitialized(this.particles, 'particle buffer').activeCount
  }

  get simTime(): number {
    assertInitialized(this.particles, 'particle buffer')
    return this.elapsedTime
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
      particles.setForce(index, [0, 0, 0])
      particles.setDensity(index, 0)
      particles.setPressure(index, 0)
    })
    particles.setActiveCount(initialPositions.length)
    this.elapsedTime = 0
    this.emissionAccumulator = 0
    this.emittedParticleCount = 0
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

    this.emitParticles(stepParams)
    computeDensityPressure(particles, stepParams)
    accumulateForces(particles, stepParams)
    integrateParticles(particles, stepParams, this.initialObstacles)
    this.elapsedTime += dt
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

  private emitParticles(params: SimParams): void {
    const emitter = this.emitter
    const particles = assertInitialized(this.particles, 'particle buffer')

    if (
      emitter === null ||
      emitter.rate === 0 ||
      particles.activeCount >= emitter.cap
    ) {
      return
    }

    this.emissionAccumulator += emitter.rate * params.timeStep
    const availableSlots = emitter.cap - particles.activeCount
    const nextBurstCount = Math.min(
      Math.floor(this.emissionAccumulator),
      availableSlots,
    )

    if (nextBurstCount <= 0) {
      return
    }

    for (let index = 0; index < nextBurstCount; index += 1) {
      const particleIndex = particles.activeCount + index
      const spawnSerial = this.emittedParticleCount + index
      const jitterRadius = params.smoothingLength * 0.08
      const offset = this.resolveEmitterJitter(spawnSerial, jitterRadius)
      const position: Vec3 = [
        clamp(emitter.position[0] + offset[0], 0, params.containerSize[0]),
        clamp(emitter.position[1] + offset[1], 0, params.containerSize[1]),
        clamp(emitter.position[2] + offset[2], 0, params.containerSize[2]),
      ]

      particles.setPosition(particleIndex, position)
      particles.setVelocity(particleIndex, emitter.velocity)
      particles.setForce(particleIndex, [0, 0, 0])
      particles.setDensity(particleIndex, 0)
      particles.setPressure(particleIndex, 0)
    }

    particles.setActiveCount(particles.activeCount + nextBurstCount)
    this.emittedParticleCount += nextBurstCount
    this.emissionAccumulator -= nextBurstCount
  }

  private resolveEmitterJitter(index: number, radius: number): Vec3 {
    if (radius <= 0) {
      return [0, 0, 0]
    }

    const sample = (seed: number) => {
      const normalized = Math.sin((index + 1) * seed) * 43758.5453123
      return (normalized - Math.floor(normalized)) * 2 - 1
    }

    return [
      sample(12.9898) * radius,
      sample(78.233) * radius,
      sample(39.425) * radius,
    ]
  }
}
