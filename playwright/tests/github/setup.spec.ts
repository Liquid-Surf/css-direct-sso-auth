import { test, expect } from '@playwright/test';

const authFile = './playwright/tests/browser_state/browser_state_github_session.json';

test('Google SSO E2E Test - logs in via Google and loads a file', async ({ page }) => {
  await page.goto('http://localhost:1234');


  await page.click('button:has-text("Login with github")');
  await page.waitForNavigation({ timeout: 10000, url: /github\.com/ });

  await page.waitForNavigation({ url: /localhost:1234/ });
  await page.context().storageState({ path: authFile });
});
