import { expect, test } from '@playwright/test'

test('loads the homepage smoke scene', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: /Three\.js now renders an orbitable cube with axes and a grid\./i,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Hello-Cube smoke test/i }),
  ).toBeVisible()
})
