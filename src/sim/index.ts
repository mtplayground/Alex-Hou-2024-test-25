export const simulationModuleSummary = {
  path: 'src/sim',
  title: 'Simulation core',
  description:
    'SPH kernels, spatial neighbor search, and the first particle-buffer primitives now live here, and later issues will add density/force passes plus integration logic.',
}

export { poly6Kernel, spikyGradient, viscosityLaplacian } from './kernels'
export {
  defaultSimParams,
  ParticleBuffer,
  type Particle,
  type SimParams,
} from './particles'
export { SpatialHashGrid } from './spatialHashGrid'
