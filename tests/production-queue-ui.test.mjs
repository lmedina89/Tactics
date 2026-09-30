import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {productionQueueModel,productionUiEligibility,productionSlotView} from '../ui/production-queue-view.js';
import {CommandType} from '../engine/commands/command-bus.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const registry={
  defs:new Map([
    ['vehicle_factory',{id:'vehicle_factory',modules:[{type:'Production',queueLimit:5}]}],
    ['hmmwv50',{id:'hmmwv50',name:'HMMWV-50',modules:[{type:'ProductionCost',credits:450}]}],
    ['aegis_x',{id:'aegis_x',name:'Aegis-X',modules:[{type:'ProductionCost',credits:1100}]}]
  ]),
  definition(id){return this.defs.get(id);},
  module(def,type){return def?.modules?.find(m=>m.type===type)||null;}
};

test('production queue UI projects actual + not-yet-simulated commands into five stable slots',()=>{
  const producer={id:'factory',definitionId:'vehicle_factory',production:{queue:[{definitionId:'hmmwv50',state:'BUILDING',progressTicks:45,buildTimeTicks:180}]}};
  const commandBus={queue:[
    {serial:1,type:CommandType.PRODUCE,producerId:'factory',definitionId:'aegis_x'},
    {serial:2,type:CommandType.PRODUCE,producerId:'factory',definitionId:'hmmwv50'}
  ]};
  const model=productionQueueModel({registry,commandBus,producer});
  assert.equal(model.limit,5);assert.equal(model.used,3);assert.equal(model.pendingCost,1550);
  assert.deepEqual(model.slots.map(x=>x.kind),['ACTUAL','PENDING','PENDING','EMPTY','EMPTY']);
  assert.deepEqual(productionSlotView(registry,model.slots[0],0),{name:'HMMWV-50',status:'BUILDING 25%',progress:25,kind:'BUILDING'});
  assert.equal(productionSlotView(registry,model.slots[1],1).status,'ORDER SENT');
});

test('production UI reserves pending queue slots and pending credits before the next 30 Hz tick',()=>{
  const producer={id:'factory',definitionId:'vehicle_factory',production:{queue:[{definitionId:'hmmwv50',state:'BUILDING',progressTicks:1,buildTimeTicks:180},{definitionId:'hmmwv50',state:'QUEUED',progressTicks:0,buildTimeTicks:180},{definitionId:'hmmwv50',state:'QUEUED',progressTicks:0,buildTimeTicks:180}]}};
  const commandBus={queue:[{serial:7,type:CommandType.PRODUCE,producerId:'factory',definitionId:'aegis_x'}]};
  let r=productionUiEligibility({registry,commandBus,producer,credits:2000,definitionId:'hmmwv50',baseCheck:{ok:true,reason:'OK'}});assert.equal(r.ok,true);
  commandBus.queue.push({serial:8,type:CommandType.PRODUCE,producerId:'factory',definitionId:'hmmwv50'});
  r=productionUiEligibility({registry,commandBus,producer,credits:2000,definitionId:'hmmwv50',baseCheck:{ok:true,reason:'OK'}});assert.equal(r.reason,'QUEUE_FULL');
  commandBus.queue.splice(1,1);
  r=productionUiEligibility({registry,commandBus,producer,credits:1200,definitionId:'hmmwv50',baseCheck:{ok:true,reason:'OK'}});assert.equal(r.reason,'INSUFFICIENT_CREDITS');
});

test('mobile production controls do not rebuild from per-tick production progress',async()=>{
  const main=await fs.readFile(path.join(root,'main.js'),'utf8');
  assert.match(main,/Production controls must stay mounted while a unit is building/);
  assert.match(main,/updateProductionQueuePanel\(selected\)/);
  assert.match(main,/data-produce-definition|produceDefinition/);
  const sigLine=main.split('\n').find(x=>x.includes('const sig=JSON.stringify'))||'';
  assert.equal(sigLine.includes('production?.queue'),false,'production progress leaked back into the DOM rebuild signature');
});
