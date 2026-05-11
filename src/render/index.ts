export const renderModuleSummary = {
  path: 'src/render',
  title: 'Rendering layer',
  description:
    'Three.js setup now includes a reusable viewport, shared light/material helpers, a worker-driven fluid scene, and the first SSFR depth, thickness, and bilateral-blur pass foundations.',
}

export {
  createDepthBilateralBlurPass,
  createParticleDepthPass,
  createParticleThicknessPass,
  type DepthBilateralBlurPass,
  type ParticleDepthPass,
  type ParticleThicknessPass,
} from './ssfr'
