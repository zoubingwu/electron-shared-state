const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { sharedState } = require('./shared');
const { createSharedStore } = require('../dist/index');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: true,
    },
  });
  const store = createSharedStore(sharedState);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    store.subscribe((state, description) => {
      console.log('sharedState in main changed to: ', state, description);
    });
  });
  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  ipcMain.on('decrement', () => {
    store.setState(state => {
      state.count = state.count - 1;
    }, '-1 from main');
  });
}
app.on('ready', createWindow);
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', function() {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
