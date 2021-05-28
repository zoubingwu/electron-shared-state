const { app, BrowserWindow, ipcMain } = require('electron');
const { sharedState } = require('./shared');
const { createSharedStore } = require('..');

const store = createSharedStore(sharedState);

store.subscribe((state, description) => {
  console.log(
    'state in main changed to: ',
    state,
    'description: ',
    description
  );
});

ipcMain.on('decrement', () => {
  store.setState((state) => {
    state.count = state.count - 1;
  }, '-1 from main');
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 300,
    height: 200,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');
  mainWindow.show();
}

app.on('ready', () => {
  createWindow();
  createWindow();
  createWindow();
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
