export const PlayerRelation=Object.freeze({
  SELF:'SELF',ALLY:'ALLY',NEUTRAL:'NEUTRAL',ENEMY:'ENEMY'
});

const AUTHORED_RELATIONS=new Set([PlayerRelation.ALLY,PlayerRelation.NEUTRAL,PlayerRelation.ENEMY]);
const clone=v=>structuredClone(v);

/**
 * Authoritative directional player-to-player relationship state.
 *
 * Inspired by Generals' PlayerRelationMap separation, but implemented as original
 * ForgeRTS JavaScript. Content affiliation (FACTION/CIVILIAN/NEUTRAL/WORLD) is
 * intentionally unrelated to diplomacy.
 */
export class PlayerRelationMap{
  constructor({playerIds=[],entries=[]}={}){
    this.playerIds=new Set(playerIds);
    this.relations=new Map();
    this.reset(entries);
  }

  _key(fromPlayerId,toPlayerId){return `${fromPlayerId}\u0000${toPlayerId}`;}
  _known(playerId){return playerId!=null&&this.playerIds.has(playerId);}

  get(fromPlayerId,toPlayerId){
    if(fromPlayerId==null||toPlayerId==null)return PlayerRelation.NEUTRAL;
    if(fromPlayerId===toPlayerId)return PlayerRelation.SELF;
    const explicit=this.relations.get(this._key(fromPlayerId,toPlayerId));
    if(explicit)return explicit;
    // Preserve pre-v0.6.6 behavior for authored players unless the map says otherwise.
    // Neutral/civilian diplomacy must be explicit instead of inferred from ContentMeta.
    return this._known(fromPlayerId)&&this._known(toPlayerId)?PlayerRelation.ENEMY:PlayerRelation.NEUTRAL;
  }

  isEnemy(fromPlayerId,toPlayerId){return this.get(fromPlayerId,toPlayerId)===PlayerRelation.ENEMY;}
  isNeutral(fromPlayerId,toPlayerId){return this.get(fromPlayerId,toPlayerId)===PlayerRelation.NEUTRAL;}
  isAllied(fromPlayerId,toPlayerId){const r=this.get(fromPlayerId,toPlayerId);return r===PlayerRelation.SELF||r===PlayerRelation.ALLY;}

  set(fromPlayerId,toPlayerId,relation){
    if(!this._known(fromPlayerId)||!this._known(toPlayerId))throw new Error(`Unknown player relation endpoint ${fromPlayerId} -> ${toPlayerId}`);
    if(fromPlayerId===toPlayerId)throw new Error('SELF relation is implicit and cannot be authored');
    if(!AUTHORED_RELATIONS.has(relation))throw new Error(`Unsupported player relation ${relation}`);
    this.relations.set(this._key(fromPlayerId,toPlayerId),relation);return relation;
  }

  remove(fromPlayerId,toPlayerId){return this.relations.delete(this._key(fromPlayerId,toPlayerId));}

  reset(entries=[]){
    this.relations.clear();
    for(const entry of entries||[])this.set(entry.from,entry.to,entry.relation);
  }

  snapshot(){
    const relations=[];
    for(const [key,relation] of this.relations){const [from,to]=key.split('\u0000');relations.push({from,to,relation});}
    relations.sort((a,b)=>a.from.localeCompare(b.from)||a.to.localeCompare(b.to)||a.relation.localeCompare(b.relation));
    return {relations:clone(relations)};
  }

  restore(state={}){this.reset(state.relations??[]);}
}
