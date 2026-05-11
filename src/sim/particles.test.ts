import { describe, expect, it } from 'vitest'
import {
  defaultSimParams,
  ParticleBuffer,
  type SimParams,
} from '@/sim/particles'

describe('ParticleBuffer', () => {
  it('stores particle state in typed array buffers and exposes particle views', () => {
    const particles = new ParticleBuffer(2)

    particles.setPosition(0, [1, 2, 3])
    particles.setVelocity(0, [0.5, -0.25, 0.75])
    particles.setForce(0, [3, 2, 1])
    particles.setDensity(0, 998.2)
    particles.setPressure(0, 12.5)

    const particle = particles.getParticle(0)

    expect(particles.positions).toBeInstanceOf(Float32Array)
    expect(particles.velocities).toBeInstanceOf(Float32Array)
    expect(particles.forces).toBeInstanceOf(Float32Array)
    expect(particles.densities).toBeInstanceOf(Float32Array)
    expect(particles.pressures).toBeInstanceOf(Float32Array)
    expect(particles.activeCount).toBe(2)
    expect([...particle.position]).toEqual([1, 2, 3])
    expect([...particle.velocity]).toEqual([0.5, -0.25, 0.75])
    expect([...particle.force]).toEqual([3, 2, 1])
    expect(particle.density).toBeCloseTo(998.2)
    expect(particle.pressure).toBeCloseTo(12.5)

    particle.position[1] = 4.5
    particle.velocity[2] = -1.5
    particle.force[0] = 9
    particle.density = 1001.6
    particle.pressure = 22.75

    expect([...particles.positions]).toEqual([1, 4.5, 3, 0, 0, 0])
    expect([...particles.velocities]).toEqual([0.5, -0.25, -1.5, 0, 0, 0])
    expect([...particles.forces]).toEqual([9, 2, 1, 0, 0, 0])
    expect(particles.densities[0]).toBeCloseTo(1001.6)
    expect(particles.pressures[0]).toBeCloseTo(22.75)
  })

  it('clears all buffers back to zero', () => {
    const particles = new ParticleBuffer(1)

    particles.setPosition(0, [1, 2, 3])
    particles.setVelocity(0, [4, 5, 6])
    particles.setForce(0, [7, 8, 9])
    particles.setDensity(0, 10)
    particles.setPressure(0, 11)

    particles.clear()

    expect([...particles.positions]).toEqual([0, 0, 0])
    expect([...particles.velocities]).toEqual([0, 0, 0])
    expect([...particles.forces]).toEqual([0, 0, 0])
    expect([...particles.densities]).toEqual([0])
    expect([...particles.pressures]).toEqual([0])
    expect(particles.activeCount).toBe(0)
  })

  it('tracks an explicit active particle count within buffer capacity', () => {
    const particles = new ParticleBuffer(3)

    particles.setActiveCount(1)
    expect(particles.activeCount).toBe(1)

    expect(() => particles.setActiveCount(4)).toThrow(
      'ParticleBuffer activeCount must be an integer between 0 and 3.',
    )
  })

  it('rejects invalid particle counts and indexes', () => {
    expect(() => new ParticleBuffer(-1)).toThrow(
      'ParticleBuffer count must be a non-negative integer.',
    )

    const particles = new ParticleBuffer(1)

    expect(() => particles.getParticle(4)).toThrow(
      'Particle index 4 is out of bounds for a buffer of 1 particles.',
    )
    expect(() => particles.setPosition(-1, [0, 0, 0])).toThrow(
      'Particle index -1 is out of bounds for a buffer of 1 particles.',
    )
  })
})

describe('defaultSimParams', () => {
  it('provides a stable baseline parameter struct for the simulation passes', () => {
    const expected: SimParams = {
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

    expect(defaultSimParams).toEqual(expected)
  })
})
