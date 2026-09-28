import {moduleConfig} from '../entities/game-object.js';
import {aiTargetCategories} from './target-evaluator.js';

const clone=v=>structuredClone(v);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const WEALTH_RANK={POOR:0,NORMAL:1,WEALTHY:2};
const finite=(v,fallback)=>Number.isFinite(v)?v:fallback;

/**
 * Timer-bounded strategic assessment layer inspired by Generals' separation of
 * global AI policy (wealth/difficulty/team choice) from Team and unit execution.
 * It never mutates GameObjects or economy state; it only produces deterministic
 * policy consumed by the normal Team/Economy planners.
 */
export class StrategicAIPlanner{
  constructor({playerId,profile,mapConfig={},players,registry,entitiesProvider,relations=null}){
    this.playerId=playerId;this.profile=profile;this.cfg=profile.strategy??{};this.mapConfig=mapConfig;this.players=players;this.registry=registry;this.entitiesProvider=entitiesProvider;this.relations=relations;
    this.difficulty=mapConfig.difficulty??profile.defaultDifficulty??'NORMAL';
    this.personalityId=mapConfig.personality??this.cfg.defaultPersonality??this.cfg.personality?.id??'BALANCED';
    this.nextAssessmentTick=profile.initialDelayTicks??0;
    this.state={wealthState:'NORMAL',enemyCategoryCounts:{},planChoices:{},constructionIntervalScale:1,productionIntervalScale:1,teamIntervalScale:1,desiredHarvesterDelta:0,buildCountOverrides:{},expansionResourceId:null,personality:this.personalityId,aggressionScale:1,economyScale:1,defenseRadiusScale:1,economicDefenseHoldScale:1};
  }

  _owned(){return [...this.entitiesProvider()].filter(e=>e.alive&&e.playerId===this.playerId);}
  _enemies(){return [...this.entitiesProvider()].filter(e=>e.alive&&this.relations?.isEnemy(this.playerId,e.playerId));}
  _player(){return this.players.get(this.playerId)??null;}
  _wealthState(){const credits=this._player()?.credits??0,w=this.cfg.wealth??{};if(credits<finite(w.poorBelow,1200))return 'POOR';if(credits>finite(w.wealthyAbove,5000))return 'WEALTHY';return 'NORMAL';}
  _enemyCategories(){const counts={};for(const e of this._enemies())for(const c of aiTargetCategories(this.registry,e))counts[c]=(counts[c]??0)+1;return counts;}
  _difficulty(){return this.cfg.difficulties?.[this.difficulty]??this.cfg.difficulties?.NORMAL??{};}
  _wealthTuning(state){return this.cfg.wealth?.states?.[state]??{};}
  _personality(){const fallback=this.cfg.personality??{},p=this.cfg.personalities?.[this.personalityId]??fallback;return {id:this.personalityId,aggression:Math.max(0.25,finite(p.aggression,1)),economy:Math.max(0.25,finite(p.economy,1)),defense:Math.max(0.25,finite(p.defense,1))};}

  _variantAllowed(v,wealth){if(v.minWealth&&WEALTH_RANK[wealth]<WEALTH_RANK[v.minWealth])return false;if(v.maxWealth&&WEALTH_RANK[wealth]>WEALTH_RANK[v.maxWealth])return false;return true;}
  _choosePlanVariant(plan,counts,wealth,personality){
    if(!plan.variants?.length)return plan.prototype??null;
    let best=null,bestScore=-Infinity;
    for(const v of plan.variants){
      if(!this._variantAllowed(v,wealth))continue;
      let score=finite(v.basePriority,0)+finite(v.personalityBias?.[personality],0)+finite(v.wealthBias?.[wealth],0);
      for(const [category,weight] of Object.entries(v.counterWeights??{}))score+=(counts[category]??0)*weight;
      if(score>bestScore+1e-9||(Math.abs(score-bestScore)<=1e-9&&(v.prototype??'~')<(best?.prototype??'~'))){best=v;bestScore=score;}
    }
    return best?.prototype??plan.prototype??plan.variants[0]?.prototype??null;
  }

  _assessExpansion(wealth){
    const cfg=this.cfg.expansion??{},out={buildCountOverrides:{},expansionResourceId:null};if(!cfg.enabled)return out;
    if(cfg.allowedWealthStates?.length&&!cfg.allowedWealthStates.includes(wealth))return out;
    const refineryDef=cfg.refineryDefinition;if(!refineryDef)return out;const refineries=this._owned().filter(e=>e.operational!==false&&e.definitionId===refineryDef);if(!refineries.length||refineries.length>=(cfg.maxRefineries??2))return out;
    const resources=[...this.entitiesProvider()].filter(e=>e.alive&&e.kind==='resource'&&e.resourceRemaining>0);
    const localRadius=cfg.localResourceRadius??90,local=resources.filter(r=>refineries.some(f=>dist(f,r)<=localRadius));
    // No local baseline means there is nothing meaningful to call depleted. Do not
    // interpret an empty neighborhood as 0% remaining and trigger an instant expansion.
    if(!local.length)return out;
    const cap=local.reduce((s,r)=>s+Math.max(1,r.initialResourceCapacity??r.resourceRemaining??1),0),remain=local.reduce((s,r)=>s+Math.max(0,r.resourceRemaining??0),0),fraction=cap>0?remain/cap:1;
    if(fraction>(cfg.triggerLocalRemainingFraction??0.25))return out;
    const minRemote=cfg.minRemoteRemaining??900,minDistance=cfg.minDistanceFromRefinery??80;
    const candidates=resources.filter(r=>(r.resourceRemaining??0)>=minRemote&&refineries.every(f=>dist(f,r)>=minDistance)).sort((a,b)=>{
      const da=Math.min(...refineries.map(f=>dist(f,a))),db=Math.min(...refineries.map(f=>dist(f,b)));return da-db||a.id.localeCompare(b.id);
    });
    if(!candidates.length)return out;
    out.buildCountOverrides[refineryDef]=Math.min(cfg.maxRefineries??2,refineries.length+1);out.expansionResourceId=candidates[0].id;return out;
  }

  update(tick){
    if(tick<this.nextAssessmentTick)return this.state;
    const interval=Math.max(1,this.cfg.assessmentIntervalTicks??150);this.nextAssessmentTick=tick+interval;
    const wealthState=this._wealthState(),counts=this._enemyCategories(),difficulty=this._difficulty(),wealthTune=this._wealthTuning(wealthState),personalityCfg=this._personality(),personality=personalityCfg.id;
    const planChoices={};for(const plan of this.profile.teamPlans??[]){const id=this._choosePlanVariant(plan,counts,wealthState,personality);if(id)planChoices[plan.id]=id;}
    const expansion=this._assessExpansion(wealthState);
    this.state={
      wealthState,enemyCategoryCounts:counts,planChoices,
      constructionIntervalScale:finite(difficulty.constructionIntervalScale,1)*finite(wealthTune.constructionIntervalScale,1)/personalityCfg.economy,
      productionIntervalScale:finite(difficulty.productionIntervalScale,1)*finite(wealthTune.productionIntervalScale,1)/personalityCfg.economy,
      teamIntervalScale:finite(difficulty.teamIntervalScale,1)*finite(wealthTune.teamIntervalScale,1)/personalityCfg.aggression,
      desiredHarvesterDelta:Math.trunc(finite(difficulty.desiredHarvesterDelta,0)),
      buildCountOverrides:expansion.buildCountOverrides,expansionResourceId:expansion.expansionResourceId,personality,aggressionScale:personalityCfg.aggression,economyScale:personalityCfg.economy,defenseRadiusScale:personalityCfg.defense,economicDefenseHoldScale:personalityCfg.defense
    };
    return this.state;
  }

  prototypeForPlan(plan){return this.state.planChoices?.[plan.id]??plan.prototype??plan.variants?.[0]?.prototype??null;}
  snapshot(){return {difficulty:this.difficulty,personalityId:this.personalityId,nextAssessmentTick:this.nextAssessmentTick,state:clone(this.state)};}
  restore(s={}){this.difficulty=s.difficulty??this.difficulty;this.personalityId=s.personalityId??this.personalityId;this.nextAssessmentTick=s.nextAssessmentTick??0;if(s.state)this.state=clone(s.state);}
}
