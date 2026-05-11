export const simulationModuleSummary = {
  path: 'src/sim',
  title: 'Simulation core',
  description:
    'SPH kernels and the first spatial neighbor-search grid now live here, and later issues will add particle buffers, force passes, and integration logic.',
}

export { poly6Kernel, spikyGradient, viscosityLaplacian } from './kernels'
export { SpatialHashGrid } from './spatialHashGrid'
