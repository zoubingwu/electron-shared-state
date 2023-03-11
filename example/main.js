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

ipcMain.handle('getTitle', (e) => {
  return BrowserWindow.fromWebContents(e.sender).getTitle();
});

function createWindow(title) {
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
  });

  mainWindow.setTitle(title);
  mainWindow.loadFile('index.html');
  mainWindow.show();
  mainWindow.webContents.openDevTools();
}

app.on('ready', () => {
  createWindow('window 1');
  createWindow('window 2');
  createWindow('window 3');
  createWindow('window 4');
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
