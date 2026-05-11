import { expect, test } from '@playwright/test'

interface CanvasStats {
  hash: number
  maxBrightness: number
  nonBackgroundPixels: number
  uniqueBuckets: number
}

test('renders non-empty SSFR intermediate views for a deterministic particle frame', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })

  await page.goto('/')

  const simulationToggle = page.locator(
    '[data-testid="simulation-toggle"]:visible',
  )
  const simulationReset = page.locator(
    '[data-testid="simulation-reset"]:visible',
  )
  const renderModeSelect = page.locator(
    '[data-testid="render-mode-select"]:visible',
  )
  const debugViewSelect = page.locator(
    '[data-testid="ssfr-debug-view-select"]:visible',
  )
  const particleCount = page.getByTestId('particle-count-value')
  const viewportCanvas = '[data-testid="viewport-stage"] canvas'

  const readCanvasStats = async (): Promise<CanvasStats> =>
    page.locator(viewportCanvas).evaluate((canvas: HTMLCanvasElement) => {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('Viewport node is not a canvas element.')
      }

      const width = canvas.width
      const height = canvas.height

      if (width <= 0 || height <= 0) {
        throw new Error('Viewport canvas has no drawable size.')
      }

      const scratch = document.createElement('canvas')
      scratch.width = width
      scratch.height = height
      const context = scratch.getContext('2d')

      if (context === null) {
        throw new Error('Failed to create a 2D scratch context.')
      }

      context.drawImage(canvas, 0, 0)
      const pixels = context.getImageData(0, 0, width, height).data
      const backgroundRed = pixels[0] ?? 0
      const backgroundGreen = pixels[1] ?? 0
      const backgroundBlue = pixels[2] ?? 0
      const buckets = new Set<string>()
      let hash = 0
      let maxBrightness = 0
      let nonBackgroundPixels = 0

      for (let index = 0; index < pixels.length; index += 16) {
        const r = pixels[index] ?? 0
        const g = pixels[index + 1] ?? 0
        const b = pixels[index + 2] ?? 0
        const brightness = r + g + b
        const distanceFromBackground =
          Math.abs(r - backgroundRed) +
          Math.abs(g - backgroundGreen) +
          Math.abs(b - backgroundBlue)

        if (distanceFromBackground > 18) {
          nonBackgroundPixels += 1
        }

        if (brightness > maxBrightness) {
          maxBrightness = brightness
        }

        buckets.add(`${String(r >> 4)}-${String(g >> 4)}-${String(b >> 4)}`)
        hash = (hash * 33 + brightness + index) % 2147483647
      }

      return {
        hash,
        maxBrightness,
        nonBackgroundPixels,
        uniqueBuckets: buckets.size,
      }
    })

  await expect(simulationToggle).toBeVisible()
  await expect(simulationReset).toBeVisible()
  await expect(renderModeSelect).toBeVisible()
  await expect(debugViewSelect).toBeVisible()
  await expect(page.locator(viewportCanvas)).toBeVisible()

  if ((await simulationToggle.textContent())?.includes('Pause') ?? false) {
    await simulationToggle.click()
    await expect(simulationToggle).toContainText('Play')
  }

  await renderModeSelect.selectOption('fluid')
  await simulationReset.click()
  await expect(particleCount).not.toHaveText('0')
  await page.waitForTimeout(250)

  const modes = ['final', 'depth', 'thickness', 'normals'] as const
  const statsByMode = new Map<string, CanvasStats>()

  for (const mode of modes) {
    await debugViewSelect.selectOption(mode)
    await page.waitForTimeout(150)
    const stats = await readCanvasStats()
    statsByMode.set(mode, stats)
    expect(stats.nonBackgroundPixels).toBeGreaterThan(250)
    expect(stats.uniqueBuckets).toBeGreaterThan(3)
    expect(stats.maxBrightness).toBeGreaterThan(10)
  }

  const hashes = modes.map((mode) => statsByMode.get(mode)?.hash)
  expect(new Set(hashes).size).toBe(modes.length)
})
