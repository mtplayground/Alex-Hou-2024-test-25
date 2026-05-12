import { expect, test, type Page } from '@playwright/test'

async function readVisiblePixelRatio(page: Page) {
  return page.locator('[data-testid="viewport-stage"] canvas').evaluate(
    (canvas: HTMLCanvasElement) => {
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
        throw new Error('Failed to create a scratch canvas context.')
      }

      context.drawImage(canvas, 0, 0)
      const pixels = context.getImageData(0, 0, width, height).data
      const backgroundRed = pixels[0] ?? 0
      const backgroundGreen = pixels[1] ?? 0
      const backgroundBlue = pixels[2] ?? 0
      let visiblePixels = 0
      let sampledPixels = 0

      for (let index = 0; index < pixels.length; index += 32) {
        const red = pixels[index] ?? 0
        const green = pixels[index + 1] ?? 0
        const blue = pixels[index + 2] ?? 0
        const distanceFromBackground =
          Math.abs(red - backgroundRed) +
          Math.abs(green - backgroundGreen) +
          Math.abs(blue - backgroundBlue)

        if (distanceFromBackground > 20) {
          visiblePixels += 1
        }

        sampledPixels += 1
      }

      return sampledPixels === 0 ? 0 : visiblePixels / sampledPixels
    },
  )
}

test('falls back to particles when SSFR silently renders empty output', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.clear()

    const globalWindow = window as typeof window & {
      __ZEROCLAW_TEST_HOOKS__?: { forceSsfrEmptyOutput?: boolean }
    }
    globalWindow.__ZEROCLAW_TEST_HOOKS__ = {
      forceSsfrEmptyOutput: true,
    }
  })

  await page.goto('/')

  const renderModeSelect = page.locator(
    '[data-testid="render-mode-select"]:visible',
  )
  await expect(renderModeSelect).toBeVisible()
  await renderModeSelect.selectOption('fluid')

  const fallbackBanner = page.getByText(/SSFR.*回退/u).first()
  await expect(fallbackBanner).toBeVisible({ timeout: 5000 })
  await expect(fallbackBanner).toContainText('SSFR')
  await expect(fallbackBanner).toContainText('回退')
  await expect(renderModeSelect).toHaveValue('particles')

  await expect
    .poll(async () => readVisiblePixelRatio(page), {
      message: 'expected particle fallback to remain visible after SSFR failure',
    })
    .toBeGreaterThan(0.01)
})

test('migrates persisted fluid render mode to particles on load', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem(
      'viewport-store',
      JSON.stringify({
        state: {
          renderMode: 'fluid',
        },
        version: 0,
      }),
    )
  })

  await page.goto('/')

  const renderModeSelect = page.locator(
    '[data-testid="render-mode-select"]:visible',
  )
  await expect(renderModeSelect).toBeVisible()
  await expect(renderModeSelect).toHaveValue('particles')
})
