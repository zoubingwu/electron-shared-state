const Application = require('spectron').Application;
const path = require('path');
const assert = require('assert');

function getElectronPath() {
  let electronPath = path.join(
    __dirname,
    '..',
    'node_modules',
    '.bin',
    'electron'
  );
  if (process.platform === 'win32') electronPath += '.cmd';
  return electronPath;
}

function setupTimeout(test) {
  if (process.env.CI) {
    test.timeout(30000);
  } else {
    test.timeout(10000);
  }
}

async function startApplication(options = {}) {
  options.path = getElectronPath();
  if (process.env.CI) options.startTimeout = 30000;

  const app = new Application(options);
  await app.start();
  assert.strictEqual(app.isRunning(), true);
  return app;
}

async function stopApplication(app) {
  if (!app || !app.isRunning()) return;
  await app.stop();
  assert.strictEqual(app.isRunning(), false);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('electron-shared-state', function () {
  setupTimeout(this);

  let app = null;

  beforeEach(function () {
    return startApplication({
      args: [path.join(__dirname, '../example')],
    }).then((startedApp) => {
      app = startedApp;
    });
  });

  afterEach(function () {
    return stopApplication(app);
  });

  it('should open multiple windows', async function () {
    app.browserWindow.focus();
    const windowCount = await app.client.getWindowCount();
    assert.strictEqual(windowCount, 4);
  });

  it('should have right title for each windows', async function () {
    const titles = [];

    await app.client.windowByIndex(0);
    titles.push(await app.browserWindow.getTitle());

    await app.client.windowByIndex(1);
    titles.push(await app.browserWindow.getTitle());

    await app.client.windowByIndex(2);
    titles.push(await app.browserWindow.getTitle());

    await app.client.windowByIndex(3);
    titles.push(await app.browserWindow.getTitle());

    assert.strictEqual(titles.includes('window 1'), true);
    assert.strictEqual(titles.includes('window 2'), true);
    assert.strictEqual(titles.includes('window 3'), true);
    assert.strictEqual(titles.includes('window 4'), true);
  });

  it('should render content correctly', async function () {
    await app.client.windowByIndex(0);
    const count = await app.webContents.executeJavaScript(
      'document.querySelector("#count").innerHTML'
    );
    assert.strictEqual(count, '0');

    const incButtonText = await app.webContents.executeJavaScript(
      'document.querySelector("#inc").innerHTML'
    );
    assert.strictEqual(incButtonText, 'this increment in renderer');

    const decButtonText = await app.webContents.executeJavaScript(
      'document.querySelector("#dec").innerHTML'
    );
    assert.strictEqual(decButtonText, 'this decrement in main');

    const desc = await app.webContents.executeJavaScript(
      'document.querySelector("#text").innerHTML'
    );
    assert.strictEqual(desc, 'description: none');
  });

  it('should increment count for every window', async function () {
    await app.client.windowByIndex(0);
    await app.webContents.executeJavaScript(
      'document.querySelector("#inc").click()'
    );
    await sleep(50);

    const id = await app.webContents.getTitle();

    const count1 = await app.webContents.executeJavaScript(
      'document.querySelector("#count").innerHTML'
    );
    assert.strictEqual(count1, '1');
    const desc1 = await app.webContents.executeJavaScript(
      'document.querySelector("#text").innerHTML'
    );
    assert.strictEqual(desc1, `description: +1 by ${id}`);

    await app.client.windowByIndex(0);
    const count2 = await app.webContents.executeJavaScript(
      'document.querySelector("#count").innerHTML'
    );
    assert.strictEqual(count2, '1');
    const desc2 = await app.webContents.executeJavaScript(
      'document.querySelector("#text").innerHTML'
    );
    assert.strictEqual(desc2, `description: +1 by ${id}`);

    await app.client.windowByIndex(0);
    const count3 = await app.webContents.executeJavaScript(
      'document.querySelector("#count").innerHTML'
    );
    assert.strictEqual(count3, '1');
    const desc3 = await app.webContents.executeJavaScript(
      'document.querySelector("#text").innerHTML'
    );
    assert.strictEqual(desc3, `description: +1 by ${id}`);

    await app.client.windowByIndex(0);
    const count4 = await app.webContents.executeJavaScript(
      'document.querySelector("#count").innerHTML'
    );
    assert.strictEqual(count4, '1');
    const desc4 = await app.webContents.executeJavaScript(
      'document.querySelector("#text").innerHTML'
    );
    assert.strictEqual(desc4, `description: +1 by ${id}`);
  });
});
