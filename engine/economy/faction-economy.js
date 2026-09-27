import {moduleConfig} from '../entities/game-object.js';

export class FactionEconomySystem{
  constructor({registry,players,entitiesProvider}){
    this.registry=registry;this.players=players;this.entitiesProvider=entitiesProvider;
    this.recalculatePower();
  }

  player(id){return this.players.get(id)||null;}
  canAfford(playerId,amount){const p=this.player(playerId);return !!p&&p.credits>=Math.max(0,amount||0);}
  withdraw(playerId,amount){const p=this.player(playerId),v=Math.max(0,amount||0);if(!p||p.credits<v)return false;p.credits-=v;return true;}
  deposit(playerId,amount){const p=this.player(playerId);if(!p)return false;p.credits+=Math.max(0,amount||0);return true;}

  recalculatePower(){
    for(const p of this.players.values()){p.powerProduced=0;p.powerUsed=0;}
    for(const e of this.entitiesProvider?.()||[]){
      if(!e.alive||!e.playerId)continue;const p=this.player(e.playerId);if(!p)continue;
      const def=this.registry.definition(e.definitionId);if(!def)continue;
      const producer=moduleConfig(def,'PowerProducer'),consumer=moduleConfig(def,'PowerConsumer');
      if(producer)p.powerProduced+=Math.max(0,producer.amount??0);
      if(consumer)p.powerUsed+=Math.max(0,consumer.amount??0);
    }
    for(const p of this.players.values())p.lowPower=p.powerUsed>p.powerProduced;
  }

  productionRateFactor(playerId){const p=this.player(playerId);return p?.lowPower?0.5:1;}
}
