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

const selectionLabel=$('#selection'),status=$('#status'),tickLabel=$('#tick'),economyLabel=$('#economy'),context=$('#context-controls');
function selectionText(e){
  if(!e)return 'NONE';const def=registry.definition(e.definitionId),hp=`${Math.ceil(e.health)} / ${e.maxHealth}`;
  if(e.collector)return `${def.name.toUpperCase()} · HP ${hp} · CARGO ${Math.floor(e.collector.cargo)} / ${e.collector.cargoCapacity}`;
  if(e.production){const q=e.production.queue||[],front=q[0];const pct=front?Math.min(100,Math.floor(front.progressTicks/front.buildTimeTicks*100)):0;return `${def.name.toUpperCase()} · HP ${hp} · QUEUE ${q.length}${front?` · ${pct}%`:''}`;}
  return `${def.name.toUpperCase()} · HP ${hp}`;
}

let contextSignature='';
function refreshContext(e){
  const p=sim.players.get('player'),def=e?registry.definition(e.definitionId):null,prod=def?registry.module(def,'Production'):null;
  const sig=JSON.stringify({id:e?.id,q:e?.production?.queue?.map(x=>[x.definitionId,Math.floor(x.progressTicks)])||[],cargo:Math.floor(e?.collector?.cargo||0),credits:Math.floor(p?.credits||0),low:!!p?.lowPower});
  if(sig===contextSignature)return;contextSignature=sig;context.replaceChildren();
  if(!e?.alive)return;
  if(e.collector){
    const b=document.createElement('button');b.textContent='RETURN CARGO';b.disabled=e.collector.cargo<=0;b.addEventListener('click',()=>{sim.issueReturnCargo([e.id]);status.textContent='RETURN CARGO';});context.appendChild(b);
  }
  if(prod){
    for(const id of prod.buildable||[]){const target=registry.definition(id),cost=registry.module(target,'ProductionCost');if(!target||!cost)continue;const b=document.createElement('button');b.textContent=`${target.name.toUpperCase()} · $${cost.credits}`;b.disabled=(p?.credits??0)<cost.credits||(e.production.queue.length>=(prod.queueLimit??5));b.addEventListener('click',()=>{sim.issueProduce(e.id,id);status.textContent=`QUEUE ${target.name.toUpperCase()}`;contextSignature='';});context.appendChild(b);}
    if(e.production.queue.length){const b=document.createElement('button');b.textContent='CANCEL LAST';b.addEventListener('click',()=>{sim.issueCancelProduction(e.id);status.textContent='CANCEL PRODUCTION';contextSignature='';});context.appendChild(b);}
  }
}

const input=new InputController({canvas,renderer:view,sim,
  onSelection:e=>{view.setSelection(e);selectionLabel.textContent=selectionText(e);contextSignature='';refreshContext(e);},
  onStatus:s=>status.textContent=s
});

$('#stop').addEventListener('click',()=>input.stop());
$('#center').addEventListener('click',()=>{const e=input.selected();if(!e)return;view.camera.position.set(e.x-58,(e.y??0)+125,e.z+135);view.camera.lookAt(e.x,e.y??0,e.z);});
$('#clear').addEventListener('click',()=>{input.clear();contextSignature='';refreshContext(null);});

let accumulator=0,last=performance.now();
function frame(now){
  const dt=Math.min(.1,(now-last)/1000);last=now;accumulator+=dt;
  while(accumulator>=FIXED_DT){sim.step(FIXED_DT);accumulator-=FIXED_DT;}
  view.sync(sim);const selected=input.selected();view.setSelection(selected);selectionLabel.textContent=selectionText(selected);refreshContext(selected);view.render();
  const player=sim.players.get('player');economyLabel.textContent=`$${Math.floor(player?.credits??0).toLocaleString()} · PWR ${Math.round(player?.powerProduced??0)}/${Math.round(player?.powerUsed??0)}${player?.lowPower?' · LOW':''}`;
  const aiState=selected?.ai?.state?` · ${selected.ai.state}`:'';const target=selected?.combat?.activeTargetId?` · TARGET ${selected.combat.activeTargetId}`:'';const maneuver=selected?.locomotionState?.mode&&selected.locomotionState.mode!=='FORWARD'?` · ${selected.locomotionState.mode.replaceAll('_',' ')}`:'';const collect=selected?.collector?.state&&selected.collector.state!=='IDLE'?` · ${selected.collector.state.replaceAll('_',' ')}`:'';const queue=selected?.production?.queue?.[0]?` · BUILD ${selected.production.queue[0].definitionId.toUpperCase()}`:'';tickLabel.textContent=`TICK ${sim.tick}${aiState}${maneuver}${target}${collect}${queue}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
status.textContent='READY · ECONOMY / PRODUCTION · SELECT HARVESTER OR FACTORY';
window.ForgeRTS={sim,view,input,registry,map,snapshot:()=>sim.snapshot(),restore:s=>sim.restore(s)};
