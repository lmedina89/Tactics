import {DataRegistry} from './engine/data/registry.js';
import {CommandBus} from './engine/commands/command-bus.js';
import {Simulation,FIXED_DT} from './engine/sim/simulation.js';
import {validateMapManifest} from './engine/maps/map-manifest.js';
import {ThreeRenderer} from './renderer/three-renderer.js';
import {InputController} from './ui/input-controller.js';

const $=s=>document.querySelector(s),canvas=$('#game');
const registry=await new DataRegistry().load('.');
const map=validateMapManifest(await fetch('maps/training_ground.json').then(r=>r.json()));
const commandBus=new CommandBus(),sim=new Simulation({registry,map,commandBus});
const view=new ThreeRenderer({canvas,registry,map});
await view.buildWorld(sim.terrain);await view.buildViews(sim);

const selectionLabel=$('#selection'),status=$('#status'),tickLabel=$('#tick');
function selectionText(e){
  if(!e)return 'NONE';const def=registry.definition(e.definitionId),hp=`${Math.ceil(e.health)} / ${e.maxHealth}`;
  return `${def.name.toUpperCase()} · HP ${hp}`;
}
const input=new InputController({canvas,renderer:view,sim,
  onSelection:e=>{view.setSelection(e);selectionLabel.textContent=selectionText(e);},
  onStatus:s=>status.textContent=s
});

$('#stop').addEventListener('click',()=>input.stop());
$('#center').addEventListener('click',()=>{const e=input.selected();if(!e)return;view.camera.position.set(e.x-58,(e.y??0)+125,e.z+135);view.camera.lookAt(e.x,e.y??0,e.z);});
$('#clear').addEventListener('click',()=>input.clear());

let accumulator=0,last=performance.now();
function frame(now){
  const dt=Math.min(.1,(now-last)/1000);last=now;accumulator+=dt;
  while(accumulator>=FIXED_DT){sim.step(FIXED_DT);accumulator-=FIXED_DT;}
  view.sync(sim);const selected=input.selected();view.setSelection(selected);selectionLabel.textContent=selectionText(selected);view.render();
  const aiState=selected?.ai?.state?` · ${selected.ai.state}`:'';const target=selected?.combat?.activeTargetId?` · TARGET ${selected.combat.activeTargetId}`:'';tickLabel.textContent=`TICK ${sim.tick}${aiState}${target}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
status.textContent='READY · COMBAT CORE · SELECT FRIENDLY · TAP HOSTILE TO ATTACK';
window.ForgeRTS={sim,view,input,registry,map,snapshot:()=>sim.snapshot(),restore:s=>sim.restore(s)};
