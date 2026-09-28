import {moduleConfig} from '../entities/game-object.js';

const clone=v=>structuredClone(v);

export class InteractionManager{
  constructor({registry,entityLookup}){
    this.registry=registry;this.entityLookup=entityLookup;this.serial=0;this.sessions=new Map();
  }

  _roles(entity){
    if(!entity)return [];
    const def=this.registry.definition(entity.definitionId);return moduleConfig(def,'InteractionEndpoint')?.roles||[];
  }

  request(protocolId,requesterId,providerId,metadata={}){
    const protocol=this.registry.interaction(protocolId);if(!protocol)throw new Error(`Unknown interaction protocol ${protocolId}`);
    const requester=this.entityLookup(requesterId),provider=this.entityLookup(providerId);
    if(!requester||!provider)throw new Error('Interaction endpoint entity missing');
    const rr=this._roles(requester),pr=this._roles(provider);
    if(protocol.requesterRole&&!rr.includes(protocol.requesterRole))throw new Error(`${requesterId} lacks interaction role ${protocol.requesterRole}`);
    if(protocol.providerRole&&!pr.includes(protocol.providerRole))throw new Error(`${providerId} lacks interaction role ${protocol.providerRole}`);
    const id=`ix:${++this.serial}`;
    const session={id,serial:this.serial,protocolId,requesterId,providerId,state:protocol.initialState,complete:false,metadata:clone(metadata),history:[{state:protocol.initialState,event:null}]};
    this.sessions.set(id,session);return session;
  }

  advance(sessionId,event,payload=null){
    const session=this.sessions.get(sessionId);if(!session)throw new Error(`Unknown interaction session ${sessionId}`);
    if(session.complete)throw new Error(`Interaction session ${sessionId} already complete`);
    const protocol=this.registry.interaction(session.protocolId);
    const t=(protocol.transitions||[]).find(x=>x.from===session.state&&x.event===event);
    if(!t)throw new Error(`Invalid interaction transition ${session.state} --${event}--> ? for ${session.protocolId}`);
    session.state=t.to;session.history.push({state:t.to,event,payload:clone(payload)});
    session.complete=(protocol.terminalStates||[]).includes(t.to);
    return session;
  }

  cancel(sessionId,reason='CANCELLED'){
    const s=this.sessions.get(sessionId);if(!s)return null;s.state=reason;s.complete=true;s.history.push({state:reason,event:'CANCEL'});return s;
  }

  pruneCompleted(maxCompleted=64){const completed=[...this.sessions.values()].filter(s=>s.complete);if(completed.length<=maxCompleted)return 0;completed.sort((a,b)=>(a.serial??Number(a.id.split(':')[1])??0)-(b.serial??Number(b.id.split(':')[1])??0));let removed=0;for(const s of completed.slice(0,completed.length-maxCompleted)){this.sessions.delete(s.id);removed++;}return removed;}

  snapshot(){return {serial:this.serial,sessions:[...this.sessions.values()].map(clone)};}
  restore(state){this.serial=state?.serial??0;this.sessions=new Map((state?.sessions||[]).map(s=>[s.id,clone(s)]));}
}
