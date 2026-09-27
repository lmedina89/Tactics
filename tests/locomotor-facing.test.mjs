import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stepLocomotor} from '../engine/locomotion/locomotor.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
const terrain={map:{size:{width:500,depth:500}},heightAt:()=>0};
const makeEntity=(goal,yaw=0,terminal=goal)=>({x:0,z:0,y:0,yaw,speed:0,angularSpeed:0,steeringAngle:0,movingBackward:false,locomotionState:{mode:'FORWARD',modeTime:0,cooldown:0,reverseStartX:0,reverseStartZ:0,turnSign:1},ai:{goal,adjustedDestination:terminal}});

function angleDelta(a,b){let d=a-b;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d;}

test('tracked locomotor pivots hull toward a hard turn before accelerating',async()=>{
  const cfg=await read('data/locomotors/tracked.json');
  const e=makeEntity({x:100,z:0});
  for(let i=0;i<18;i++)stepLocomotor(e,cfg,1/30,terrain);
  assert.ok(e.yaw>0.55,`yaw ${e.yaw}`);
  assert.ok(Math.abs(e.angularSpeed)>0.2);
  assert.equal(e.movingBackward,false);
});

test('tracked locomotor only reverses for a short tactical destination',async()=>{
  const cfg=await read('data/locomotors/tracked.json');
  const short=makeEntity({x:0,z:-3});
  for(let i=0;i<20;i++)stepLocomotor(short,cfg,1/30,terrain);
  assert.equal(short.movingBackward,true);
  const long=makeEntity({x:0,z:-40});
  for(let i=0;i<24;i++)stepLocomotor(long,cfg,1/30,terrain);
  assert.equal(long.movingBackward,false);
  assert.ok(Math.abs(long.yaw)>0.45,`long-route tank should pivot toward destination, yaw=${long.yaw}`);
});

test('wheeled locomotor follows an arc instead of pivoting in place',async()=>{
  const cfg=await read('data/locomotors/wheeled.json');
  const e=makeEntity({x:100,z:0});
  stepLocomotor(e,cfg,1/30,terrain);
  assert.ok(Math.abs(e.yaw)<0.03,'wheeled vehicle should not snap/pivot on first frame');
  assert.ok(Math.abs(e.steeringAngle)>0.05,'front steering should engage');
  for(let i=0;i<89;i++)stepLocomotor(e,cfg,1/30,terrain);
  assert.ok(e.yaw>0.45,`yaw ${e.yaw}`);
  assert.ok(e.x>3,'vehicle should arc toward +X');
  assert.ok(e.z>1,'vehicle should still advance along its original forward axis while turning');
});

test('wheeled vehicle may reverse to a nearby point directly behind',async()=>{
  const cfg=await read('data/locomotors/wheeled.json');
  const e=makeEntity({x:0,z:-4});
  for(let i=0;i<30;i++)stepLocomotor(e,cfg,1/30,terrain);
  assert.equal(e.movingBackward,true);
  assert.equal(e.locomotionState.mode,'SHORT_REVERSE');
  assert.ok(e.z< -1.5,`z ${e.z}`);
  assert.ok(Math.abs(angleDelta(e.yaw,0))<0.12,`yaw ${e.yaw}`);
});

test('wheeled vehicle does not reverse an entire long route behind it',async()=>{
  const cfg=await read('data/locomotors/wheeled.json');
  // The immediate path waypoint can be close behind, but the terminal MOVE order is far away.
  const e=makeEntity({x:0,z:-4},0,{x:0,z:-40});
  let reversePath=0,sawThreePoint=false,sawForwardAfter=false,maxAbsYaw=0,px=e.x,pz=e.z;
  for(let i=0;i<150;i++){
    stepLocomotor(e,cfg,1/30,terrain);
    const stepDist=Math.hypot(e.x-px,e.z-pz);px=e.x;pz=e.z;
    if(e.movingBackward)reversePath+=stepDist;
    if(e.locomotionState.mode.startsWith('THREE_POINT'))sawThreePoint=true;
    if(sawThreePoint&&!e.movingBackward)sawForwardAfter=true;
    maxAbsYaw=Math.max(maxAbsYaw,Math.abs(e.yaw));
  }
  assert.equal(sawThreePoint,true,'long behind order should invoke a turn-around maneuver');
  assert.equal(sawForwardAfter,true,'turn-around should transition back to forward travel');
  assert.ok(maxAbsYaw>1.2,`vehicle should rotate substantially during turnaround, peak yaw=${maxAbsYaw}`);
  assert.ok(reversePath<7,`vehicle backed too far before committing forward: ${reversePath}`);
});

test('vehicle render heading offsets match authored GLB forward axes',async()=>{
  const tank=await read('data/units/aegis_x.json');
  const humvee=await read('data/units/hmmwv50.json');
  const harvester=await read('data/units/harvester.json');
  const render=d=>d.modules.find(m=>m.type==='Render');
  const loco=d=>d.modules.find(m=>m.type==='Locomotor');
  assert.ok(Math.abs(render(tank).headingOffset + Math.PI/2)<1e-6);
  assert.ok(Math.abs(render(humvee).headingOffset + Math.PI/2)<1e-6);
  assert.ok(Math.abs(render(harvester).headingOffset)<1e-9);
  assert.equal(loco(harvester).locomotor,'wheeled_heavy');
});
