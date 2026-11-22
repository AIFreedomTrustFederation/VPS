'use strict';
// Real Electron acceptance, not a mocked BrowserWindow test. Runs offline in
// an Xvfb display; the only runtime fixture is a loopback HTTP listener.
const { app } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const limitMs = 45_000;
const outputDir = process.env.AIFT_DESKTOP_SMOKE_OUTPUT;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function until(description, predicate) {
  const deadline = Date.now() + 15_000;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await predicate()) return; } catch (error) { lastError = error; }
    await pause(100);
  }
  throw new Error(`${description} timed out${lastError ? ` (${lastError.message})` : ''}`);
}

async function reservePort() {
  const temporary = http.createServer();
  await new Promise((resolve, reject) => temporary.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = temporary.address().port;
  await new Promise((resolve, reject) => temporary.close(error => error ? reject(error) : resolve()));
  return port;
}

async function saveScreenshot(win, filename) {
  if (!outputDir) return;
  fs.mkdirSync(outputDir, { recursive: true });
  const screenshot = await win.capturePage();
  const bytes = screenshot.toPNG();
  if (bytes.length < 1000) throw new Error(`${filename} screenshot is empty`);
  fs.writeFileSync(path.join(outputDir, filename), bytes);
}

async function run() {
  const port = await reservePort();
  const runtimeUrl = `http://127.0.0.1:${port}/`;
  process.env.AIFT_DESKTOP_URL = runtimeUrl;
  delete process.env.AIFT_DESKTOP_TRUSTED_HTTPS_ORIGIN;

  const windowPromise = new Promise(resolve => app.once('browser-window-created', (_event, win) => resolve(win)));
  // Load the production entrypoint unchanged and test its actual BrowserWindow.
  require('./main.cjs');
  const win = await windowPromise;
  if (win.webContents.isDestroyed()) throw new Error('Electron webContents destroyed during startup');
  const preferences = win.webContents.getLastWebPreferences();
  if (!preferences.contextIsolation || preferences.nodeIntegration || !preferences.sandbox) {
    throw new Error(`Unsafe Electron webPreferences: ${JSON.stringify(preferences)}`);
  }

  await until('offline screen', async () => {
    if (!win.webContents.getURL().startsWith('data:text/html')) return false;
    return win.webContents.executeJavaScript("Boolean(document.querySelector('h1')?.textContent.includes('offline'))");
  });
  const keyboardOkay = await win.webContents.executeJavaScript(`
    (() => { const retry = document.querySelector('a'); retry?.focus();
      return retry?.textContent.includes('Retry connection') && document.activeElement === retry;
    })()
  `);
  if (!keyboardOkay) throw new Error('Retry link is not keyboard focusable');
  await saveScreenshot(win, '01-offline.png');
  process.stdout.write(`PASS offline fallback, focus, sandbox @ ${runtimeUrl}\n`);

  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('<!doctype html><html lang="en"><title>AIFT smoke connected</title><main id="aift-connected">AIFT local node connected</main></html>');
  });
  await new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolve));
  try {
    // Exercise the genuine anchor click and Electron navigation interception.
    await win.webContents.executeJavaScript("document.querySelector('a').click()").catch(() => {});
    await until('retry and connected local app', async () => {
      if (win.webContents.getURL() !== runtimeUrl) return false;
      return win.webContents.executeJavaScript("document.querySelector('#aift-connected')?.textContent === 'AIFT local node connected'");
    });
    await saveScreenshot(win, '02-connected.png');
    process.stdout.write('PASS offline -> retry -> connected loopback Electron journey\n');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
  win.close();
}

const watchdog = setTimeout(() => {
  process.stderr.write(`FAIL Electron smoke exceeded ${limitMs}ms\n`);
  app.exit(1);
}, limitMs);
run().then(() => {
  clearTimeout(watchdog);
  app.exit(0);
}).catch(error => {
  clearTimeout(watchdog);
  process.stderr.write(`FAIL Electron smoke: ${error.stack || error}\n`);
  app.exit(1);
});
