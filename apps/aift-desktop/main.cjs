const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');

const DEFAULT_NODE_URL = process.env.AIFT_DESKTOP_URL || 'http://127.0.0.1:3001';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'AIFT Cloud',
    backgroundColor: '#07111f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL(DEFAULT_NODE_URL).catch(() => {
    win.loadFile(path.join(__dirname, 'fallback.html'));
  });

  return win;
}

ipcMain.handle('aift:getNodeUrl', () => DEFAULT_NODE_URL);

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
