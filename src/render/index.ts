export const renderModuleSummary = {
  path: 'src/render',
  title: 'Rendering layer',
  description:
    'Three.js setup now includes a reusable viewport, shared light/material helpers, a worker-driven fluid scene, and the first SSFR depth and thickness pass foundations.',
}

export {
  createParticleDepthPass,
  createParticleThicknessPass,
  type ParticleDepthPass,
  type ParticleThicknessPass,
} from './ssfr'
