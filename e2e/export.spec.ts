import { expect, test } from '@playwright/test'
import { statSync } from 'node:fs'

test('records a short WebM export and downloads a non-empty file', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })

  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: /Fluid playground workspace shell/i,
    }),
  ).toBeVisible()

  const simulationToggle = page.locator(
    '[data-testid="simulation-toggle"]:visible',
  )
  const webmToggle = page.locator('[data-testid="webm-capture-toggle"]:visible')
  const widthInput = page.locator(
    '[data-testid="container-width-input"]:visible',
  )
  const framerateSlider = page.locator(
    '[data-testid="webm-framerate-slider"]:visible',
  )

  await expect(simulationToggle).toBeEnabled()
  await expect(webmToggle).toBeEnabled()

  await widthInput.fill('6.8')
  await widthInput.blur()
  await expect(widthInput).toHaveValue('6.8')

  const sliderThumb = framerateSlider.getByRole('slider')
  await expect(sliderThumb).toBeVisible()
  await sliderThumb.focus()
  await page.keyboard.press('Home')
  await expect(sliderThumb).toHaveAttribute('aria-valuenow', '12')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(sliderThumb).toHaveAttribute('aria-valuenow', '15')

  if ((await simulationToggle.textContent())?.includes('Play') ?? false) {
    await simulationToggle.click()
    await expect(simulationToggle).toContainText('Pause')
  }

  await webmToggle.click()
  await expect(webmToggle).toContainText('Stop WebM export')
  await page.waitForTimeout(1200)

  const downloadPromise = page.waitForEvent('download')
  await webmToggle.click()
  const download = await downloadPromise

  await expect(webmToggle).toContainText('Start WebM export')
  expect(download.suggestedFilename()).toMatch(
    /^viewport-recording-.*\.webm$/,
  )

  const downloadPath = await download.path()
  expect(statSync(downloadPath).size).toBeGreaterThan(0)
})
