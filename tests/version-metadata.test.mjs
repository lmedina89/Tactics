import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFile(path.join(root,rel),'utf8');
const escapeRegex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

test('release version metadata is consistent across package, HUD, startup and asset catalog',async()=>{
  const pkg=JSON.parse(await read('package.json'));
  const catalog=JSON.parse(await read('data/asset-catalog.json'));
  const html=await read('index.html');
  const main=await read('main.js');
  const v=escapeRegex(pkg.version);
  assert.equal(catalog.version,pkg.version);
  assert.match(html,new RegExp(`ForgeRTS v${v}`));
  assert.match(html,new RegExp(`v${v}`));
  assert.match(main,new RegExp(`v${v}`));
});
