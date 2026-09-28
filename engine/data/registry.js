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
    this.teamPrototypes = new Map();
    this.aiProfiles = new Map();
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
    for (const p of registry.locomotors || []) { const value=await get(p); this._validateLocomotor(value,p); this._insertUnique(this.locomotors,value,p); }
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
    for (const p of registry.teamPrototypes || []) { const value=await get(p); this._validateTeamPrototype(value,p); this._insertUnique(this.teamPrototypes,value,p); }
    for (const p of registry.aiProfiles || []) { const value=await get(p); this._validateAIProfile(value,p); this._insertUnique(this.aiProfiles,value,p); }
    return this;
  }

  _insertUnique(map, value, source) {
    if (!value?.id) throw new Error(`Definition missing id: ${source}`);
    if (map.has(value.id)) throw new Error(`Duplicate definition id ${value.id}: ${source}`);
    map.set(value.id, value);
  }


  _validateLocomotor(value,source){
    if(!(value?.radius>=0))throw new Error(`${source}: locomotor radius must be >= 0`);
    if(value.collisionLayer&&!['GROUND','AIR'].includes(value.collisionLayer))throw new Error(`${source}: invalid collisionLayer ${value.collisionLayer}`);
    if(value.collisionMass!=null&&!(value.collisionMass>0))throw new Error(`${source}: collisionMass must be > 0`);
    if(value.avoidanceLookAheadSeconds!=null&&value.avoidanceLookAheadSeconds<0)throw new Error(`${source}: avoidanceLookAheadSeconds must be >= 0`);
    if(value.avoidanceBuffer!=null&&value.avoidanceBuffer<0)throw new Error(`${source}: avoidanceBuffer must be >= 0`);
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
    const geom=moduleConfig(def,'Geometry');if(geom){if(!['BOX','CYLINDER','SPHERE'].includes(geom.shape))throw new Error(`${source}: invalid Geometry shape ${geom.shape}`);if(!(geom.majorRadius>0))throw new Error(`${source}: Geometry majorRadius must be > 0`);if(geom.shape==='BOX'&&!(geom.minorRadius>0))throw new Error(`${source}: BOX Geometry minorRadius must be > 0`);if(geom.height!=null&&!(geom.height>0))throw new Error(`${source}: Geometry height must be > 0`);}
  }

  _validateLateDefinitionRefs(def,source){
    const builder=moduleConfig(def,'Builder');for(const id of builder?.buildable||[])if(!this.definitions.has(id))throw new Error(`${source}: unknown Builder target ${id}`);
    const construction=moduleConfig(def,'Construction');for(const id of construction?.prerequisites||[])if(!this.definitions.has(id))throw new Error(`${source}: unknown prerequisite ${id}`);
  }


  _validateTeamPrototype(value,source){
    if(!value?.id)throw new Error(`${source}: TeamPrototype missing id`);
    if(!value.role||typeof value.role!=='string')throw new Error(`${source}: TeamPrototype missing role`);
    if(value.maxInstances!=null&&(!Number.isInteger(value.maxInstances)||value.maxInstances<1))throw new Error(`${source}: maxInstances must be >= 1`);
    for(const key of ['recruitRadius','recruitTimeoutTicks','rallyRadius','rallyTimeoutTicks'])if(value[key]!=null&&!(value[key]>=0))throw new Error(`${source}: ${key} must be >= 0`);
    if(value.initialStance&&!['GUARD','AGGRESSIVE','HOLD_POSITION'].includes(value.initialStance))throw new Error(`${source}: invalid initialStance ${value.initialStance}`);
    if(value.formation?.spacing!=null&&!(value.formation.spacing>=0))throw new Error(`${source}: formation spacing must be >= 0`);
    if(!Array.isArray(value.composition)||!value.composition.length)throw new Error(`${source}: TeamPrototype composition must not be empty`);
    for(const entry of value.composition){
      const def=this.definitions.get(entry.definition);if(!def)throw new Error(`${source}: unknown team definition ${entry.definition}`);
      if(!moduleConfig(def,'Locomotor')||['building','resource'].includes(def.kind))throw new Error(`${source}: team member ${entry.definition} must be a mobile unit`);
      const min=entry.min??0,max=entry.max??min;if(!Number.isInteger(min)||!Number.isInteger(max)||min<0||max<1||min>max)throw new Error(`${source}: invalid composition bounds for ${entry.definition}`);
    }
  }

  _validateAIProfile(value,source){
    if(!value?.id)throw new Error(`${source}: AI profile missing id`);
    for(const key of ['thinkIntervalTicks','enemyAcquireIntervalTicks','orderRefreshTicks'])if(value[key]!=null&&(!Number.isInteger(value[key])||value[key]<1))throw new Error(`${source}: ${key} must be a positive integer`);
    for(const key of ['initialDelayTicks','baseThreatRadius'])if(value[key]!=null&&!(value[key]>=0))throw new Error(`${source}: ${key} must be >= 0`);
    const ids=new Set();
    for(const plan of value.teamPlans||[]){
      if(!plan.id||ids.has(plan.id))throw new Error(`${source}: duplicate/missing team plan id ${plan.id||''}`);ids.add(plan.id);
      if(!this.teamPrototypes.has(plan.prototype))throw new Error(`${source}: unknown TeamPrototype ${plan.prototype}`);
      if(plan.maxConcurrent!=null&&(!Number.isInteger(plan.maxConcurrent)||plan.maxConcurrent<1))throw new Error(`${source}: maxConcurrent must be >= 1`);
      for(const key of ['startDelayTicks','retryTicks'])if(plan[key]!=null&&(!Number.isInteger(plan[key])||plan[key]<0))throw new Error(`${source}: ${key} must be a nonnegative integer`);
    }
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
  teamPrototype(id){return this.teamPrototypes.get(id);}
  aiProfile(id){return this.aiProfiles.get(id);}
  module(definitionOrId,type){
    const def=typeof definitionOrId==='string'?this.definition(definitionOrId):definitionOrId;
    return def?moduleConfig(def,type):null;
  }
}
