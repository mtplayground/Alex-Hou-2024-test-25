export const simulationModuleSummary = {
  path: 'src/sim',
  title: 'Simulation core',
  description:
    'SPH kernels, spatial neighbor search, particle buffers, density/pressure computation, force accumulation, and semi-implicit integration now live here.',
}

export { computeDensityPressure } from './densityPressure'
export { accumulateForces } from './forces'
export { integrateParticles, type BoxObstacle } from './integrator'
export { poly6Kernel, spikyGradient, viscosityLaplacian } from './kernels'
export {
  defaultSimParams,
  ParticleBuffer,
  type Particle,
  type SimParams,
} from './particles'
export { SpatialHashGrid } from './spatialHashGrid'
