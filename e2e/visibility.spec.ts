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

test('shows visible particles on a fresh first load', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })

  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: /Fluid playground workspace shell/i,
    }),
  ).toBeVisible()
  await expect(page.getByTestId('viewport-stage').locator('canvas')).toBeVisible()

  await page.waitForTimeout(1000)

  await expect
    .poll(async () => readVisiblePixelRatio(page), {
      message: 'expected the first-load viewport to contain visible particles',
    })
    .toBeGreaterThan(0.01)
})
