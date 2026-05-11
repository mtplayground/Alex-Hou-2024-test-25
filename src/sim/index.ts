export const simulationModuleSummary = {
  path: 'src/sim',
  title: 'Simulation core',
  description:
    'SPH kernels, spatial neighbor search, particle buffers, and the first density/pressure pass now live here, and later issues will add force accumulation plus integration logic.',
}

export { computeDensityPressure } from './densityPressure'
export { poly6Kernel, spikyGradient, viscosityLaplacian } from './kernels'
export {
  defaultSimParams,
  ParticleBuffer,
  type Particle,
  type SimParams,
} from './particles'
export { SpatialHashGrid } from './spatialHashGrid'
