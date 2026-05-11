import { describe, expect, it } from 'vitest'
import {
  sanitizeParticleCount,
  sanitizeScene,
  sanitizeSimParams,
  sanitizeTimeStep,
  SIM_SAFETY_LIMITS,
} from '@/sim'
import { defaultSimParams } from '@/sim/particles'
import type { Scene } from '@/types/scene'

describe('simulation safety rails', () => {
  it('clamps sim params and timing into safe ranges', () => {
    const sanitized = sanitizeSimParams({
      boundaryDamping: -99,
      containerSize: [99, Number.NaN, -1],
      gasConstant: Infinity,
      gravity: [500, -500, Number.NaN],
      particleMass: -4,
      restDensity: 999999,
      smoothingLength: 0.001,
      timeStep: 5,
      viscosity: Number.POSITIVE_INFINITY,
    })

    expect(sanitized.boundaryDamping).toBe(
      SIM_SAFETY_LIMITS.boundaryDamping.min,
    )
    expect(sanitized.containerSize).toEqual([
      SIM_SAFETY_LIMITS.containerAxis.max,
      defaultSimParams.containerSize[1],
      SIM_SAFETY_LIMITS.containerAxis.min,
    ])
    expect(sanitized.gravity).toEqual([
      SIM_SAFETY_LIMITS.gravity.max,
      SIM_SAFETY_LIMITS.gravity.min,
      defaultSimParams.gravity[2],
    ])
    expect(sanitized.restDensity).toBe(SIM_SAFETY_LIMITS.restDensity.max)
    expect(sanitized.smoothingLength).toBe(
      SIM_SAFETY_LIMITS.smoothingLength.min,
    )
    expect(sanitizeTimeStep(10, defaultSimParams.timeStep)).toBe(
      SIM_SAFETY_LIMITS.timeStep.max,
    )
    expect(sanitizeParticleCount(999999, 128)).toBe(
      SIM_SAFETY_LIMITS.particleCount.max,
    )
  })

  it('sanitizes imported scenes into container-safe values', () => {
    const unsafeScene: Scene = {
      container: {
        depth: 12,
        height: Number.NaN,
        width: 0.2,
      },
      emitter: {
        direction: [0, Number.NaN, 0],
        particleCap: 99999,
        position: [99, -4, 2],
        rate: 999,
        speed: 999,
      },
      obstacles: [
        {
          center: [99, -10, 99],
          id: 'unsafe-obstacle',
          size: [99, 0, Number.NaN],
        },
      ],
      simParams: {
        ...defaultSimParams,
        containerSize: [12, 12, 12],
        viscosity: 999,
      },
    }

    const sanitized = sanitizeScene(unsafeScene)

    expect(sanitized.container).toEqual({
      depth: SIM_SAFETY_LIMITS.containerAxis.max,
      height: defaultSimParams.containerSize[1],
      width: SIM_SAFETY_LIMITS.containerAxis.min,
    })
    expect(sanitized.emitter?.particleCap).toBe(
      SIM_SAFETY_LIMITS.particleCount.max,
    )
    expect(sanitized.emitter?.position[0]).toBe(sanitized.container.width)
    expect(sanitized.emitter?.position[1]).toBe(0)
    expect(sanitized.obstacles[0]?.center[0]).toBe(sanitized.container.width)
    expect(sanitized.obstacles[0]?.size[1]).toBe(
      SIM_SAFETY_LIMITS.obstacleSize.min,
    )
    expect(sanitized.simParams.viscosity).toBe(SIM_SAFETY_LIMITS.viscosity.max)
  })
})
