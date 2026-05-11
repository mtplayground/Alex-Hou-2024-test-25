export const renderModuleSummary = {
  path: 'src/render',
  title: 'Rendering layer',
  description:
    'Three.js setup now includes a reusable viewport, shared light/material helpers, a worker-driven fluid scene, and the first SSFR particle-depth pass foundation.',
}

export { createParticleDepthPass, type ParticleDepthPass } from './ssfr'
