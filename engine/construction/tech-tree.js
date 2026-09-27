import {moduleConfig} from '../entities/game-object.js';

export class TechTreeSystem{
  constructor({registry,economy,entityLookup,entitiesProvider}){this.registry=registry;this.economy=economy;this.entityLookup=entityLookup;this.entitiesProvider=entitiesProvider;}

  completedCount(playerId,definitionId){
    let n=0;for(const e of this.entitiesProvider())if(e.alive&&e.operational!==false&&e.playerId===playerId&&e.definitionId===definitionId)n++;return n;
  }
  ownedCount(playerId,definitionId){
    let n=0;for(const e of this.entitiesProvider())if(e.alive&&e.playerId===playerId&&e.definitionId===definitionId)n++;return n;
  }

  status({playerId,sourceId,definitionId,ignoreCredits=false}){
    const source=this.entityLookup(sourceId),def=this.registry.definition(definitionId),cfg=def?moduleConfig(def,'Construction'):null;
    if(!source?.alive||source.playerId!==playerId)return {ok:false,reason:'INVALID_BUILDER'};
    if(source.operational===false)return {ok:false,reason:'BUILDER_NOT_OPERATIONAL'};
    const sourceDef=this.registry.definition(source.definitionId),builder=sourceDef?moduleConfig(sourceDef,'Builder'):null;
    if(!builder)return {ok:false,reason:'NOT_A_BUILDER'};
    if(!def||def.kind!=='building'||!cfg)return {ok:false,reason:'NOT_BUILDABLE'};
    if(!(builder.buildable||[]).includes(definitionId))return {ok:false,reason:'NOT_IN_BUILD_SET'};
    const missing=(cfg.prerequisites||[]).filter(id=>this.completedCount(playerId,id)<1);
    if(missing.length)return {ok:false,reason:'MISSING_PREREQUISITE',missing};
    const limit=cfg.buildLimit??Infinity,count=this.ownedCount(playerId,definitionId);
    if(count>=limit)return {ok:false,reason:'BUILD_LIMIT',count,limit};
    const cost=Math.max(0,cfg.credits??0);
    if(!ignoreCredits&&!this.economy.canAfford(playerId,cost))return {ok:false,reason:'INSUFFICIENT_CREDITS',cost};
    return {ok:true,reason:'OK',cost,count,limit};
  }
}
