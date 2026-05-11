import { describe, expect, it } from 'vitest'
import { computeDensityPressure } from '@/sim/densityPressure'
import { poly6Kernel } from '@/sim/kernels'
import { ParticleBuffer, type SimParams } from '@/sim/particles'

describe('computeDensityPressure', () => {
  it('computes density from kernel sums and pressure from the equation of state', () => {
    const particles = new ParticleBuffer(3)
    particles.setPosition(0, [0, 0, 0])
    particles.setPosition(1, [0.1, 0, 0])
    particles.setPosition(2, [0.22, 0, 0])

    const params: SimParams = {
      boundaryDamping: -0.5,
      containerSize: [1, 1, 1],
      gasConstant: 4,
      gravity: [0, -9.81, 0],
      particleMass: 2,
      restDensity: 0,
      smoothingLength: 0.25,
      timeStep: 1 / 120,
      viscosity: 0.1,
    }

    computeDensityPressure(particles, params)

    const distances = {
      p0p0: 0,
      p0p1: 0.1,
      p0p2: 0.22,
      p1p1: 0,
      p1p2: 0.12,
      p2p2: 0,
    }
    const expectedDensities = [
      params.particleMass *
        (poly6Kernel(distances.p0p0, params.smoothingLength) +
          poly6Kernel(distances.p0p1, params.smoothingLength) +
          poly6Kernel(distances.p0p2, params.smoothingLength)),
      params.particleMass *
        (poly6Kernel(distances.p0p1, params.smoothingLength) +
          poly6Kernel(distances.p1p1, params.smoothingLength) +
          poly6Kernel(distances.p1p2, params.smoothingLength)),
      params.particleMass *
        (poly6Kernel(distances.p0p2, params.smoothingLength) +
          poly6Kernel(distances.p1p2, params.smoothingLength) +
          poly6Kernel(distances.p2p2, params.smoothingLength)),
    ]

    expectedDensities.forEach((density, index) => {
      expect(particles.densities[index]).toBeCloseTo(density, 4)
      expect(particles.pressures[index]).toBeCloseTo(
        params.gasConstant * density,
        4,
      )
    })
  })

  it('rejects invalid smoothing lengths', () => {
    const particles = new ParticleBuffer(1)
    const params: SimParams = {
      boundaryDamping: -0.5,
      containerSize: [1, 1, 1],
      gasConstant: 1,
      gravity: [0, -9.81, 0],
      particleMass: 1,
      restDensity: 1,
      smoothingLength: 0,
      timeStep: 1 / 120,
      viscosity: 0.1,
    }

    expect(() => computeDensityPressure(particles, params)).toThrow(
      'SimParams smoothingLength must be greater than zero.',
    )
  })
})
