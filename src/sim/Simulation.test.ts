import { describe, expect, it } from 'vitest'
import { Simulation } from '@/sim/Simulation'

function expectBufferCloseTo(
  actual: Float32Array,
  expected: readonly number[],
): void {
  expect(actual.length).toBe(expected.length)

  expected.forEach((component, index) => {
    expect(actual[index]).toBeCloseTo(component, 5)
  })
}

describe('Simulation', () => {
  it('runs a deterministic drop scenario and supports reset', () => {
    const simulation = new Simulation()

    simulation.init({
      params: {
        boundaryDamping: -0.25,
        containerSize: [1, 1, 1],
        gasConstant: 4,
        gravity: [0, -9.81, 0],
        particleMass: 0,
        restDensity: 1000,
        smoothingLength: 0.25,
        timeStep: 0.1,
        viscosity: 0,
      },
      positions: [
        [0.25, 0.8, 0.25],
        [0.75, 0.35, 0.75],
      ],
      velocities: [
        [0, 0, 0],
        [0, 0, 0],
      ],
    })

    simulation.step(0.1)
    simulation.step(0.1)

    expectBufferCloseTo(
      simulation.positions,
      [0.25, 0.50570005, 0.25, 0.75, 0.055700004, 0.75],
    )

    simulation.reset()

    expectBufferCloseTo(
      simulation.positions,
      [0.25, 0.8, 0.25, 0.75, 0.35, 0.75],
    )
  })

  it('requires init before stepping', () => {
    const simulation = new Simulation()

    expect(() => simulation.step(0.1)).toThrow(
      'Simulation particle buffer is not initialized. Call init() first.',
    )
  })

  it('emits particles continuously up to the configured cap and resets cleanly', () => {
    const simulation = new Simulation()

    simulation.init({
      emitter: {
        cap: 3,
        position: [0.5, 0.8, 0.5],
        rate: 4,
        velocity: [0, -1, 0],
      },
      params: {
        boundaryDamping: -0.25,
        containerSize: [1, 1, 1],
        gasConstant: 4,
        gravity: [0, 0, 0],
        particleMass: 0,
        restDensity: 1000,
        smoothingLength: 0.25,
        timeStep: 0.25,
        viscosity: 0,
      },
      positions: [],
    })

    expect(simulation.positions).toHaveLength(0)

    simulation.step(0.25)
    expect(simulation.positions).toHaveLength(3)

    simulation.step(0.25)
    expect(simulation.positions).toHaveLength(6)

    simulation.step(0.25)
    expect(simulation.positions).toHaveLength(9)

    simulation.step(0.25)
    expect(simulation.positions).toHaveLength(9)

    simulation.reset()

    expect(simulation.positions).toHaveLength(0)
  })
})
