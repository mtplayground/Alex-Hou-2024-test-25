import type { SimParams } from '@/sim/particles'
import type {
  InitialFluidBlock,
  Scene,
  SceneContainer,
  SceneEmitter,
  SceneObstacle,
} from '@/types/scene'

const PRESET_STORAGE_VERSION = 1
const DEFAULT_PRESET_STORAGE_KEY = 'fluid-playground.scene-presets'

interface ScenePresetEntry {
  name: string
  scene: Scene
  updatedAt: string
}

interface ScenePresetStorageEnvelope {
  presets: ScenePresetEntry[]
  version: number
}

interface StorageLike {
  getItem: (key: string) => string | null
  removeItem: (key: string) => void
  setItem: (key: string, value: string) => void
}

export interface ScenePreset {
  name: string
  scene: Scene
  updatedAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function validateFiniteNumber(
  value: unknown,
  path: string,
  {
    integer = false,
    min,
  }: {
    integer?: boolean
    min?: number
  } = {},
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number.`)
  }

  if (integer && !Number.isInteger(value)) {
    throw new Error(`${path} must be an integer.`)
  }

  if (min !== undefined && value < min) {
    throw new Error(`${path} must be greater than or equal to ${String(min)}.`)
  }

  return value
}

function validateVec3(value: unknown, path: string): [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`${path} must be a 3-element vector.`)
  }

  return [
    validateFiniteNumber(value[0], `${path}[0]`),
    validateFiniteNumber(value[1], `${path}[1]`),
    validateFiniteNumber(value[2], `${path}[2]`),
  ]
}

function validateContainer(container: unknown, path: string): SceneContainer {
  if (!isRecord(container)) {
    throw new Error(`${path} must be an object.`)
  }

  return {
    depth: validateFiniteNumber(container['depth'], `${path}.depth`, {
      min: 0,
    }),
    height: validateFiniteNumber(container['height'], `${path}.height`, {
      min: 0,
    }),
    width: validateFiniteNumber(container['width'], `${path}.width`, {
      min: 0,
    }),
  }
}

function validateInitialFluid(
  initialFluid: unknown,
  path: string,
): InitialFluidBlock {
  if (!isRecord(initialFluid)) {
    throw new Error(`${path} must be an object.`)
  }

  return {
    origin: validateVec3(initialFluid['origin'], `${path}.origin`),
    size: validateVec3(initialFluid['size'], `${path}.size`),
  }
}

function validateEmitter(emitter: unknown, path: string): SceneEmitter {
  if (!isRecord(emitter)) {
    throw new Error(`${path} must be an object.`)
  }

  return {
    direction: validateVec3(emitter['direction'], `${path}.direction`),
    particleCap: validateFiniteNumber(
      emitter['particleCap'],
      `${path}.particleCap`,
      { integer: true, min: 1 },
    ),
    position: validateVec3(emitter['position'], `${path}.position`),
    rate: validateFiniteNumber(emitter['rate'], `${path}.rate`, { min: 0 }),
    speed: validateFiniteNumber(emitter['speed'], `${path}.speed`, { min: 0 }),
  }
}

function validateObstacle(obstacle: unknown, path: string): SceneObstacle {
  if (!isRecord(obstacle)) {
    throw new Error(`${path} must be an object.`)
  }

  if (
    typeof obstacle['id'] !== 'string' ||
    obstacle['id'].trim().length === 0
  ) {
    throw new Error(`${path}.id must be a non-empty string.`)
  }

  return {
    center: validateVec3(obstacle['center'], `${path}.center`),
    id: obstacle['id'],
    size: validateVec3(obstacle['size'], `${path}.size`),
  }
}

function validateObstacles(obstacles: unknown, path: string): SceneObstacle[] {
  if (!Array.isArray(obstacles)) {
    throw new Error(`${path} must be an array.`)
  }

  return obstacles.map((obstacle, index) =>
    validateObstacle(obstacle, `${path}[${String(index)}]`),
  )
}

function validateSimParams(params: unknown, path: string): SimParams {
  if (!isRecord(params)) {
    throw new Error(`${path} must be an object.`)
  }

  return {
    boundaryDamping: validateFiniteNumber(
      params['boundaryDamping'],
      `${path}.boundaryDamping`,
    ),
    containerSize: validateVec3(
      params['containerSize'],
      `${path}.containerSize`,
    ),
    gasConstant: validateFiniteNumber(
      params['gasConstant'],
      `${path}.gasConstant`,
    ),
    gravity: validateVec3(params['gravity'], `${path}.gravity`),
    particleMass: validateFiniteNumber(
      params['particleMass'],
      `${path}.particleMass`,
      {
        min: 0,
      },
    ),
    restDensity: validateFiniteNumber(
      params['restDensity'],
      `${path}.restDensity`,
      {
        min: 0,
      },
    ),
    smoothingLength: validateFiniteNumber(
      params['smoothingLength'],
      `${path}.smoothingLength`,
      { min: 0 },
    ),
    timeStep: validateFiniteNumber(params['timeStep'], `${path}.timeStep`, {
      min: 0,
    }),
    viscosity: validateFiniteNumber(params['viscosity'], `${path}.viscosity`, {
      min: 0,
    }),
  }
}

export function cloneScene(scene: Scene): Scene {
  const base = {
    container: { ...scene.container },
    obstacles: scene.obstacles.map((obstacle) => ({
      center: [...obstacle.center] as [number, number, number],
      id: obstacle.id,
      size: [...obstacle.size] as [number, number, number],
    })),
    simParams: {
      ...scene.simParams,
      containerSize: [...scene.simParams.containerSize] as [
        number,
        number,
        number,
      ],
      gravity: [...scene.simParams.gravity] as [number, number, number],
    },
  }

  if (scene.initialFluid !== undefined) {
    return {
      ...base,
      initialFluid: {
        origin: [...scene.initialFluid.origin] as [number, number, number],
        size: [...scene.initialFluid.size] as [number, number, number],
      },
    }
  }

  return {
    ...base,
    emitter: {
      direction: [...scene.emitter.direction] as [number, number, number],
      particleCap: scene.emitter.particleCap,
      position: [...scene.emitter.position] as [number, number, number],
      rate: scene.emitter.rate,
      speed: scene.emitter.speed,
    },
  }
}

export function assertValidScene(value: unknown, path = 'scene'): Scene {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object.`)
  }

  const base = {
    container: validateContainer(value['container'], `${path}.container`),
    obstacles: validateObstacles(value['obstacles'], `${path}.obstacles`),
    simParams: validateSimParams(value['simParams'], `${path}.simParams`),
  }
  const hasEmitter = value['emitter'] !== undefined
  const hasInitialFluid = value['initialFluid'] !== undefined

  if (hasEmitter === hasInitialFluid) {
    throw new Error(
      `${path} must contain exactly one of emitter or initialFluid.`,
    )
  }

  if (hasEmitter) {
    return {
      ...base,
      emitter: validateEmitter(value['emitter'], `${path}.emitter`),
    }
  }

  return {
    ...base,
    initialFluid: validateInitialFluid(
      value['initialFluid'],
      `${path}.initialFluid`,
    ),
  }
}

export function serializeScene(scene: Scene): string {
  return JSON.stringify(cloneScene(scene), null, 2)
}

export function deserializeScene(serializedScene: string): Scene {
  let parsed: unknown

  try {
    parsed = JSON.parse(serializedScene)
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Scene JSON could not be parsed: ${error.message}`
        : 'Scene JSON could not be parsed.',
    )
  }

  return assertValidScene(parsed)
}

function resolveStorage(storage?: StorageLike): StorageLike {
  if (storage) {
    return storage
  }

  if (typeof window !== 'undefined') {
    return window.localStorage
  }

  throw new Error('localStorage is not available in this environment.')
}

function sortPresets(presets: ScenePreset[]): ScenePreset[] {
  return [...presets].sort((left, right) => left.name.localeCompare(right.name))
}

export class LocalStorageScenePresetManager {
  private readonly storage: StorageLike

  private readonly storageKey: string

  constructor({
    storage,
    storageKey = DEFAULT_PRESET_STORAGE_KEY,
  }: {
    storage?: StorageLike
    storageKey?: string
  } = {}) {
    this.storage = resolveStorage(storage)
    this.storageKey = storageKey
  }

  deletePreset(name: string): boolean {
    const trimmedName = this.normalizeName(name)
    const presets = this.readPresets()
    const nextPresets = presets.filter((preset) => preset.name !== trimmedName)

    if (nextPresets.length === presets.length) {
      return false
    }

    this.writePresets(nextPresets)
    return true
  }

  listPresets(): ScenePreset[] {
    return sortPresets(this.readPresets()).map((preset) => ({
      name: preset.name,
      scene: cloneScene(preset.scene),
      updatedAt: preset.updatedAt,
    }))
  }

  loadPreset(name: string): Scene {
    const trimmedName = this.normalizeName(name)
    const preset = this.readPresets().find(
      (candidate) => candidate.name === trimmedName,
    )

    if (!preset) {
      throw new Error(`Preset "${trimmedName}" was not found.`)
    }

    return cloneScene(preset.scene)
  }

  savePreset(name: string, scene: Scene): ScenePreset {
    const trimmedName = this.normalizeName(name)
    const nextPreset: ScenePreset = {
      name: trimmedName,
      scene: cloneScene(scene),
      updatedAt: new Date().toISOString(),
    }
    const presets = this.readPresets().filter(
      (preset) => preset.name !== trimmedName,
    )
    presets.push(nextPreset)
    this.writePresets(presets)
    return {
      ...nextPreset,
      scene: cloneScene(nextPreset.scene),
    }
  }

  private normalizeName(name: string): string {
    const trimmedName = name.trim()

    if (trimmedName.length === 0) {
      throw new Error('Preset name must be a non-empty string.')
    }

    return trimmedName
  }

  private readPresets(): ScenePreset[] {
    const raw = this.storage.getItem(this.storageKey)

    if (raw === null) {
      return []
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Preset storage could not be parsed: ${error.message}`
          : 'Preset storage could not be parsed.',
      )
    }

    if (!isRecord(parsed)) {
      throw new Error('Preset storage must be an object.')
    }

    if (parsed['version'] !== PRESET_STORAGE_VERSION) {
      throw new Error(
        `Preset storage version ${String(parsed['version'])} is not supported.`,
      )
    }

    if (!Array.isArray(parsed['presets'])) {
      throw new Error('Preset storage presets must be an array.')
    }

    return parsed['presets'].map((preset, index) =>
      this.validatePresetRecord(preset, `presets[${String(index)}]`),
    )
  }

  private validatePresetRecord(value: unknown, path: string): ScenePreset {
    if (!isRecord(value)) {
      throw new Error(`${path} must be an object.`)
    }

    if (
      typeof value['name'] !== 'string' ||
      value['name'].trim().length === 0
    ) {
      throw new Error(`${path}.name must be a non-empty string.`)
    }

    if (
      typeof value['updatedAt'] !== 'string' ||
      value['updatedAt'].length === 0
    ) {
      throw new Error(`${path}.updatedAt must be a non-empty string.`)
    }

    return {
      name: value['name'],
      scene: assertValidScene(value['scene'], `${path}.scene`),
      updatedAt: value['updatedAt'],
    }
  }

  private writePresets(presets: ScenePreset[]): void {
    const envelope: ScenePresetStorageEnvelope = {
      presets: presets.map((preset) => ({
        name: preset.name,
        scene: cloneScene(preset.scene),
        updatedAt: preset.updatedAt,
      })),
      version: PRESET_STORAGE_VERSION,
    }

    this.storage.setItem(this.storageKey, JSON.stringify(envelope))
  }
}
