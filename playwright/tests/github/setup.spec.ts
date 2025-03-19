import { test, expect } from '@playwright/test';
export const clientUrl = process.env.CLIENT_URL || 'http://localhost:1234';


const authFile = './playwright/tests/browser_state/browser_state_github_session.json';

test('Google SSO E2E Test - logs in via Google and loads a file', async ({ page }) => {
  await page.goto(clientUrl);


  await page.click('button:has-text("Login with github")');
  await page.waitForNavigation({ timeout: 10000, url: /github\.com/ });

  await page.waitForNavigation({ url: new RegExp(clientUrl) });
  await page.context().storageState({ path: authFile });
});
