import * as THREE from 'three'
import type { ContainerSize, VisualizationMode } from '@/store/viewportStore'
import type { SimulationFrame } from '@/workers/SimulationClient'

export function createParticleInstances(
  count: number,
  material: THREE.MeshStandardMaterial,
): THREE.InstancedMesh {
  const particleGeometry = new THREE.SphereGeometry(0.08, 16, 16)
  const particles = new THREE.InstancedMesh(particleGeometry, material, count)
  particles.count = count
  particles.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(count * 3),
    3,
  )
  return particles
}

function colorForScalar(
  scalar: number,
  min: number,
  max: number,
  target: THREE.Color,
): THREE.Color {
  const normalized =
    max > min ? THREE.MathUtils.clamp((scalar - min) / (max - min), 0, 1) : 0

  if (normalized <= 0.5) {
    return target.lerpColors(
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xfacc15),
      normalized * 2,
    )
  }

  return target.lerpColors(
    new THREE.Color(0xfacc15),
    new THREE.Color(0xef4444),
    (normalized - 0.5) * 2,
  )
}

export function updateParticleInstances(
  particles: THREE.InstancedMesh,
  frame: SimulationFrame,
  containerSize: ContainerSize,
  visualizationMode: VisualizationMode,
): void {
  const transform = new THREE.Matrix4()
  const color = new THREE.Color()
  const scalarBuffer =
    visualizationMode === 'density'
      ? frame.densities
      : visualizationMode === 'pressure'
        ? frame.pressures
        : frame.speeds
  const count = Math.floor(frame.positions.length / 3)
  let minScalar = Number.POSITIVE_INFINITY
  let maxScalar = Number.NEGATIVE_INFINITY

  for (let index = 0; index < count; index += 1) {
    const scalar = scalarBuffer[index] ?? 0
    minScalar = Math.min(minScalar, scalar)
    maxScalar = Math.max(maxScalar, scalar)
  }

  particles.count = Math.min(count, particles.instanceMatrix.count)

  for (let index = 0; index < particles.count; index += 1) {
    const offset = index * 3
    const x = frame.positions[offset]
    const y = frame.positions[offset + 1]
    const z = frame.positions[offset + 2]

    if (x === undefined || y === undefined || z === undefined) {
      continue
    }

    transform.makeTranslation(
      x - containerSize.width * 0.5,
      y,
      z - containerSize.depth * 0.5,
    )
    particles.setMatrixAt(index, transform)
    particles.setColorAt(
      index,
      colorForScalar(scalarBuffer[index] ?? 0, minScalar, maxScalar, color),
    )
  }

  particles.instanceMatrix.needsUpdate = true
  if (particles.instanceColor) {
    particles.instanceColor.needsUpdate = true
  }
}
