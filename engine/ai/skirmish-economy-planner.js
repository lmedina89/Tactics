import {CommandSource,CommandType} from '../commands/command-bus.js';
import {moduleConfig} from '../entities/game-object.js';
import {TeamState} from '../teams/team-manager.js';
import {aiTargetCategories} from './target-evaluator.js';

const clone=v=>structuredClone(v);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const DEG=Math.PI/180;

function alternatingOffsets(count){
  const out=[0];
  for(let i=1;out.length<count;i++){out.push(i);if(out.length<count)out.push(-i);}
  return out;
}

export class SkirmishEconomyPlanner{
  constructor({playerId,profile,map,registry,players,teamManager,entitiesProvider,commandBus,economy,resources,construction,production}){
    this.playerId=playerId;this.profile=profile;this.cfg=profile.economy??{};this.map=map;this.registry=registry;this.players=players;this.teamManager=teamManager;this.entitiesProvider=entitiesProvider;this.commandBus=commandBus;this.economy=economy;this.resources=resources;this.construction=construction;this.production=production;
    const initial=profile.initialDelayTicks??0;this.nextHarvestTick=initial;this.nextConstructionTick=initial;this.nextProductionTick=initial;
  }

  _owned(){return [...this.entitiesProvider()].filter(e=>e.alive&&e.playerId===this.playerId);}
  _player(){return this.players.get(this.playerId)??null;}
  _definition(e){return this.registry.definition(e.definitionId);}
  _module(e,type){const def=this._definition(e);return def?moduleConfig(def,type):null;}
  _issue(type,payload={}){return this.commandBus.issue({type,issuerPlayerId:this.playerId,commandSource:CommandSource.AI,append:false,...clone(payload)});}
  _operationalDefinitionCount(definitionId){return this._owned().filter(e=>e.definitionId===definitionId&&e.operational!==false).length;}
  _ownedDefinitionCount(definitionId){return this._owned().filter(e=>e.definitionId===definitionId).length;}
  _activeConstructionSites(){return this._owned().filter(e=>e.kind==='building'&&e.operational===false&&e.construction).length;}
  _ownedRefineries(){return this._owned().filter(e=>e.operational!==false&&!!this._module(e,'DockingProvider')).sort((a,b)=>a.id.localeCompare(b.id));}

  _resourceCandidates(collector){
    const cfg=this._module(collector,'ResourceCollector');if(!cfg)return [];
    const accepted=new Set(cfg.resourceTypes||[]),refineries=this._ownedRefineries(),origin=refineries.length?refineries.slice().sort((a,b)=>dist(collector,a)-dist(collector,b)||a.id.localeCompare(b.id))[0]:collector;
    const congestion=new Map();for(const h of this._owned())if(h.collector?.targetResourceId)congestion.set(h.collector.targetResourceId,(congestion.get(h.collector.targetResourceId)||0)+1);
    return [...this.entitiesProvider()].filter(e=>e.alive&&e.kind==='resource'&&e.resourceRemaining>0).map(resource=>{
      const rcfg=this._module(resource,'Resource');if(!rcfg||!accepted.has(rcfg.resourceType))return null;
      const approach=this.resources?.findHarvestApproach?.(collector,resource);if(!approach)return null;
      const assigned=congestion.get(resource.id)||0,capacity=Math.max(1,resource.resourceRemaining||1),congestionPenalty=assigned*Math.min(80,2400/capacity);
      return {resource,approach,score:dist(origin,resource)+dist(collector,approach)*0.25+congestionPenalty};
    }).filter(Boolean).sort((a,b)=>a.score-b.score||a.resource.id.localeCompare(b.resource.id));
  }

  _manageHarvesters(tick){
    if(tick<this.nextHarvestTick)return;this.nextHarvestTick=tick+(this.cfg.harvestCheckIntervalTicks??60);
    const refineries=this._ownedRefineries();
    for(const h of this._owned().filter(e=>!!e.collector).sort((a,b)=>a.id.localeCompare(b.id))){
      const c=h.collector;if(c.state!=='IDLE')continue;
      if(c.cargo>0.001){if(refineries.length)this._issue(CommandType.RETURN_CARGO,{entityIds:[h.id]});continue;}
      if(!refineries.length)continue;
      const target=this._resourceCandidates(h)[0]?.resource;if(target)this._issue(CommandType.HARVEST,{entityIds:[h.id],resourceId:target.id});
    }
  }

  _anchorPoint(kind,context){
    if(kind==='DEFENSE')return context.defense??context.home;
    if(kind==='ENEMY')return context.enemyBase??context.defense??context.home;
    if(kind==='RESOURCE'){
      if(context.expansionResource?.alive&&context.expansionResource.resourceRemaining>0)return context.expansionResource;
      const resources=[...this.entitiesProvider()].filter(e=>e.alive&&e.kind==='resource'&&e.resourceRemaining>0).sort((a,b)=>dist(context.home,a)-dist(context.home,b)||a.id.localeCompare(b.id));
      return resources[0]??context.home;
    }
    return context.home;
  }

  _candidateYaw(mode,builder,candidate,target,placement){
    if(Number.isFinite(placement?.yawRadians))return placement.yawRadians;
    if(mode==='FACE_TARGET'&&target)return Math.atan2(target.x-candidate.x,target.z-candidate.z);
    if(mode==='FACE_OUTWARD')return Math.atan2(candidate.x-builder.x,candidate.z-builder.z);
    if(mode==='FACE_HOME')return Math.atan2(builder.x-candidate.x,builder.z-candidate.z);
    return builder.yaw||0;
  }

  _locationSafe(position,radius=this.cfg.constructionSafetyRadius??0){
    if(!(radius>0))return true;
    for(const enemy of this.entitiesProvider()){
      if(!enemy.alive||!enemy.playerId||enemy.playerId===this.playerId)continue;
      const categories=aiTargetCategories(this.registry,enemy);
      if(!categories.includes('COMBAT')&&!categories.includes('DEFENSE'))continue;
      if(dist(position,enemy)<=radius)return false;
    }
    return true;
  }

  _findPlacement(builder,plan,context){
    const p=plan.placement??{},target=this._anchorPoint(p.anchor??'HOME',context),builderDef=this.registry.definition(builder.definitionId),builderCfg=moduleConfig(builderDef,'Builder');
    const maxBuildRadius=Number.isFinite(builderCfg?.placementRadius)?builderCfg.placementRadius:140;
    const minRadius=Math.max(12,p.minRadius??34),maxRadius=Math.min(maxBuildRadius-4,p.maxRadius??Math.max(minRadius,Math.min(132,maxBuildRadius-4))),ringStep=Math.max(4,p.ringStep??12),angleStep=Math.max(7.5,p.angleStepDeg??22.5)*DEG;
    const toward=target&&dist(builder,target)>1?Math.atan2(target.x-builder.x,target.z-builder.z):((p.startAngleDeg??0)*DEG),offsets=alternatingOffsets(Math.max(1,Math.ceil((Math.PI*2)/angleStep)));
    for(let radius=minRadius;radius<=maxRadius+1e-6;radius+=ringStep){
      for(const offset of offsets){
        const a=toward+offset*angleStep,x=builder.x+Math.sin(a)*radius,z=builder.z+Math.cos(a)*radius,candidate={x,z};
        const yaw=this._candidateYaw(p.yawMode??'MATCH_BUILDER',builder,candidate,target,p),check=this.construction.validatePlacement(builder.id,plan.definition,x,z,yaw,this.playerId);
        const safety=(p.safetyRadius??this.cfg.constructionSafetyRadius??0)*(context.strategy?.defenseRadiusScale??1);if(check.ok&&this._locationSafe(candidate,safety))return {x,z,yaw};
      }
    }
    return null;
  }

  _buildPriority(plan){
    let score=plan.priority??0;const def=this.registry.definition(plan.definition),player=this._player();if(player?.lowPower&&moduleConfig(def,'PowerProducer'))score+=100000;return score;
  }

  _manageConstruction(tick,context){
    if(tick<this.nextConstructionTick)return;this.nextConstructionTick=tick+Math.max(1,Math.round((this.cfg.constructionCheckIntervalTicks??45)*(context.strategy?.constructionIntervalScale??1)));
    const maxActive=Math.max(1,this.cfg.maxActiveConstructionSites??1);if(this._activeConstructionSites()>=maxActive)return;
    const plans=[...(this.cfg.buildList||[])].sort((a,b)=>this._buildPriority(b)-this._buildPriority(a)||a.definition.localeCompare(b.definition));
    for(const plan of plans){
      const desired=Math.max(0,context.strategy?.buildCountOverrides?.[plan.definition]??plan.desiredCount??0);if(this._ownedDefinitionCount(plan.definition)>=desired)continue;
      const builders=this._owned().filter(e=>e.operational!==false&&!!this._module(e,'Builder')&&(this._module(e,'Builder').buildable||[]).includes(plan.definition)).sort((a,b)=>a.id.localeCompare(b.id));
      for(const builder of builders){
        const eligible=this.construction.eligibility(builder.id,plan.definition,this.playerId);if(!eligible.ok)continue;
        const placement=this._findPlacement(builder,plan,context);if(!placement)continue;
        this._issue(CommandType.BUILD_STRUCTURE,{sourceId:builder.id,definitionId:plan.definition,...placement});return;
      }
    }
  }

  _queuedCounts(){
    const counts=new Map();
    for(const e of this._owned())for(const q of e.production?.queue||[])counts.set(q.definitionId,(counts.get(q.definitionId)||0)+1);
    return counts;
  }

  _freeCount(definitionId){return this._owned().filter(e=>e.definitionId===definitionId&&e.operational!==false&&!e.teamId).length;}
  _demandMap(strategy={}){
    const demand=new Map(),add=(definitionId,count,priority,reason)=>{if(count<=0)return;const cur=demand.get(definitionId);if(!cur)demand.set(definitionId,{definitionId,count,priority,reason});else {cur.count+=count;cur.priority=Math.max(cur.priority,priority);cur.reason+=`+${reason}`;}};
    const harvester=this.cfg.harvester;if(harvester?.definition){const alive=this._ownedDefinitionCount(harvester.definition),desired=Math.max(0,(harvester.desiredCount??0)+(strategy.desiredHarvesterDelta??0));add(harvester.definition,Math.max(0,desired-alive),harvester.priority??1000,'GATHERER');}
    const planPriority=new Map((this.profile.teamPlans||[]).map(p=>[p.id,p.productionPriority??500]));
    for(const team of this.teamManager.teams.values()){
      if(team.playerId!==this.playerId||![TeamState.RECRUITING,TeamState.REFORMING].includes(team.state))continue;const proto=this.teamManager.prototype(team.prototypeId);if(!proto)continue;
      const members=this.teamManager.members(team);for(const entry of proto.composition||[]){const have=members.filter(e=>e.definitionId===entry.definition).length;add(entry.definition,Math.max(0,(entry.min??0)-have),planPriority.get(team.planId)??500,`TEAM:${team.planId??team.prototypeId}`);}
    }
    for(const reserve of this.cfg.unitReserves||[]){const free=this._freeCount(reserve.definition);add(reserve.definition,Math.max(0,(reserve.desiredFree??0)-free),reserve.priority??250,'RESERVE');}
    return demand;
  }

  _findProducer(definitionId){
    const candidates=[];
    for(const e of this._owned()){
      if(e.operational===false||!e.production)continue;const cfg=this._module(e,'Production');if(!cfg||(cfg.buildable||[]).includes(definitionId)===false)continue;
      const check=this.production.canQueue(e.id,definitionId);if(check.ok)candidates.push({entity:e,queueLength:e.production.queue.length});
    }
    candidates.sort((a,b)=>a.queueLength-b.queueLength||a.entity.id.localeCompare(b.entity.id));return candidates[0]?.entity??null;
  }

  _manageProduction(tick,strategy={}){
    if(tick<this.nextProductionTick)return;this.nextProductionTick=tick+Math.max(1,Math.round((this.cfg.productionCheckIntervalTicks??30)*(strategy.productionIntervalScale??1)));
    const queued=this._queuedCounts(),demands=[...this._demandMap(strategy).values()].map(d=>({...d,count:Math.max(0,d.count-(queued.get(d.definitionId)||0))})).filter(d=>d.count>0).sort((a,b)=>b.priority-a.priority||a.definitionId.localeCompare(b.definitionId));
    for(const d of demands){const producer=this._findProducer(d.definitionId);if(!producer)continue;this._issue(CommandType.PRODUCE,{producerId:producer.id,definitionId:d.definitionId});return;}
  }

  update(tick,context){this._manageHarvesters(tick);this._manageConstruction(tick,context);this._manageProduction(tick,context.strategy??{});}
  snapshot(){return {nextHarvestTick:this.nextHarvestTick,nextConstructionTick:this.nextConstructionTick,nextProductionTick:this.nextProductionTick};}
  restore(state={}){if('nextHarvestTick'in state)this.nextHarvestTick=state.nextHarvestTick??0;if('nextConstructionTick'in state)this.nextConstructionTick=state.nextConstructionTick??0;if('nextProductionTick'in state)this.nextProductionTick=state.nextProductionTick??0;}
}
