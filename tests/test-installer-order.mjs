import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const validator = new URL('../scripts/aift-validate-installer-registry.mjs', import.meta.url).pathname;
const url = 'https://github.com/AIFreedomTrustFederation/VPS/releases/download/example/app.apk';
function item(id, order, requires = []) {
  return {id,title:id,package_name:id,release_tag:'example',apk_name:'app.apk',download_url:url,install_order:order,requires,can_install_async:false,start_after_install:false,health_check_url:'',handoff_url:'',start_url:''};
}
function run(installers) {
  const dir = mkdtempSync(join(tmpdir(), 'aift-registry-'));
  try {const path=join(dir,'registry.json');writeFileSync(path,JSON.stringify({installers}));return spawnSync(process.execPath,[validator,path],{encoding:'utf8'});} finally {rmSync(dir,{recursive:true,force:true});}
}
test('valid dependency order passes',()=>{const r=run([item('runtime',10),item('app',20,['runtime'])]);assert.equal(r.status,0,r.stderr);});
test('later prerequisite fails',()=>{const r=run([item('app',10,['runtime']),item('runtime',20)]);assert.notEqual(r.status,0,r.stdout);assert.match(r.stderr,/requires.*earlier|earlier.*install_order/);});
test('dependency cycle fails',()=>{const r=run([item('a',10,['b']),item('b',20,['a'])]);assert.notEqual(r.status,0,r.stdout);});
test('invalid nonnumeric order fails',()=>{const r=run([item('a','first')]);assert.notEqual(r.status,0,r.stdout);});
test('unknown dependency still fails',()=>{const r=run([item('a',10,['missing'])]);assert.notEqual(r.status,0,r.stdout);assert.match(r.stderr,/unknown dependency/);});
test('duplicate order still fails',()=>{const r=run([item('a',10),item('b',10)]);assert.notEqual(r.status,0,r.stdout);assert.match(r.stderr,/Duplicate install_order/);});
test('self-dependency fails',()=>{const r=run([item('a',10,['a'])]);assert.notEqual(r.status,0,r.stdout);});

// Release URLs must identify the exact APK declared by the installer entry.
test('declared release URL remains valid', () => {
  const r = run([item('runtime', 10)]);
  assert.equal(r.status, 0, r.stderr);
});
test('download URL pointing to a different release tag fails', () => {
  const entry = {...item('runtime', 10), release_tag: 'production'};
  const r = run([entry]);
  assert.notEqual(r.status, 0, r.stdout);
  assert.match(r.stderr, /download_url/);
});
test('download URL pointing to a different APK fails', () => {
  const entry = {...item('runtime', 10), apk_name: 'verified.apk'};
  const r = run([entry]);
  assert.notEqual(r.status, 0, r.stdout);
  assert.match(r.stderr, /download_url/);
});
test('download URL with query or fragment fails', () => {
  for (const suffix of ['?download=1', '#alternate']) {
    const entry = {...item('runtime', 10), download_url: url + suffix};
    const r = run([entry]);
    assert.notEqual(r.status, 0, r.stdout);
  }
});
test('release tag path traversal fails even with matching URL string', () => {
  const tag = '../another-release';
  const entry = {...item('runtime', 10), release_tag: tag,
    download_url: `https://github.com/AIFreedomTrustFederation/VPS/releases/download/${tag}/app.apk`};
  const r = run([entry]);
  assert.notEqual(r.status, 0, r.stdout);
  assert.match(r.stderr, /release_tag/);
});
test('APK path traversal fails even with matching URL string', () => {
  const apk = '../alternate.apk';
  const entry = {...item('runtime', 10), apk_name: apk,
    download_url: `https://github.com/AIFreedomTrustFederation/VPS/releases/download/example/${apk}`};
  const r = run([entry]);
  assert.notEqual(r.status, 0, r.stdout);
  assert.match(r.stderr, /apk_name/);
});
test('non-APK download name fails', () => {
  const apk = 'install.sh';
  const entry = {...item('runtime', 10), apk_name: apk,
    download_url: `https://github.com/AIFreedomTrustFederation/VPS/releases/download/example/${apk}`};
  const r = run([entry]);
  assert.notEqual(r.status, 0, r.stdout);
  assert.match(r.stderr, /apk_name/);
});
