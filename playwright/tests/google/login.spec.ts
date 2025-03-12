import { test, expect } from '@playwright/test';
import dotenv from 'dotenv'
dotenv.config()
const google_account_name = process.env.GOOGLE_ACCOUNT_NAME
const authFile = './playwright/tests/browser_state/browser_state_google_session.json';
test('Google SSO E2E Test - logs in via Google and loads a file', async ({ page }) => {
  // Step 1: Visit the client application (adjust the URL as needed)
  await page.goto('http://localhost:1234');
  // await page.waitForNavigation({ timeout: 10000, url: /localhost:1234/ });


  // Step 2: Click the login button (assuming the button has text "Login")
  await page.click('button:has-text("Login with google")');

  // Step 3: Wait for navigation and assert that the hostname includes "accounts.google.com"
  await page.waitForNavigation({ timeout: 10000, url: /accounts\.google\.com/ });
  const currentHostname = new URL(page.url()).hostname;
  expect(currentHostname).toContain('accounts.google.com');
  await page.waitForTimeout(Math.random() * 200 + 80)
  await page.click(`text=${google_account_name}`); // TODO: use env

  await page.context().storageState({ path: authFile });


  // Back to the client

  // 7. Wait for redirection back to your client (URL should contain "localhost:4000")
  await page.waitForNavigation({ url: /localhost:1234/, timeout: 10000 });
  expect(page.url()).toContain('localhost:1234');

  // 8. In the client, enter the resource URL in the #resourceInput field.
  await page.waitForSelector('#resourceInput', { timeout: 10000 });
  await page.waitForSelector('#loginStatus', { timeout: 10000 });
  const webId = await page.$eval('#loginStatus', el => el.textContent);
  expect(webId?.trim(), 'No webId, login probably failed.').not.toBe('')
  if (!webId) return // to make typescript work, I don't if this is legal
  const profileUrl = webId.replace('card#me', '') 
  await page.fill('#resourceInput', profileUrl); // TODO put in env

  await page.waitForTimeout(50)
  // 9. Click the "see file" button (adjust the selector if needed)
  await page.click('text=Fetch Resource');

  // 10. Finally, check that the page contains the text a string from the profile page
  await expect(page.locator('body')).toContainText(webId);
  await expect(page.locator('body')).toContainText('@prefix dc: <http://purl.org/dc/terms/>');
});
