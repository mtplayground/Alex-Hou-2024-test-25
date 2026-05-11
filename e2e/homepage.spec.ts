import { expect, test } from '@playwright/test'

test('loads the homepage smoke scene', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: /Fluid playground workspace shell/i,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Hello-Cube smoke test/i }),
  ).toBeVisible()
})
