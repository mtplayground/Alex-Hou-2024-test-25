import { expect, test } from '@playwright/test'

test('runs the happy path simulation flow', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })

  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: /Fluid playground workspace shell/i,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Hello-Cube smoke test/i }),
  ).toBeVisible()

  const simulationToggle = page.locator(
    '[data-testid="simulation-toggle"]:visible',
  )
  const simulationReset = page.locator(
    '[data-testid="simulation-reset"]:visible',
  )
  const viewportCanvas = page.getByTestId('viewport-stage').locator('canvas')
  const particleCount = page.getByTestId('particle-count-value')
  const stepRate = page.getByTestId('step-rate-value')
  const simTime = page.getByTestId('sim-time-value')

  await expect(viewportCanvas).toBeVisible()
  await expect(particleCount).not.toHaveText('0')
  await expect(simulationToggle).toBeEnabled()

  if ((await simulationToggle.textContent())?.includes('Pause') ?? false) {
    await simulationToggle.click()
    await expect(simulationToggle).toContainText('Play')
  }

  await simulationToggle.click()
  await expect(simulationToggle).toContainText('Pause')
  await expect
    .poll(async () => await stepRate.textContent())
    .not.toMatch(/^0\.0\/s$/)

  const beforeRunning = await viewportCanvas.screenshot()
  await page.waitForTimeout(700)
  const afterRunning = await viewportCanvas.screenshot()
  expect(beforeRunning.equals(afterRunning)).toBeFalsy()

  await simulationToggle.click()
  await expect(simulationToggle).toContainText('Play')
  await expect(simulationReset).toBeEnabled()

  await expect
    .poll(async () => {
      const value = (await simTime.textContent()) ?? '0s'
      return Number.parseFloat(value.replace('s', ''))
    })
    .toBeGreaterThan(0.05)

  await simulationReset.click()
  await expect
    .poll(async () => {
      const value = (await simTime.textContent()) ?? '0s'
      return Number.parseFloat(value.replace('s', ''))
    })
    .toBeLessThan(0.05)

  const presetName = 'happy-path-preset'
  const widthInput = page.locator(
    '[data-testid="container-width-input"]:visible',
  )
  const presetNameInput = page.locator(
    '[data-testid="preset-name-input"]:visible',
  )
  const savePreset = page.locator('[data-testid="save-preset"]:visible')
  const presetRow = page.locator(
    `[data-testid="preset-row-${presetName}"]:visible`,
  )
  const presetLoad = page.locator(
    `[data-testid="preset-load-${presetName}"]:visible`,
  )

  await widthInput.fill('6.4')
  await widthInput.blur()
  await expect(widthInput).toHaveValue('6.4')

  await presetNameInput.fill(presetName)
  await savePreset.click()
  await expect(presetRow).toBeVisible()

  await widthInput.fill('4.2')
  await widthInput.blur()
  await expect(widthInput).toHaveValue('4.2')

  await presetLoad.click()
  await expect(widthInput).toHaveValue('6.4')
})
