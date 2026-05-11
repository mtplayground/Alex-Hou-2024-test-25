export const simulationModuleSummary = {
  path: 'src/sim',
  title: 'Simulation core',
  description:
    'SPH kernels, spatial neighbor search, particle buffers, density/pressure computation, force accumulation, semi-implicit integration, and top-level simulation orchestration now live here.',
}

export {
  Simulation,
  type SimulationEmitter,
  type SimulationInit,
} from './Simulation'
export { computeDensityPressure } from './densityPressure'
export { accumulateForces } from './forces'
export { buildInitialFluidBlockPositions } from './initialFluid'
export { integrateParticles, type BoxObstacle } from './integrator'
export { poly6Kernel, spikyGradient, viscosityLaplacian } from './kernels'
export {
  defaultSimParams,
  ParticleBuffer,
  type Particle,
  type SimParams,
} from './particles'
export { SpatialHashGrid } from './spatialHashGrid'
