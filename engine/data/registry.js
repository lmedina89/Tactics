import {moduleConfig,moduleBindings} from '../entities/game-object.js';

export class DataRegistry {
  constructor() {
    this.assets = new Map();
    this.factions = new Map();
    this.locomotors = new Map();
    this.definitions = new Map();
    this.interactions = new Map();
    this.armors = new Map();
    this.weapons = new Map();
    this.commandSets = new Map();
  }

  async load(base = '.') {
    const get = async (p) => {
      const r = await fetch(`${base}/${p}`);
      if (!r.ok) throw new Error(`Failed to load ${p}: ${r.status}`);
      return r.json();
    };

    const catalog = await get('data/asset-catalog.json');
    for (const [id, value] of Object.entries(catalog.assets)) this.assets.set(id, { id, ...value });

    const registry = await get('data/registry.json');
    for (const p of registry.factions || []) this._insertUnique(this.factions, await get(p), p);
    for (const p of registry.locomotors || []) this._insertUnique(this.locomotors, await get(p), p);
    for (const p of registry.interactions || []) this._insertUnique(this.interactions, await get(p), p);
    for (const p of registry.armors || []) this._insertUnique(this.armors, await get(p), p);
    for (const p of registry.weapons || []) this._insertUnique(this.weapons, await get(p), p);
    for (const p of registry.commandSets || []) this._insertUnique(this.commandSets, await get(p), p);
    const defs=[];
    for (const p of registry.definitions || []) {
      const value=await get(p);moduleBindings(value);this._validateDefinitionRefs(value,p);this._insertUnique(this.definitions,value,p);defs.push([value,p]);
    }
    for(const [value,p] of defs)this._validateLateDefinitionRefs(value,p);
    for(const [id,set] of this.commandSets)this._validateCommandSet(set,`commandSet:${id}`);
    return this;
  }

  _insertUnique(map, value, source) {
    if (!value?.id) throw new Error(`Definition missing id: ${source}`);
    if (map.has(value.id)) throw new Error(`Duplicate definition id ${value.id}: ${source}`);
    map.set(value.id, value);
  }

  _validateDefinitionRefs(def,source){
    const loco=moduleConfig(def,'Locomotor');if(loco&&!this.locomotors.has(loco.locomotor))throw new Error(`${source}: unknown locomotor ${loco.locomotor}`);
    const armor=moduleConfig(def,'ArmorSet');if(armor&&!this.armors.has(armor.armor))throw new Error(`${source}: unknown armor ${armor.armor}`);
    const weapons=moduleConfig(def,'WeaponSet');for(const s of weapons?.slots||[])if(!this.weapons.has(s.weapon))throw new Error(`${source}: unknown weapon ${s.weapon}`);
    const render=moduleConfig(def,'Render');if(render&&!this.assets.has(render.asset))throw new Error(`${source}: unknown asset ${render.asset}`);
    const prod=moduleConfig(def,'Production');if(prod?.rolloutProtocol&&!this.interactions.has(prod.rolloutProtocol))throw new Error(`${source}: unknown rollout protocol ${prod.rolloutProtocol}`);
    for(const id of prod?.buildable||[])if(!this.definitions.has(id))throw new Error(`${source}: unknown buildable definition ${id}`);
    const cost=moduleConfig(def,'ProductionCost');if(cost&&!cost.queueType)throw new Error(`${source}: ProductionCost missing queueType`);
    const dock=moduleConfig(def,'DockingProvider');if(dock?.protocol&&!this.interactions.has(dock.protocol))throw new Error(`${source}: unknown docking protocol ${dock.protocol}`);
    const commandSet=moduleConfig(def,'CommandSet');if(commandSet&&!this.commandSets.has(commandSet.id))throw new Error(`${source}: unknown CommandSet ${commandSet.id}`);
  }

  _validateLateDefinitionRefs(def,source){
    const builder=moduleConfig(def,'Builder');for(const id of builder?.buildable||[])if(!this.definitions.has(id))throw new Error(`${source}: unknown Builder target ${id}`);
    const construction=moduleConfig(def,'Construction');for(const id of construction?.prerequisites||[])if(!this.definitions.has(id))throw new Error(`${source}: unknown prerequisite ${id}`);
  }

  _validateCommandSet(set,source){
    for(const c of set.commands||[]){
      if((c.type==='BUILD_STRUCTURE'||c.type==='PRODUCE')&&!this.definitions.has(c.definition))throw new Error(`${source}: unknown command definition ${c.definition}`);
    }
  }

  asset(id) { return this.assets.get(id); }
  faction(id) { return this.factions.get(id); }
  locomotor(id) { return this.locomotors.get(id); }
  definition(id) { return this.definitions.get(id); }
  interaction(id) { return this.interactions.get(id); }
  armor(id) { return this.armors.get(id); }
  weapon(id) { return this.weapons.get(id); }
  commandSet(id){return this.commandSets.get(id);}
  module(definitionOrId,type){
    const def=typeof definitionOrId==='string'?this.definition(definitionOrId):definitionOrId;
    return def?moduleConfig(def,type):null;
  }
}
