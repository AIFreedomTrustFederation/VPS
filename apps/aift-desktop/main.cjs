const { app, BrowserWindow, shell, ipcMain } = require('electron');

const DEFAULT_NODE_URL = process.env.AIFT_DESKTOP_URL || 'http://127.0.0.1:3001';
const FALLBACK_HTML = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AIFT Cloud offline</title><body style="font:16px system-ui;background:#07111f;color:#fff;padding:3rem"><h1>AIFT Cloud</h1><p>The local AIFT node is not responding. Start the local runtime, then restart the desktop app.</p><p>No hosted or native OS service is implied by this screen.</p></body></html>`;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'AIFT Cloud',
    backgroundColor: '#07111f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL(DEFAULT_NODE_URL).catch(() => {
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(FALLBACK_HTML)}`);
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
