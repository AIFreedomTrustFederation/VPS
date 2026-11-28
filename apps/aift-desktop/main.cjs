const { app, BrowserWindow, shell, ipcMain } = require('electron');

// Fail closed on unsupported destinations. HTTPS hosted runtimes require a
// separately configured, exact trusted origin; HTTP is loopback only.
function resolveRuntimeUrl(raw, trustedHttpsOrigin) {
  let target;
  try { target = new URL(raw); } catch { throw new Error('AIFT_DESKTOP_URL must be an absolute URL'); }
  if (raw !== target.href && `${raw}/` !== target.href) {
    throw new Error('AIFT_DESKTOP_URL must use canonical URL syntax');
  }
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || raw.includes('#')) {
    throw new Error('AIFT_DESKTOP_URL must be HTTP(S) without credentials or fragments');
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
  if (loopback) return raw;
  if (target.protocol === 'https:' && trustedHttpsOrigin) {
    let allow;
    try { allow = new URL(trustedHttpsOrigin); } catch { /* reject below */ }
    if (allow && allow.protocol === 'https:' && allow.origin === trustedHttpsOrigin &&
        !allow.username && !allow.password && target.origin === allow.origin) return raw;
  }
  throw new Error('AIFT_DESKTOP_URL requires loopback or an explicitly trusted HTTPS origin');
}

const DEFAULT_NODE_URL = resolveRuntimeUrl(
  process.env.AIFT_DESKTOP_URL || 'http://127.0.0.1:3001',
  process.env.AIFT_DESKTOP_TRUSTED_HTTPS_ORIGIN,
);
const RETRY_URL = DEFAULT_NODE_URL.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FALLBACK_HTML = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>AIFT Cloud · Node offline</title><style>:root{color-scheme:dark;font:16px system-ui,sans-serif;background:#07111f;color:#f3f7ff}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 20%,#173b42 0%,#07111f 65%)}main{box-sizing:border-box;width:min(100%,42rem);padding:clamp(1.5rem,5vw,3rem)}.mark{font-size:2.4rem;color:#8be5c2}h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.1;margin:.6rem 0}p{line-height:1.65;color:#d2deed}.actions{display:flex;flex-wrap:wrap;gap:1rem;margin:2rem 0}a{display:inline-block;min-height:44px;box-sizing:border-box;padding:.85rem 1.2rem;border-radius:.75rem;background:#9cebd0;color:#081a20;font-weight:700;text-decoration:none}a:focus-visible{outline:3px solid #ffdf91;outline-offset:4px}.note{border-top:1px solid #426072;padding-top:1rem;font-size:.9rem}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}</style><main><div class="mark" aria-hidden="true">✧</div><p>AIFT DESKTOP · LOCAL CONNECTION</p><h1>The local node is offline.</h1><p>The local AIFT node is not responding. Start the local runtime, then select Retry connection. Your desktop has not connected to a hosted or native OS service.</p><div class="actions"><a href="${RETRY_URL}" rel="noreferrer">Retry connection</a></div><p class="note" role="status">Connection unavailable. No hosted or native OS service is implied by this screen. This recovery view works without a network connection.</p></main></html>`;

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

  // A data: recovery page has no privileged bridge. Handle its exact retry
  // destination in the main process, and refuse other fallback navigation.
  let recoveryVisible = false;
  const showFallback = () => {
    recoveryVisible = true;
    return win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(FALLBACK_HTML)}`);
  };
  const loadRuntime = () => {
    recoveryVisible = false;
    return win.loadURL(DEFAULT_NODE_URL).catch(showFallback);
  };
  win.webContents.on('will-navigate', (event, url) => {
    if (!recoveryVisible) return;
    event.preventDefault();
    if (url === DEFAULT_NODE_URL) loadRuntime();
  });
  loadRuntime();

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
