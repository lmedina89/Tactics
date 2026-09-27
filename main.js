import { DataRegistry } from './engine/data/registry.js';
import { CommandBus } from './engine/commands/command-bus.js';
import { Simulation, FIXED_DT } from './engine/sim/simulation.js';
import { ThreeRenderer } from './renderer/three-renderer.js';
import { InputController } from './ui/input-controller.js';

const $=s=>document.querySelector(s);
const canvas=$('#game');
const registry=await new DataRegistry().load('.');
const map=await fetch('maps/training_ground.json').then(r=>r.json());
const commandBus=new CommandBus();
const sim=new Simulation({registry,map,commandBus});
const view=new ThreeRenderer({canvas,registry,map});
await view.buildViews(sim);

const selectionLabel=$('#selection');
const status=$('#status');
const tickLabel=$('#tick');
const input=new InputController({
  canvas,renderer:view,sim,
  onSelection:e=>{view.setSelection(e);selectionLabel.textContent=e?`${registry.definition(e.definitionId).name} · ${e.health}/${e.maxHealth}`:'NONE';},
  onStatus:s=>status.textContent=s
});

$('#stop').addEventListener('click',()=>input.stop());
$('#center').addEventListener('click',()=>{const e=input.selected();if(!e)return;view.camera.position.set(e.x-58,125,e.z+135);view.camera.lookAt(e.x,0,e.z);});
$('#clear').addEventListener('click',()=>input.clear());

let accumulator=0,last=performance.now();
function frame(now){
  const dt=Math.min(.1,(now-last)/1000);last=now;accumulator+=dt;
  while(accumulator>=FIXED_DT){sim.step(FIXED_DT);accumulator-=FIXED_DT;}
  view.sync(sim);view.setSelection(input.selected());view.render();tickLabel.textContent=`TICK ${sim.tick}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
status.textContent='READY · SELECT A FRIENDLY UNIT';
