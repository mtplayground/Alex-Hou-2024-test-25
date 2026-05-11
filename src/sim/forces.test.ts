import { describe, expect, it } from 'vitest'
import { accumulateForces } from '@/sim/forces'
import { spikyGradient, viscosityLaplacian, type Vec3 } from '@/sim/kernels'
import { ParticleBuffer, type SimParams } from '@/sim/particles'

function scaleVector(vector: Vec3, scalar: number): Vec3 {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar]
}

function addVectors(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function subtractVectors(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

describe('accumulateForces', () => {
  it('sums pressure, viscosity, and gravity into each particle force vector', () => {
    const particles = new ParticleBuffer(3)
    particles.setPosition(0, [0, 0, 0])
    particles.setPosition(1, [0.1, 0, 0])
    particles.setPosition(2, [1, 0, 0])
    particles.setVelocity(0, [1, 0, 0])
    particles.setVelocity(1, [3, 0, 0])
    particles.setVelocity(2, [9, 9, 9])
    particles.setDensity(0, 2)
    particles.setDensity(1, 4)
    particles.setDensity(2, 5)
    particles.setPressure(0, 6)
    particles.setPressure(1, 2)
    particles.setPressure(2, 10)

    const params: SimParams = {
      boundaryDamping: -0.5,
      containerSize: [2, 2, 2],
      gasConstant: 4,
      gravity: [0, -9.81, 0],
      particleMass: 1.5,
      restDensity: 0,
      smoothingLength: 0.2,
      timeStep: 1 / 120,
      viscosity: 0.75,
    }

    accumulateForces(particles, params)

    const offset01: Vec3 = [-0.1, 0, 0]
    const offset10: Vec3 = [0.1, 0, 0]
    const distance = 0.1
    const density0 = 2
    const density1 = 4
    const density2 = 5
    const pressure0 = 6
    const pressure1 = 2
    const gravity0 = scaleVector(params.gravity, density0)
    const gravity1 = scaleVector(params.gravity, density1)
    const gravity2 = scaleVector(params.gravity, density2)
    const pressure01 = scaleVector(
      spikyGradient(offset01, params.smoothingLength),
      (-params.particleMass * (pressure0 + pressure1)) / (2 * density1),
    )
    const pressure10 = scaleVector(
      spikyGradient(offset10, params.smoothingLength),
      (-params.particleMass * (pressure1 + pressure0)) / (2 * density0),
    )
    const viscosity01 = scaleVector(
      subtractVectors([3, 0, 0], [1, 0, 0]),
      (params.viscosity *
        params.particleMass *
        viscosityLaplacian(distance, params.smoothingLength)) /
        density1,
    )
    const viscosity10 = scaleVector(
      subtractVectors([1, 0, 0], [3, 0, 0]),
      (params.viscosity *
        params.particleMass *
        viscosityLaplacian(distance, params.smoothingLength)) /
        density0,
    )
    const expected0 = addVectors(addVectors(gravity0, pressure01), viscosity01)
    const expected1 = addVectors(addVectors(gravity1, pressure10), viscosity10)

    expected0.forEach((component, index) => {
      expect(particles.forces[index]).toBeCloseTo(component, 2)
    })

    expected1.forEach((component, axis) => {
      expect(particles.forces[3 + axis]).toBeCloseTo(component, 2)
    })

    gravity2.forEach((component, axis) => {
      expect(particles.forces[6 + axis]).toBeCloseTo(component, 2)
    })
  })

  it('rejects invalid viscosity', () => {
    const particles = new ParticleBuffer(1)
    const params: SimParams = {
      boundaryDamping: -0.5,
      containerSize: [1, 1, 1],
      gasConstant: 1,
      gravity: [0, -9.81, 0],
      particleMass: 1,
      restDensity: 1,
      smoothingLength: 0.25,
      timeStep: 1 / 120,
      viscosity: -1,
    }

    expect(() => accumulateForces(particles, params)).toThrow(
      'SimParams viscosity must be non-negative.',
    )
  })
})
