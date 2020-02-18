const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { sharedState } = require('./shared');
const { createSharedStore } = require('../dist/index');

const store = createSharedStore(sharedState);

store.subscribe((state, description) => {
  console.log('sharedState in main changed to: ', state, description);
});

ipcMain.on('decrement', () => {
  store.setState(state => {
    state.count = state.count - 1;
  }, '-1 from main');
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools({ mode: 'detach' });
}
app.on('ready', () => {
  createWindow();
  createWindow();
});
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', function() {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
