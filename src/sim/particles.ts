import type { Vec3 } from '@/sim/kernels'

export interface Particle {
  readonly index: number
  readonly position: Float32Array
  readonly velocity: Float32Array
  readonly force: Float32Array
  density: number
  pressure: number
}

export interface SimParams {
  readonly smoothingLength: number
  readonly particleMass: number
  readonly restDensity: number
  readonly gasConstant: number
  readonly viscosity: number
  readonly gravity: Vec3
  readonly timeStep: number
  readonly boundaryDamping: number
  readonly containerSize: Vec3
}

export const defaultSimParams: SimParams = {
  boundaryDamping: -0.5,
  containerSize: [4.5, 3, 4.5],
  gasConstant: 2000,
  gravity: [0, -9.81, 0],
  particleMass: 0.02,
  restDensity: 1000,
  smoothingLength: 0.25,
  timeStep: 1 / 120,
  viscosity: 0.1,
}

function createOutOfRangeError(index: number, count: number): RangeError {
  return new RangeError(
    `Particle index ${String(index)} is out of bounds for a buffer of ${String(count)} particles.`,
  )
}

export class ParticleBuffer {
  private _activeCount: number

  readonly count: number

  readonly positions: Float32Array

  readonly velocities: Float32Array

  readonly forces: Float32Array

  readonly densities: Float32Array

  readonly pressures: Float32Array

  constructor(count: number) {
    if (!Number.isInteger(count) || count < 0) {
      throw new RangeError(
        `ParticleBuffer count must be a non-negative integer. Received: ${String(count)}.`,
      )
    }

    this.count = count
    this._activeCount = count
    this.positions = new Float32Array(count * 3)
    this.velocities = new Float32Array(count * 3)
    this.forces = new Float32Array(count * 3)
    this.densities = new Float32Array(count)
    this.pressures = new Float32Array(count)
  }

  clear(): void {
    this._activeCount = 0
    this.positions.fill(0)
    this.velocities.fill(0)
    this.forces.fill(0)
    this.densities.fill(0)
    this.pressures.fill(0)
  }

  getParticle(index: number): Particle {
    this.assertIndex(index)
    const position = this.vectorView(this.positions, index)
    const velocity = this.vectorView(this.velocities, index)
    const force = this.vectorView(this.forces, index)
    const densities = this.densities
    const pressures = this.pressures

    return {
      get density() {
        const density = densities[index]

        if (density === undefined) {
          throw createOutOfRangeError(index, densities.length)
        }

        return density
      },
      force,
      index,
      position,
      get pressure() {
        const pressure = pressures[index]

        if (pressure === undefined) {
          throw createOutOfRangeError(index, pressures.length)
        }

        return pressure
      },
      velocity,
      set density(value: number) {
        densities[index] = value
      },
      set pressure(value: number) {
        pressures[index] = value
      },
    }
  }

  setDensity(index: number, density: number): void {
    this.assertIndex(index)
    this.densities[index] = density
  }

  setForce(index: number, force: Vec3): void {
    this.setVector(this.forces, index, force)
  }

  setPosition(index: number, position: Vec3): void {
    this.setVector(this.positions, index, position)
  }

  setPressure(index: number, pressure: number): void {
    this.assertIndex(index)
    this.pressures[index] = pressure
  }

  setVelocity(index: number, velocity: Vec3): void {
    this.setVector(this.velocities, index, velocity)
  }

  setActiveCount(activeCount: number): void {
    if (
      !Number.isInteger(activeCount) ||
      activeCount < 0 ||
      activeCount > this.count
    ) {
      throw new RangeError(
        `ParticleBuffer activeCount must be an integer between 0 and ${String(this.count)}. Received: ${String(activeCount)}.`,
      )
    }

    this._activeCount = activeCount
  }

  get activeCount(): number {
    return this._activeCount
  }

  private assertIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) {
      throw createOutOfRangeError(index, this.count)
    }
  }

  private setVector(buffer: Float32Array, index: number, value: Vec3): void {
    this.assertIndex(index)

    const offset = index * 3
    buffer[offset] = value[0]
    buffer[offset + 1] = value[1]
    buffer[offset + 2] = value[2]
  }

  private vectorView(buffer: Float32Array, index: number): Float32Array {
    const offset = index * 3
    return buffer.subarray(offset, offset + 3)
  }
}
