export const ObjectiveState=Object.freeze({INACTIVE:'INACTIVE',ACTIVE:'ACTIVE',COMPLETED:'COMPLETED',FAILED:'FAILED'});
const VALID_STATES=new Set(Object.values(ObjectiveState));
const clone=v=>structuredClone(v);

export class ObjectiveManager{
  constructor(objectives=[]){
    this.objectives=new Map();
    for(const raw of objectives||[]){
      const state=raw.initialState??ObjectiveState.INACTIVE;
      if(!VALID_STATES.has(state))throw new Error(`Objective ${raw.id} has invalid initialState ${state}`);
      this.objectives.set(raw.id,{id:raw.id,text:raw.text??raw.id,kind:raw.kind??'PRIMARY',optional:raw.optional===true,marker:raw.marker?clone(raw.marker):null,state,activatedTick:state===ObjectiveState.ACTIVE?0:null,completedTick:null,failedTick:null});
    }
  }
  objective(id){return this.objectives.get(id)??null;}
  state(id){return this.objective(id)?.state??null;}
  setState(id,state,tick=0){
    if(!VALID_STATES.has(state))throw new Error(`Invalid objective state ${state}`);
    const o=this.objective(id);if(!o)return false;if(o.state===state)return true;
    o.state=state;
    if(state===ObjectiveState.ACTIVE)o.activatedTick=tick;
    if(state===ObjectiveState.COMPLETED)o.completedTick=tick;
    if(state===ObjectiveState.FAILED)o.failedTick=tick;
    return true;
  }
  activate(id,tick=0){return this.setState(id,ObjectiveState.ACTIVE,tick);}
  complete(id,tick=0){return this.setState(id,ObjectiveState.COMPLETED,tick);}
  fail(id,tick=0){return this.setState(id,ObjectiveState.FAILED,tick);}
  list(){return [...this.objectives.values()].map(clone);}
  snapshot(){return {objectives:this.list()};}
  restore(state={}){
    const incoming=new Map((state.objectives||[]).map(o=>[o.id,clone(o)]));
    for(const [id,o] of this.objectives){const saved=incoming.get(id);if(saved)this.objectives.set(id,saved);}
  }
}
