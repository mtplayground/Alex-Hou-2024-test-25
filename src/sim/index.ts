export const simulationModuleSummary = {
  path: 'src/sim',
  title: 'Simulation core',
  description:
    'SPH kernels, spatial neighbor search, particle buffers, density/pressure computation, and force accumulation now live here, and later issues will add integration logic.',
}

export { computeDensityPressure } from './densityPressure'
export { accumulateForces } from './forces'
export { poly6Kernel, spikyGradient, viscosityLaplacian } from './kernels'
export {
  defaultSimParams,
  ParticleBuffer,
  type Particle,
  type SimParams,
} from './particles'
export { SpatialHashGrid } from './spatialHashGrid'
