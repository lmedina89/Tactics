import {ObjectiveManager} from './objective-manager.js';
import {MissionConditions} from './mission-conditions.js';
import {MissionActions} from './mission-actions.js';
import {validateMissionDefinition} from './mission-validator.js';

const clone=v=>structuredClone(v);
const TICKS_PER_SECOND=30;

export class MissionSystem{
  constructor({simulation,triggerAreas,mission=null}){
    this.sim=simulation;this.triggerAreas=triggerAreas;this.definition=mission?validateMissionDefinition(mission,{map:simulation.map}):null;
    this.flags=new Map(Object.entries(this.definition?.initialFlags||{}));this.counters=new Map(Object.entries(this.definition?.initialCounters||{}).map(([k,v])=>[k,Number(v)||0]));this.timers=new Map();this.outcome={state:'RUNNING',tick:null,playerId:null,reason:null};
    this.objectives=new ObjectiveManager(this.definition?.objectives||[]);this.scripts=new Map();
    for(const s of this.definition?.scripts||[])this.scripts.set(s.id,{id:s.id,enabled:s.enabled!==false,oneShot:s.oneShot!==false,evaluationIntervalTicks:Math.max(1,s.evaluationIntervalTicks??1),nextEvaluationTick:s.startTick??0,firedCount:0,lastResult:false,lastFiredTick:null});
    this.conditions=new MissionConditions({simulation:this.sim,missionSystem:this,triggerAreas:this.triggerAreas,objectives:this.objectives});this.actions=new MissionActions({simulation:this.sim,missionSystem:this,objectives:this.objectives});
    for(const t of this.definition?.initialTimers||[])this.startTimer(t.id,{tick:t.startTick??0,durationTicks:t.durationTicks,durationSeconds:t.durationSeconds});
  }
  get active(){return !!this.definition;}
  flag(id){return this.flags.get(id)??false;}setFlag(id,v){this.flags.set(id,v);return v;}
  counter(id){return this.counters.get(id)??0;}setCounter(id,v){const n=Number(v)||0;this.counters.set(id,n);return n;}
  startTimer(id,{tick=this.sim.tick,durationTicks=null,durationSeconds=null}={}){if(!id)throw new Error('Timer id required');const duration=Math.max(0,durationTicks??Math.round((durationSeconds??0)*TICKS_PER_SECOND));const timer={id,startTick:tick,durationTicks:duration,expiresTick:tick+duration};this.timers.set(id,timer);return timer;}
  timer(id){return this.timers.get(id)??null;}timerExpired(id,tick=this.sim.tick){const t=this.timer(id);return !!t&&tick>=t.expiresTick;}
  setScriptEnabled(id,enabled,tick=this.sim.tick){const s=this.scripts.get(id);if(!s)return false;s.enabled=!!enabled;if(enabled&&s.nextEvaluationTick<tick)s.nextEvaluationTick=tick;return true;}
  setOutcome(state,tick=this.sim.tick,{playerId=null,reason=null}={}){if(this.outcome.state!=='RUNNING')return false;this.outcome={state,tick,playerId,reason};return true;}
  step(tick){
    if(!this.active||this.outcome.state!=='RUNNING')return;
    for(const def of this.definition.scripts){const runtime=this.scripts.get(def.id);if(!runtime?.enabled||tick<runtime.nextEvaluationTick)continue;runtime.nextEvaluationTick=tick+runtime.evaluationIntervalTicks;const result=this.conditions.evaluate(def.condition);runtime.lastResult=result;if(!result)continue;for(const action of def.actions||[])this.actions.execute(action,tick);runtime.firedCount++;runtime.lastFiredTick=tick;if(runtime.oneShot)runtime.enabled=false;if(this.outcome.state!=='RUNNING')break;}
  }
  snapshot(){return {missionId:this.definition?.id??null,missionVersion:this.definition?.missionVersion??null,flags:[...this.flags.entries()].sort(([a],[b])=>a.localeCompare(b)),counters:[...this.counters.entries()].sort(([a],[b])=>a.localeCompare(b)),timers:[...this.timers.values()].map(clone).sort((a,b)=>a.id.localeCompare(b.id)),scripts:[...this.scripts.values()].map(clone).sort((a,b)=>a.id.localeCompare(b.id)),objectives:this.objectives.snapshot(),outcome:clone(this.outcome)};}
  restore(state={}){
    const incomingId=state.missionId??null,currentId=this.definition?.id??null;if(incomingId!==currentId)throw new Error(`Mission snapshot mismatch: ${incomingId??'none'} != ${currentId??'none'}`);
    this.flags=new Map(state.flags||[]);this.counters=new Map(state.counters||[]);this.timers=new Map((state.timers||[]).map(t=>[t.id,clone(t)]));this.outcome=clone(state.outcome??{state:'RUNNING',tick:null,playerId:null,reason:null});
    const runtime=new Map((state.scripts||[]).map(s=>[s.id,clone(s)]));for(const id of this.scripts.keys())if(runtime.has(id))this.scripts.set(id,runtime.get(id));this.objectives.restore(state.objectives??{});
  }
}
