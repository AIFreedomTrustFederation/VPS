'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function boot({ failInitial = false, platform = 'linux' } = {}) {
  const calls = [];
  const handlers = new Map();
  let windowOpenHandler;
  class BrowserWindow {
    constructor(options) { this.options = options; this.webContents = { setWindowOpenHandler(fn) { windowOpenHandler = fn; } }; }
    loadURL(url) {
      calls.push(['loadURL', url]);
      return failInitial && calls.filter(c => c[0] === 'loadURL').length === 1
        ? Promise.reject(new Error('node unavailable'))
        : Promise.resolve();
    }
    static getAllWindows() { return []; }
  }
  const app = { whenReady: () => Promise.resolve(), on: (event, fn) => handlers.set(event, fn), quit: () => calls.push(['quit']) };
  const shell = { openExternal: url => calls.push(['external', url]) };
  const ipcMain = { handle: (name, fn) => handlers.set(name, fn) };
  const source = fs.readFileSync(path.join(__dirname, 'main.cjs'), 'utf8');
  vm.runInNewContext(source, {
    require: name => {
      if (name === 'electron') return { app, BrowserWindow, shell, ipcMain };
      throw new Error('unexpected module: ' + name);
    },
    process: { env: {}, platform },
    console,
    URL,
    encodeURIComponent,
  }, { filename: 'main.cjs' });
  return { calls, handlers, open: url => windowOpenHandler({ url }) };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('loads loopback runtime with sandboxed, isolated renderer', async () => {
  const b = boot();
  await flush();
  assert.equal(b.calls[0][1], 'http://127.0.0.1:3001');
  assert.equal(b.handlers.get('aift:getNodeUrl')(), 'http://127.0.0.1:3001');
});

test('offline fallback is self-contained and explicitly does not claim native OS', async () => {
  const b = boot({ failInitial: true });
  await flush();
  const fallback = b.calls.find((c, i) => i > 0 && c[0] === 'loadURL');
  assert.ok(fallback, 'a fallback navigation must occur');
  assert.match(fallback[1], /^data:text\/html;charset=utf-8,/);
  const html = decodeURIComponent(fallback[1].split(',').slice(1).join(','));
  assert.match(html, /local AIFT node is not responding/i);
  assert.match(html, /No hosted or native OS service is implied/i);
  assert.doesNotMatch(html, /<script\b/i);
});

test('external navigation permits HTTPS only and never opens insecure schemes', async () => {
  const b = boot();
  await flush();
  assert.deepEqual(b.open('http://example.com'), { action: 'deny' });
  assert.deepEqual(b.open('file:///etc/passwd'), { action: 'deny' });
  assert.deepEqual(b.open('javascript:alert(1)'), { action: 'deny' });
  assert.deepEqual(b.open('https://example.com'), { action: 'deny' });
  assert.deepEqual(b.calls.filter(c => c[0] === 'external'), [['external', 'https://example.com']]);
});
