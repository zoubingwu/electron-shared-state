import * as path from 'path';
import { _electron as electron, ElectronApplication } from 'playwright';
import * as assert from 'assert';
import { test, expect } from '@playwright/test';

let electronApp: ElectronApplication;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../example/main.js')],
  });
});

test.afterAll(async () => {
  await electronApp.close();
});

test('should open multiple windows', async () => {
  const windowCount = await electronApp.evaluate(async ({ BrowserWindow }) => {
    // This runs in the main Electron process, parameter here is always
    // the result of the require('electron') in the main app script.
    return BrowserWindow.getAllWindows().length;
  });
  expect(windowCount).toBe(4);
});

test('should have right title for each window', async () => {
  const titles = await electronApp.evaluate(async ({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows().map((i) => i.getTitle());
  });
  assert.strictEqual(titles.includes('window 1'), true);
  assert.strictEqual(titles.includes('window 2'), true);
  assert.strictEqual(titles.includes('window 3'), true);
  assert.strictEqual(titles.includes('window 4'), true);
});

test('should render content correctly', async () => {
  const page = await electronApp.firstWindow();
  const count = await page.getByTestId('count').innerHTML();
  assert.strictEqual(count, '0');

  const incButtonText = await page.getByTestId('inc').innerHTML();
  assert.strictEqual(incButtonText, 'this increment in renderer');

  const decButtonText = await page.getByTestId('dec').innerHTML();
  assert.strictEqual(decButtonText, 'this decrement in main');

  const desc = await page.getByTestId('text').innerHTML();
  assert.strictEqual(desc, 'description: none');
});

test('should increment count for every window', async () => {
  const page = await electronApp.firstWindow();
  await page.getByTestId('inc').click();
  const pages = electronApp.windows();
  for (let i = 0; i < pages.length; i++) {
    const count = await pages[i].getByTestId('count').innerHTML();
    assert.strictEqual(count, '1');
  }
});

test('should decrement count for every window', async () => {
  const page = await electronApp.firstWindow();
  await page.getByTestId('dec').click();
  const pages = await electronApp.windows();
  for (let i = 0; i < pages.length; i++) {
    const count = await pages[i].getByTestId('count').innerHTML();
    assert.strictEqual(count, '0');
  }
});
