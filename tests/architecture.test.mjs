import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('Generals parity matrix tracks required foundational systems',async()=>{const s=await fs.readFile(path.join(root,'GENERALS_PARITY.md'),'utf8');for(const term of ['Unit AI','Locomotor','Pathfinder','Terrain/passability','Weapons','Mission'])assert.ok(s.includes(term));});
test('runtime source does not branch on concrete Aegis unit names',async()=>{for(const rel of ['engine/sim/simulation.js','engine/ai/unit-ai-update.js','engine/locomotion/locomotor.js','engine/locomotion/local-avoidance-system.js','engine/pathfinding/grid-pathfinder.js','engine/teams/team-manager.js','engine/ai/skirmish-ai-player.js','engine/combat/weapon-system.js','engine/combat/damage-system.js','engine/combat/targeting.js','engine/combat/projectile-system.js']){const s=await fs.readFile(path.join(root,rel),'utf8');assert.equal(/aegis_x|hmmwv50|rifleman/i.test(s),false,`${rel} contains concrete unit branching`);}});
