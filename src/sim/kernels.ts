export type Vec3 = readonly [number, number, number]

const ZERO_VECTOR: Vec3 = [0, 0, 0]

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value
}

export function poly6Kernel(distance: number, smoothingLength: number): number {
  if (smoothingLength <= 0 || distance < 0 || distance > smoothingLength) {
    return 0
  }

  const smoothingLengthSquared = smoothingLength * smoothingLength
  const distanceSquared = distance * distance
  const coefficient = 315 / (64 * Math.PI * Math.pow(smoothingLength, 9))

  return coefficient * Math.pow(smoothingLengthSquared - distanceSquared, 3)
}

export function spikyGradient(offset: Vec3, smoothingLength: number): Vec3 {
  if (smoothingLength <= 0) {
    return ZERO_VECTOR
  }

  const [x, y, z] = offset
  const distance = Math.hypot(x, y, z)

  if (distance <= 0 || distance > smoothingLength) {
    return ZERO_VECTOR
  }

  const coefficient =
    (-45 / (Math.PI * Math.pow(smoothingLength, 6))) *
    Math.pow(smoothingLength - distance, 2)
  const inverseDistance = 1 / distance

  return [
    normalizeZero(coefficient * x * inverseDistance),
    normalizeZero(coefficient * y * inverseDistance),
    normalizeZero(coefficient * z * inverseDistance),
  ]
}

export function viscosityLaplacian(
  distance: number,
  smoothingLength: number,
): number {
  if (smoothingLength <= 0 || distance < 0 || distance > smoothingLength) {
    return 0
  }

  return (
    (45 / (Math.PI * Math.pow(smoothingLength, 6))) *
    (smoothingLength - distance)
  )
}
