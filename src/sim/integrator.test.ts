import { describe, expect, it } from 'vitest'
import { integrateParticles, type BoxObstacle } from '@/sim/integrator'
import { ParticleBuffer, type SimParams } from '@/sim/particles'

function expectVec3CloseTo(
  actual: readonly number[],
  expected: readonly number[],
): void {
  expected.forEach((component, axis) => {
    expect(actual[axis]).toBeCloseTo(component, 5)
  })
}

const baseParams: SimParams = {
  boundaryDamping: -0.5,
  containerSize: [2, 2, 2],
  gasConstant: 4,
  gravity: [0, -9.81, 0],
  particleMass: 1.5,
  restDensity: 0,
  smoothingLength: 0.2,
  timeStep: 0.5,
  viscosity: 0.75,
}

describe('integrateParticles', () => {
  it('advances velocity and position with semi-implicit Euler', () => {
    const particles = new ParticleBuffer(1)
    particles.setPosition(0, [0.2, 0.2, 0.2])
    particles.setVelocity(0, [1, 2, 3])
    particles.setForce(0, [4, -2, 0])
    particles.setDensity(0, 2)

    integrateParticles(particles, baseParams)

    expectVec3CloseTo([...particles.getParticle(0).velocity], [2, 1.5, 3])
    expectVec3CloseTo([...particles.getParticle(0).position], [1.2, 0.95, 1.7])
  })

  it('reflects and clamps particles against the container walls', () => {
    const particles = new ParticleBuffer(1)
    particles.setPosition(0, [0.95, 0.1, 0.2])
    particles.setVelocity(0, [1, -2, 0])
    particles.setForce(0, [0, 0, 0])
    particles.setDensity(0, 1)

    integrateParticles(particles, {
      ...baseParams,
      containerSize: [1, 1, 1],
      gravity: [0, 0, 0],
      timeStep: 0.2,
    })

    expectVec3CloseTo([...particles.getParticle(0).position], [1, 0, 0.2])
    expectVec3CloseTo([...particles.getParticle(0).velocity], [-0.5, 1, 0])
  })

  it('reflects particles off axis-aligned obstacle boxes with damping', () => {
    const particles = new ParticleBuffer(1)
    const obstacle: BoxObstacle = {
      center: [0.5, 0.5, 0.5],
      size: [0.2, 0.2, 0.2],
    }

    particles.setPosition(0, [0.3, 0.5, 0.5])
    particles.setVelocity(0, [1, 0, 0])
    particles.setForce(0, [0, 0, 0])
    particles.setDensity(0, 1)

    integrateParticles(
      particles,
      {
        ...baseParams,
        gravity: [0, 0, 0],
        timeStep: 0.2,
      },
      [obstacle],
    )

    expectVec3CloseTo([...particles.getParticle(0).position], [0.4, 0.5, 0.5])
    expectVec3CloseTo([...particles.getParticle(0).velocity], [-0.5, 0, 0])
  })

  it('rejects invalid container sizes', () => {
    const particles = new ParticleBuffer(1)

    expect(() =>
      integrateParticles(particles, {
        ...baseParams,
        containerSize: [1, 0, 1],
      }),
    ).toThrow('SimParams containerSize axes must all be greater than zero.')
  })
})
