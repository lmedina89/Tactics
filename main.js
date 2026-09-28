import {DataRegistry} from './engine/data/registry.js';
import {CommandBus} from './engine/commands/command-bus.js';
import {Simulation,FIXED_DT} from './engine/sim/simulation.js';
import {validateMapManifest} from './engine/maps/map-manifest.js';
import {ThreeRenderer} from './renderer/three-renderer.js';
import {InputController} from './ui/input-controller.js';

const $=s=>document.querySelector(s),canvas=$('#game');
const registry=await new DataRegistry().load('.');
const map=validateMapManifest(await fetch('maps/construction_validation.json').then(r=>r.json()));
const commandBus=new CommandBus(),sim=new Simulation({registry,map,commandBus});
const view=new ThreeRenderer({canvas,registry,map});
await view.buildWorld(sim.terrain);await view.buildViews(sim);

const selectionLabel=$('#selection'),status=$('#status'),tickLabel=$('#tick'),economyLabel=$('#economy'),context=$('#context-controls');
const commandTitle=$('#command-title'),commandHint=$('#command-hint'),objective=$('#objective');
const placementBanner=$('#placement-banner'),placementTitle=$('#placement-title'),placementState=$('#placement-state');

const PLACEMENT_LABEL={
  OUT_OF_BUILD_RADIUS:'OUTSIDE BUILD RADIUS',OUT_OF_BOUNDS:'OUT OF BOUNDS',WATER:'CANNOT BUILD IN WATER',TOO_STEEP:'TERRAIN TOO STEEP',HEIGHT_VARIATION:'TERRAIN TOO UNEVEN',BLOCKED_TERRAIN:'BLOCKED TERRAIN',OBJECT_OVERLAP:'OBJECT IN THE WAY',RESOURCE_OVERLAP:'RESOURCE FIELD IN THE WAY',MISSING_PREREQUISITE:'MISSING PREREQUISITE',BUILD_LIMIT:'BUILD LIMIT REACHED',INSUFFICIENT_CREDITS:'INSUFFICIENT CREDITS',INVALID_BUILDER:'INVALID BUILDER',BUILDER_NOT_OPERATIONAL:'BUILDER NOT OPERATIONAL'
};

function selectionText(e){
  if(!e)return 'NONE';const def=registry.definition(e.definitionId),hp=`${Math.ceil(e.health)} / ${e.maxHealth}`;
  if(e.operational===false&&e.construction){const pct=Math.min(100,Math.floor((e.construction.progressTicks||0)/Math.max(1,e.construction.buildTimeTicks||1)*100));return `${def.name.toUpperCase()} · ${e.construction.state.replaceAll('_',' ')} ${pct}% · HP ${hp}`;}
  if(e.collector)return `${def.name.toUpperCase()} · HP ${hp} · CARGO ${Math.floor(e.collector.cargo)} / ${e.collector.cargoCapacity}`;
  if(e.production){const q=e.production.queue||[],front=q[0];const pct=front?Math.min(100,Math.floor(front.progressTicks/front.buildTimeTicks*100)):0;return `${def.name.toUpperCase()} · HP ${hp} · QUEUE ${q.length}${front?` · ${pct}%`:''}`;}
  return `${def.name.toUpperCase()} · HP ${hp}`;
}

function commandStatusLabel(result){
  if(result?.ok)return 'READY';
  if(result?.reason==='MISSING_PREREQUISITE')return `REQ ${(result.missing||[]).map(id=>registry.definition(id)?.name||id).join('+').toUpperCase()}`;
  if(result?.reason==='INSUFFICIENT_CREDITS')return 'NO FUNDS';
  if(result?.reason==='BUILD_LIMIT')return 'LIMIT';
  if(result?.reason==='QUEUE_FULL')return 'QUEUE FULL';
  if(result?.reason==='BUILDER_NOT_OPERATIONAL')return 'OFFLINE';
  return result?.reason?.replaceAll('_',' ')||'LOCKED';
}

function hasOperational(definitionId){return [...sim.entities.values()].some(e=>e.alive&&e.operational!==false&&e.playerId==='player'&&e.definitionId===definitionId);}
function resourceTouched(){return [...sim.entities.values()].some(e=>e.kind==='resource'&&e.initialResourceCapacity!=null&&(e.resourceRemaining??0)<e.initialResourceCapacity-0.01)||[...sim.entities.values()].some(e=>e.playerId==='player'&&(e.collector?.cargo??0)>0);}
function producedVehicleExists(){const defs=new Set(['hmmwv50','harvester','aegis_x']);return [...sim.entities.values()].some(e=>e.alive&&e.playerId==='player'&&defs.has(e.definitionId)&&e.id.startsWith('player_')&&!e.id.includes('_site_'));}
function objectiveText(){
  if(!hasOperational('power_node'))return 'FIELD TEST 1/8 · SELECT COMMAND POST → BUILD POWER NODE';
  if(!hasOperational('refinery'))return 'FIELD TEST 2/8 · BUILD REFINERY';
  if(!resourceTouched())return 'FIELD TEST 3/8 · SELECT HARVESTER → TAP A CRYSTAL FIELD';
  if(!hasOperational('barracks'))return 'FIELD TEST 4/8 · BUILD BARRACKS';
  if(![...sim.entities.values()].some(e=>e.alive&&e.playerId==='player'&&e.definitionId==='rifleman'))return 'FIELD TEST 5/8 · SELECT BARRACKS → TRAIN RIFLEMAN';
  if(!hasOperational('vehicle_factory'))return 'FIELD TEST 6/8 · BUILD VEHICLE FACTORY';
  if(!producedVehicleExists())return 'FIELD TEST 7/8 · SELECT VEHICLE FACTORY → PRODUCE A VEHICLE';
  if(!hasOperational('guardian_turret'))return 'FIELD TEST 8/8 · BUILD GUARDIAN TURRET';
  return 'FIELD TEST COMPLETE · ECONOMY / CONSTRUCTION / PRODUCTION ONLINE';
}

function setCommandHeader(title,hint=''){commandTitle.textContent=title;commandHint.textContent=hint;}
function updatePlacementBanner(){
  const placing=input?.placement||null;
  if(!placing){placementBanner.hidden=true;placementBanner.classList.remove('valid','invalid');return;}
  placementBanner.hidden=false;const def=registry.definition(placing.definitionId);placementTitle.textContent=`PLACE ${def?.name?.toUpperCase()||placing.definitionId.toUpperCase()}`;
  const r=placing.lastResult;if(!r){placementState.textContent='MOVE GHOST · TAP TERRAIN TO PLACE';placementBanner.classList.remove('valid','invalid');return;}
  placementState.textContent=r.ok?'VALID · TAP TERRAIN TO CONFIRM':(PLACEMENT_LABEL[r.reason]||r.reason||'INVALID');placementBanner.classList.toggle('valid',!!r.ok);placementBanner.classList.toggle('invalid',!r.ok);
}

let input=null,contextSignature='';
function refreshContext(e){
  const p=sim.players.get('player'),placing=input?.placement||null;
  const techCounts=[...sim.entities.values()].filter(x=>x.alive&&x.operational!==false&&x.playerId==='player'&&x.kind==='building').map(x=>x.definitionId).sort();
  const sig=JSON.stringify({id:e?.id,op:e?.operational,state:e?.construction?.state,cp:Math.floor(e?.construction?.progressTicks||0),q:e?.production?.queue?.map(x=>[x.definitionId,Math.floor(x.progressTicks)])||[],cargo:Math.floor(e?.collector?.cargo||0),credits:Math.floor(p?.credits||0),low:!!p?.lowPower,placing:placing?[placing.definitionId,placing.yaw,placing.lastResult?.reason,placing.lastResult?.ok]:null,techCounts});
  updatePlacementBanner();objective.textContent=objectiveText();
  if(sig===contextSignature)return;contextSignature=sig;context.replaceChildren();

  if(placing){
    const target=registry.definition(placing.definitionId),r=placing.lastResult;setCommandHeader(`PLACE — ${target?.name?.toUpperCase()||placing.definitionId.toUpperCase()}`,r?(r.ok?'VALID POSITION · TAP TERRAIN TO BUILD':PLACEMENT_LABEL[r.reason]||r.reason):'MOVE THE GHOST TO A BUILD LOCATION');
    const rot=document.createElement('button');rot.textContent='ROTATE 90°';rot.addEventListener('click',()=>{input.rotatePlacement();contextSignature='';});context.appendChild(rot);
    const cancel=document.createElement('button');cancel.textContent='CANCEL BUILD';cancel.addEventListener('click',()=>{input.cancelPlacement();status.textContent='BUILD PLACEMENT CANCELLED';contextSignature='';refreshContext(input.selected());});context.appendChild(cancel);return;
  }
  if(!e?.alive){setCommandHeader('FIELD COMMAND','Tap a friendly unit or the Command Post.');return;}

  const def=registry.definition(e.definitionId);
  if(e.operational===false&&e.construction){
    const pct=Math.min(100,Math.floor((e.construction.progressTicks||0)/Math.max(1,e.construction.buildTimeTicks||1)*100));setCommandHeader(`CONSTRUCTION — ${def.name.toUpperCase()}`,`${pct}% COMPLETE · SITE IS REAL, BLOCKING AND DAMAGEABLE`);
    const refund=Math.round((e.construction.cost||0)*(e.construction.refundFraction??.75));const b=document.createElement('button');b.textContent=`CANCEL CONSTRUCTION · +$${refund}`;b.addEventListener('click',()=>{sim.issueCancelConstruction(e.id);status.textContent='CANCEL CONSTRUCTION';contextSignature='';});context.appendChild(b);return;
  }

  const setBinding=registry.module(def,'CommandSet'),set=setBinding?registry.commandSet(setBinding.id):null;
  if(registry.module(def,'Builder'))setCommandHeader(`BUILD — ${def.name.toUpperCase()}`,'Choose a structure. Locked entries show the exact prerequisite.');
  else if(e.production)setCommandHeader(`PRODUCTION — ${def.name.toUpperCase()}`,'Queue units with the same deterministic production system.');
  else if(e.collector)setCommandHeader(`HARVESTER — ${def.name.toUpperCase()}`,'Tap a crystal field to harvest; cargo returns to an operational Refinery.');
  else setCommandHeader(`UNIT — ${def.name.toUpperCase()}`,e.locomotorId?'Tap terrain to move · tap a hostile to attack.':'No contextual commands.');

  for(const cmd of set?.commands||[]){
    const b=document.createElement('button');
    if(cmd.type==='BUILD_STRUCTURE'){
      const target=registry.definition(cmd.definition),cfg=registry.module(target,'Construction'),check=sim.construction.eligibility(e.id,cmd.definition);
      b.textContent=`${cmd.label||target.name.toUpperCase()} · $${cfg?.credits??0}${check.ok?'':` · ${commandStatusLabel(check)}`}`;b.disabled=!check.ok;b.className=check.ok?'build-ready':'locked';b.addEventListener('click',()=>input.beginPlacement(cmd.definition));context.appendChild(b);continue;
    }
    if(cmd.type==='PRODUCE'){
      const target=registry.definition(cmd.definition),cost=registry.module(target,'ProductionCost'),check=sim.production.canQueue(e.id,cmd.definition);
      b.textContent=`${cmd.label||target.name.toUpperCase()} · $${cost?.credits??0}${check.ok?'':` · ${commandStatusLabel(check)}`}`;b.disabled=!check.ok;b.className=check.ok?'build-ready':'locked';b.addEventListener('click',()=>{sim.issueProduce(e.id,cmd.definition);status.textContent=`QUEUE ${(cmd.label||target.name).toUpperCase()}`;contextSignature='';});context.appendChild(b);continue;
    }
    if(cmd.type==='CANCEL_PRODUCTION'){
      if(!e.production?.queue?.length)continue;b.textContent=cmd.label||'CANCEL LAST';b.addEventListener('click',()=>{sim.issueCancelProduction(e.id);status.textContent='CANCEL PRODUCTION';contextSignature='';});context.appendChild(b);continue;
    }
    if(cmd.type==='RETURN_CARGO'){
      b.textContent=cmd.label||'RETURN CARGO';b.disabled=(e.collector?.cargo??0)<=0;b.className=b.disabled?'locked':'';b.addEventListener('click',()=>{sim.issueReturnCargo([e.id]);status.textContent='RETURN CARGO';});context.appendChild(b);continue;
    }
  }
}

function focusOn(e){if(!e)return;view.camera.position.set(e.x-58,(e.y??0)+125,e.z+135);view.camera.lookAt(e.x,e.y??0,e.z);}

input=new InputController({canvas,renderer:view,sim,
  onSelection:e=>{view.setSelection(e);selectionLabel.textContent=selectionText(e);contextSignature='';refreshContext(e);},
  onStatus:s=>status.textContent=s,
  onPlacementChanged:()=>{contextSignature='';refreshContext(input.selected());}
});

$('#stop').addEventListener('click',()=>input.stop());
$('#center').addEventListener('click',()=>focusOn(input.selected()));
$('#clear').addEventListener('click',()=>{input.clear();contextSignature='';refreshContext(null);});

let accumulator=0,last=performance.now();
function frame(now){
  const dt=Math.min(.1,(now-last)/1000);last=now;accumulator+=dt;
  while(accumulator>=FIXED_DT){sim.step(FIXED_DT);accumulator-=FIXED_DT;}
  view.sync(sim);const selected=input.selected();view.setSelection(selected);selectionLabel.textContent=selectionText(selected);refreshContext(selected);view.render();
  const player=sim.players.get('player');economyLabel.textContent=`$${Math.floor(player?.credits??0).toLocaleString()} · PWR ${Math.round(player?.powerProduced??0)}/${Math.round(player?.powerUsed??0)}${player?.lowPower?' · LOW':''}`;
  const aiState=selected?.ai?.state?` · ${selected.ai.state}`:'',target=selected?.combat?.activeTargetId?` · TARGET ${selected.combat.activeTargetId}`:'',maneuver=selected?.locomotionState?.mode&&selected.locomotionState.mode!=='FORWARD'?` · ${selected.locomotionState.mode.replaceAll('_',' ')}`:'',collect=selected?.collector?.state&&selected.collector.state!=='IDLE'?` · ${selected.collector.state.replaceAll('_',' ')}`:'',queue=selected?.production?.queue?.[0]?` · BUILD ${selected.production.queue[0].definitionId.toUpperCase()}`:'',construction=selected?.operational===false&&selected?.construction?` · ${selected.construction.state.replaceAll('_',' ')} ${Math.floor((selected.construction.progressTicks||0)/Math.max(1,selected.construction.buildTimeTicks||1)*100)}%`:'';
  tickLabel.textContent=`TICK ${sim.tick}${aiState}${maneuver}${target}${collect}${queue}${construction}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const hq=sim.entities.get('p_hq');if(hq){input.selectById(hq.id);focusOn(hq);}else refreshContext(null);
status.textContent='READY · CONSTRUCTION FIELD TEST · BUILD POWER NODE FIRST';
window.ForgeRTS={sim,view,input,registry,map,snapshot:()=>sim.snapshot(),restore:s=>sim.restore(s)};
