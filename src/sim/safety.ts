import { defaultSimParams, type SimParams } from '@/sim/particles'
import type {
  InitialFluidBlock,
  Scene,
  SceneContainer,
  SceneEmitter,
  SceneObstacle,
} from '@/types/scene'
import type { SimulationEmitter } from './Simulation'

export const SIM_SAFETY_LIMITS = {
  boundaryDamping: { max: -0.05, min: -0.95 },
  containerAxis: { max: 8, min: 1 },
  emitterRate: { max: 240, min: 0 },
  emitterSpeed: { max: 8, min: 0 },
  gasConstant: { max: 4000, min: 1 },
  gravity: { max: 5, min: -20 },
  obstacleSize: { max: 4, min: 0.1 },
  particleCount: { max: 2048, min: 1 },
  particleMass: { max: 1, min: 0 },
  restDensity: { max: 2000, min: 300 },
  smoothingLength: { max: 0.5, min: 0.1 },
  timeStep: { max: 0.25, min: 1 / 240 },
  viscosity: { max: 2, min: 0 },
} as const

type MutableVec3 = [number, number, number]

function fallbackNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function clampFiniteNumber(
  value: number,
  fallback: number,
  min: number,
  max: number,
): number {
  return clampNumber(fallbackNumber(value, fallback), min, max)
}

function clampVec3(
  value: readonly number[],
  fallback: readonly number[],
  min: number,
  max: number,
): MutableVec3 {
  return [
    clampFiniteNumber(value[0] ?? fallback[0] ?? 0, fallback[0] ?? 0, min, max),
    clampFiniteNumber(value[1] ?? fallback[1] ?? 0, fallback[1] ?? 0, min, max),
    clampFiniteNumber(value[2] ?? fallback[2] ?? 0, fallback[2] ?? 0, min, max),
  ]
}

export function sanitizeParticleCount(value: number, fallback: number): number {
  return Math.round(
    clampFiniteNumber(
      value,
      fallback,
      SIM_SAFETY_LIMITS.particleCount.min,
      SIM_SAFETY_LIMITS.particleCount.max,
    ),
  )
}

export function sanitizeTimeStep(value: number, fallback: number): number {
  return clampFiniteNumber(
    value,
    fallback,
    SIM_SAFETY_LIMITS.timeStep.min,
    SIM_SAFETY_LIMITS.timeStep.max,
  )
}

export function sanitizeSimParams(
  params: Partial<SimParams> | SimParams,
  base: SimParams = defaultSimParams,
): SimParams {
  const nextParams = {
    ...base,
    ...params,
  }

  return {
    boundaryDamping: clampFiniteNumber(
      nextParams.boundaryDamping,
      base.boundaryDamping,
      SIM_SAFETY_LIMITS.boundaryDamping.min,
      SIM_SAFETY_LIMITS.boundaryDamping.max,
    ),
    containerSize: clampVec3(
      nextParams.containerSize,
      base.containerSize,
      SIM_SAFETY_LIMITS.containerAxis.min,
      SIM_SAFETY_LIMITS.containerAxis.max,
    ),
    gasConstant: clampFiniteNumber(
      nextParams.gasConstant,
      base.gasConstant,
      SIM_SAFETY_LIMITS.gasConstant.min,
      SIM_SAFETY_LIMITS.gasConstant.max,
    ),
    gravity: clampVec3(
      nextParams.gravity,
      base.gravity,
      SIM_SAFETY_LIMITS.gravity.min,
      SIM_SAFETY_LIMITS.gravity.max,
    ),
    particleMass: clampFiniteNumber(
      nextParams.particleMass,
      base.particleMass,
      SIM_SAFETY_LIMITS.particleMass.min,
      SIM_SAFETY_LIMITS.particleMass.max,
    ),
    restDensity: clampFiniteNumber(
      nextParams.restDensity,
      base.restDensity,
      SIM_SAFETY_LIMITS.restDensity.min,
      SIM_SAFETY_LIMITS.restDensity.max,
    ),
    smoothingLength: clampFiniteNumber(
      nextParams.smoothingLength,
      base.smoothingLength,
      SIM_SAFETY_LIMITS.smoothingLength.min,
      SIM_SAFETY_LIMITS.smoothingLength.max,
    ),
    timeStep: sanitizeTimeStep(nextParams.timeStep, base.timeStep),
    viscosity: clampFiniteNumber(
      nextParams.viscosity,
      base.viscosity,
      SIM_SAFETY_LIMITS.viscosity.min,
      SIM_SAFETY_LIMITS.viscosity.max,
    ),
  }
}

export function sanitizeSceneContainer(
  container: SceneContainer,
  fallback: SceneContainer,
): SceneContainer {
  return {
    depth: clampFiniteNumber(
      container.depth,
      fallback.depth,
      SIM_SAFETY_LIMITS.containerAxis.min,
      SIM_SAFETY_LIMITS.containerAxis.max,
    ),
    height: clampFiniteNumber(
      container.height,
      fallback.height,
      SIM_SAFETY_LIMITS.containerAxis.min,
      SIM_SAFETY_LIMITS.containerAxis.max,
    ),
    width: clampFiniteNumber(
      container.width,
      fallback.width,
      SIM_SAFETY_LIMITS.containerAxis.min,
      SIM_SAFETY_LIMITS.containerAxis.max,
    ),
  }
}

export function sanitizeSceneObstacle(
  obstacle: SceneObstacle,
  container: SceneContainer,
): SceneObstacle {
  return {
    center: [
      clampFiniteNumber(
        obstacle.center[0],
        container.width * 0.5,
        0,
        container.width,
      ),
      clampFiniteNumber(
        obstacle.center[1],
        container.height * 0.5,
        0,
        container.height,
      ),
      clampFiniteNumber(
        obstacle.center[2],
        container.depth * 0.5,
        0,
        container.depth,
      ),
    ],
    id: obstacle.id,
    size: [
      clampFiniteNumber(
        obstacle.size[0],
        0.8,
        SIM_SAFETY_LIMITS.obstacleSize.min,
        Math.min(container.width, SIM_SAFETY_LIMITS.obstacleSize.max),
      ),
      clampFiniteNumber(
        obstacle.size[1],
        0.8,
        SIM_SAFETY_LIMITS.obstacleSize.min,
        Math.min(container.height, SIM_SAFETY_LIMITS.obstacleSize.max),
      ),
      clampFiniteNumber(
        obstacle.size[2],
        0.8,
        SIM_SAFETY_LIMITS.obstacleSize.min,
        Math.min(container.depth, SIM_SAFETY_LIMITS.obstacleSize.max),
      ),
    ],
  }
}

export function sanitizeInitialFluidBlock(
  initialFluid: InitialFluidBlock,
  container: SceneContainer,
): InitialFluidBlock {
  const size: MutableVec3 = [
    clampFiniteNumber(
      initialFluid.size[0],
      0.8,
      SIM_SAFETY_LIMITS.obstacleSize.min,
      container.width,
    ),
    clampFiniteNumber(
      initialFluid.size[1],
      0.8,
      SIM_SAFETY_LIMITS.obstacleSize.min,
      container.height,
    ),
    clampFiniteNumber(
      initialFluid.size[2],
      0.8,
      SIM_SAFETY_LIMITS.obstacleSize.min,
      container.depth,
    ),
  ]

  return {
    origin: [
      clampFiniteNumber(
        initialFluid.origin[0],
        0,
        0,
        Math.max(0, container.width - size[0]),
      ),
      clampFiniteNumber(
        initialFluid.origin[1],
        0,
        0,
        Math.max(0, container.height - size[1]),
      ),
      clampFiniteNumber(
        initialFluid.origin[2],
        0,
        0,
        Math.max(0, container.depth - size[2]),
      ),
    ],
    size,
  }
}

export function sanitizeSceneEmitter(
  emitter: SceneEmitter,
  container: SceneContainer,
): SceneEmitter {
  const particleCap = sanitizeParticleCount(
    emitter.particleCap,
    SIM_SAFETY_LIMITS.particleCount.max,
  )

  return {
    direction: [
      fallbackNumber(emitter.direction[0], 0),
      fallbackNumber(emitter.direction[1], -1),
      fallbackNumber(emitter.direction[2], 0),
    ],
    particleCap,
    position: [
      clampFiniteNumber(
        emitter.position[0],
        container.width * 0.5,
        0,
        container.width,
      ),
      clampFiniteNumber(
        emitter.position[1],
        container.height * 0.5,
        0,
        container.height,
      ),
      clampFiniteNumber(
        emitter.position[2],
        container.depth * 0.5,
        0,
        container.depth,
      ),
    ],
    rate: clampFiniteNumber(
      emitter.rate,
      0,
      SIM_SAFETY_LIMITS.emitterRate.min,
      SIM_SAFETY_LIMITS.emitterRate.max,
    ),
    speed: clampFiniteNumber(
      emitter.speed,
      0,
      SIM_SAFETY_LIMITS.emitterSpeed.min,
      SIM_SAFETY_LIMITS.emitterSpeed.max,
    ),
  }
}

export function sanitizeSimulationEmitter(
  emitter: SimulationEmitter,
  containerSize: readonly number[],
): SimulationEmitter {
  const width = containerSize[0] ?? 0
  const height = containerSize[1] ?? 0
  const depth = containerSize[2] ?? 0

  return {
    cap: sanitizeParticleCount(
      emitter.cap,
      SIM_SAFETY_LIMITS.particleCount.max,
    ),
    position: [
      clampFiniteNumber(emitter.position[0], width * 0.5, 0, width),
      clampFiniteNumber(emitter.position[1], height * 0.5, 0, height),
      clampFiniteNumber(emitter.position[2], depth * 0.5, 0, depth),
    ],
    rate: clampFiniteNumber(
      emitter.rate,
      0,
      SIM_SAFETY_LIMITS.emitterRate.min,
      SIM_SAFETY_LIMITS.emitterRate.max,
    ),
    velocity: clampVec3(
      emitter.velocity,
      [0, 0, 0],
      -SIM_SAFETY_LIMITS.emitterSpeed.max,
      SIM_SAFETY_LIMITS.emitterSpeed.max,
    ),
  }
}

export function sanitizeScene(scene: Scene): Scene {
  const container = sanitizeSceneContainer(scene.container, {
    depth: defaultSimParams.containerSize[2],
    height: defaultSimParams.containerSize[1],
    width: defaultSimParams.containerSize[0],
  })
  const simParams = sanitizeSimParams(
    {
      ...scene.simParams,
      containerSize: [container.width, container.height, container.depth],
    },
    defaultSimParams,
  )
  const obstacles = scene.obstacles.map((obstacle) =>
    sanitizeSceneObstacle(obstacle, container),
  )
  const base = {
    container,
    obstacles,
    simParams,
  }

  if (scene.initialFluid !== undefined) {
    return {
      ...base,
      initialFluid: sanitizeInitialFluidBlock(scene.initialFluid, container),
    }
  }

  return {
    ...base,
    emitter: sanitizeSceneEmitter(scene.emitter, container),
  }
}

export function assertFiniteParticleBuffer(
  label: string,
  buffers: {
    activeCount: number
    densities: Float32Array
    forces: Float32Array
    positions: Float32Array
    pressures: Float32Array
    velocities: Float32Array
  },
): void {
  const scalarCount = buffers.activeCount
  const vectorCount = buffers.activeCount * 3
  const checkArray = (values: Float32Array, length: number, name: string) => {
    for (let index = 0; index < length; index += 1) {
      const value = values[index]

      if (value === undefined || !Number.isFinite(value)) {
        throw new Error(
          `Simulation ${label} produced a non-finite ${name} value at index ${String(index)}.`,
        )
      }
    }
  }

  checkArray(buffers.positions, vectorCount, 'position')
  checkArray(buffers.velocities, vectorCount, 'velocity')
  checkArray(buffers.forces, vectorCount, 'force')
  checkArray(buffers.densities, scalarCount, 'density')
  checkArray(buffers.pressures, scalarCount, 'pressure')
}
