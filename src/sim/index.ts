export const simulationModuleSummary = {
  path: 'src/sim',
  title: 'Simulation core',
  description:
    'SPH kernels now live here, and later issues will add neighbor search, particle buffers, force passes, and integration logic.',
}

export { poly6Kernel, spikyGradient, viscosityLaplacian } from './kernels'
