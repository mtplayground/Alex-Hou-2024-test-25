import { describe, expect, it } from 'vitest'
import { poly6Kernel, spikyGradient, viscosityLaplacian } from '@/sim/kernels'

describe('SPH smoothing kernels', () => {
  it('evaluates the poly6 kernel against known reference values', () => {
    expect(poly6Kernel(0, 2)).toBeCloseTo(0.1958351838826056, 12)
    expect(poly6Kernel(1, 2)).toBeCloseTo(0.08261796820047423, 12)
    expect(poly6Kernel(2.1, 2)).toBe(0)
  })

  it('evaluates the spiky gradient against known reference values', () => {
    expect(spikyGradient([1, 0, 0], 2)).toEqual([-0.22381163872297782, 0, 0])
    expect(spikyGradient([0, 0, 0], 2)).toEqual([0, 0, 0])
    expect(spikyGradient([3, 0, 0], 2)).toEqual([0, 0, 0])
  })

  it('evaluates the viscosity laplacian against known reference values', () => {
    expect(viscosityLaplacian(0.5, 2)).toBeCloseTo(0.33571745808446674, 12)
    expect(viscosityLaplacian(2, 2)).toBe(0)
    expect(viscosityLaplacian(2.5, 2)).toBe(0)
  })
})
