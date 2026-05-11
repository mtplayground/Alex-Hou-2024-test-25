export const renderModuleSummary = {
  path: 'src/render',
  title: 'Rendering layer',
  description:
    'Three.js setup now includes a reusable viewport, shared light/material helpers, a worker-driven fluid scene, and an SSFR pipeline with depth, thickness, blur, normal reconstruction, and composite orchestration.',
}

export {
  createDepthBilateralBlurPass,
  createParticleDepthPass,
  createParticleThicknessPass,
  createSSFRRenderer,
  type DepthBilateralBlurPass,
  type ParticleDepthPass,
  type ParticleThicknessPass,
  type SSFRRenderer,
} from './ssfr'
