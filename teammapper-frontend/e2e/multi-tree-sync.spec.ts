import { test, expect } from '@playwright/test';
import { addTree, ROOT_NODE } from './helpers';

test('two clients each add a tree and both render every tree', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.getByText('Create mind map').click();
  await expect(page.getByText(ROOT_NODE)).toBeVisible();

  // The map URL carries the modification secret in its fragment, so the
  // second client opens the map with edit rights.
  const secondClientContext = await browser.newContext();
  try {
    const secondClient = await secondClientContext.newPage();
    await secondClient.goto(page.url());
    await expect(secondClient.getByText(ROOT_NODE)).toBeVisible();

    await addTree(page, 'First client tree');
    await addTree(secondClient, 'Second client tree');

    for (const client of [page, secondClient]) {
      await expect(client.getByText(ROOT_NODE)).toBeVisible();
      await expect(client.getByText('First client tree')).toBeVisible();
      await expect(client.getByText('Second client tree')).toBeVisible();
    }
  } finally {
    await secondClientContext.close();
  }
});
