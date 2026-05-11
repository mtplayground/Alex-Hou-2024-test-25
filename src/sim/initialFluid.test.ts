import { describe, expect, it } from 'vitest'
import { buildInitialFluidBlockPositions, defaultSimParams } from '@/sim'

describe('initial fluid block placement', () => {
  it('builds a deterministic regular lattice with bounded jitter', () => {
    const block = {
      origin: [1.25, 1.1, 1.25] as const,
      size: [1, 0.8, 1] as const,
    }
    const positions = buildInitialFluidBlockPositions(block, defaultSimParams)
    const repeatedPositions = buildInitialFluidBlockPositions(
      block,
      defaultSimParams,
    )

    expect(positions).toHaveLength(384)
    expect(positions).toEqual(repeatedPositions)
    expect(positions[0]).toBeDefined()
    expect(positions.at(-1)).not.toEqual(positions[0])
  })

  it('keeps every generated particle inside the configured block', () => {
    const block = {
      origin: [0.4, 0.25, 0.6] as const,
      size: [0.52, 0.41, 0.78] as const,
    }
    const positions = buildInitialFluidBlockPositions(block, defaultSimParams)

    expect(positions.length).toBeGreaterThan(0)

    positions.forEach(([x, y, z]) => {
      expect(x).toBeGreaterThanOrEqual(block.origin[0])
      expect(x).toBeLessThanOrEqual(block.origin[0] + block.size[0])
      expect(y).toBeGreaterThanOrEqual(block.origin[1])
      expect(y).toBeLessThanOrEqual(block.origin[1] + block.size[1])
      expect(z).toBeGreaterThanOrEqual(block.origin[2])
      expect(z).toBeLessThanOrEqual(block.origin[2] + block.size[2])
    })
  })
})
