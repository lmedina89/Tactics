import {moduleConfig,moduleBindings} from '../entities/game-object.js';
import {CONTENT_CONTRACT_VERSION,validateContentPack,validateContentTemplate,validateDefinitionContent} from '../content/content-contract.js';

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
    this.targetPrioritySets = new Map();
    this.teamPrototypes = new Map();
    this.aiProfiles = new Map();
    this.contentTemplates = new Map();
    this.contentPacks = new Map();
    this.contentContract = null;
    this.contentCategoryIndex = new Map();
    this.contentAffiliationIndex = new Map();
  }

  async load(base = '.') {
    const get = async (p) => {
      const r = await fetch(`${base}/${p}`);
      if (!r.ok) throw new Error(`Failed to load ${p}: ${r.status}`);
      return r.json();
    };
    const registry = await get('data/registry.json');
    if(registry.contentContract){
      this.contentContract=await get(registry.contentContract);
      if((this.contentContract?.version??0)!==CONTENT_CONTRACT_VERSION)throw new Error(`${registry.contentContract}: unsupported content contract version ${this.contentContract?.version}`);
    }

    const packs=[];
    for(const p of registry.contentPacks||[]){const value=await get(p);validateContentPack(value,p);this._insertUnique(this.contentPacks,value,p);packs.push(value);}
    const paths=(key)=>{
      const list=[...(registry[key]||[])];for(const pack of packs)list.push(...(pack[key]||[]));
      return [...new Set(list)];
    };

    const catalogPaths=paths('assetCatalogs');if(!catalogPaths.length)catalogPaths.push('data/asset-catalog.json');
    for(const p of catalogPaths){const catalog=await get(p);for(const [id,value] of Object.entries(catalog.assets||{})){if(this.assets.has(id))throw new Error(`Duplicate asset id ${id}: ${p}`);this.assets.set(id,{id,...value});}}
    for(const p of registry.contentTemplates||[]){const value=await get(p);validateContentTemplate(value,p);this._insertUnique(this.contentTemplates,value,p);}

    for (const p of paths('factions')) this._insertUnique(this.factions, await get(p), p);
    for (const p of paths('locomotors')) { const value=await get(p); this._validateLocomotor(value,p); this._insertUnique(this.locomotors,value,p); }
    for (const p of paths('interactions')) this._insertUnique(this.interactions, await get(p), p);
    for (const p of paths('armors')) this._insertUnique(this.armors, await get(p), p);
    for (const p of paths('weapons')) { const value=await get(p); this._validateWeapon(value,p); this._insertUnique(this.weapons,value,p); }
    for (const p of paths('commandSets')) this._insertUnique(this.commandSets, await get(p), p);
    for (const p of paths('targetPrioritySets')) { const value=await get(p); this._validateTargetPrioritySet(value,p); this._insertUnique(this.targetPrioritySets,value,p); }
    const defs=[];
    for (const p of paths('definitions')) {
      const value=await get(p);moduleBindings(value);validateDefinitionContent(value,p);this._validateDefinitionRefs(value,p);this._insertUnique(this.definitions,value,p);this._indexContentDefinition(value);defs.push([value,p]);
    }
    for(const [value,p] of defs)this._validateLateDefinitionRefs(value,p);
    for(const [id,set] of this.commandSets)this._validateCommandSet(set,`commandSet:${id}`);
    for (const p of paths('teamPrototypes')) { const value=await get(p); this._validateTeamPrototype(value,p); this._insertUnique(this.teamPrototypes,value,p); }
    for (const p of paths('aiProfiles')) { const value=await get(p); this._validateAIProfile(value,p); this._insertUnique(this.aiProfiles,value,p); }
    return this;
  }


  _indexContentDefinition(def){
    const meta=moduleConfig(def,'ContentMeta');if(!meta)return;
    for(const category of meta.categories||[]){if(!this.contentCategoryIndex.has(category))this.contentCategoryIndex.set(category,[]);this.contentCategoryIndex.get(category).push(def.id);}
    const affiliation=meta.affiliation||'WORLD';if(!this.contentAffiliationIndex.has(affiliation))this.contentAffiliationIndex.set(affiliation,[]);this.contentAffiliationIndex.get(affiliation).push(def.id);
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

  _validateWeapon(value,source){
    if(!value?.id)throw new Error(`${source}: weapon missing id`);
    if(value.delivery==='PROJECTILE'){
      const p=value.projectile;if(!p||!(p.speed>0))throw new Error(`${source}: projectile weapon requires projectile.speed > 0`);
      if(p.behavior&&!['DUMB_PROJECTILE','GUIDED_PROJECTILE'].includes(p.behavior))throw new Error(`${source}: invalid projectile behavior ${p.behavior}`);
      for(const key of ['radius','impactPadding','maxLeadSeconds','guidanceTurnRate','maxLifetimeSeconds'])if(p[key]!=null&&!(p[key]>=0))throw new Error(`${source}: projectile.${key} must be >= 0`);
      if(p.targetHeightFactor!=null&&(p.targetHeightFactor<0||p.targetHeightFactor>1))throw new Error(`${source}: projectile.targetHeightFactor must be within 0..1`);
      const wc=p.worldCollision??{};if(wc.relations&&!Array.isArray(wc.relations))throw new Error(`${source}: projectile.worldCollision.relations must be an array`);if(wc.kinds&&!Array.isArray(wc.kinds))throw new Error(`${source}: projectile.worldCollision.kinds must be an array`);for(const relation of wc.relations??[])if(!['ENEMY','ALLY','NEUTRAL'].includes(relation))throw new Error(`${source}: invalid projectile world collision relation ${relation}`);for(const kind of wc.kinds??[])if(!['unit','building','resource'].includes(kind))throw new Error(`${source}: invalid projectile world collision kind ${kind}`);if(wc.terrainSampleStep!=null&&!(wc.terrainSampleStep>0))throw new Error(`${source}: projectile.worldCollision.terrainSampleStep must be > 0`);
    }
  }

  _validateDefinitionRefs(def,source){
    const loco=moduleConfig(def,'Locomotor');if(loco&&!this.locomotors.has(loco.locomotor))throw new Error(`${source}: unknown locomotor ${loco.locomotor}`);
    const armor=moduleConfig(def,'ArmorSet');if(armor&&!this.armors.has(armor.armor))throw new Error(`${source}: unknown armor ${armor.armor}`);
    const weapons=moduleConfig(def,'WeaponSet');for(const s of weapons?.slots||[])if(!this.weapons.has(s.weapon))throw new Error(`${source}: unknown weapon ${s.weapon}`);
    const render=moduleConfig(def,'Render');if(render&&!this.assets.has(render.asset))throw new Error(`${source}: unknown asset ${render.asset}`);
    const prod=moduleConfig(def,'Production');if(prod?.rolloutProtocol&&!this.interactions.has(prod.rolloutProtocol))throw new Error(`${source}: unknown rollout protocol ${prod.rolloutProtocol}`);
    const cost=moduleConfig(def,'ProductionCost');if(cost&&!cost.queueType)throw new Error(`${source}: ProductionCost missing queueType`);
    const dock=moduleConfig(def,'DockingProvider');if(dock?.protocol&&!this.interactions.has(dock.protocol))throw new Error(`${source}: unknown docking protocol ${dock.protocol}`);
    const commandSet=moduleConfig(def,'CommandSet');if(commandSet&&!this.commandSets.has(commandSet.id))throw new Error(`${source}: unknown CommandSet ${commandSet.id}`);
    const geom=moduleConfig(def,'Geometry');if(geom){if(!['BOX','CYLINDER','SPHERE'].includes(geom.shape))throw new Error(`${source}: invalid Geometry shape ${geom.shape}`);if(!(geom.majorRadius>0))throw new Error(`${source}: Geometry majorRadius must be > 0`);if(geom.shape==='BOX'&&!(geom.minorRadius>0))throw new Error(`${source}: BOX Geometry minorRadius must be > 0`);if(geom.height!=null&&!(geom.height>0))throw new Error(`${source}: Geometry height must be > 0`);}
    const targetable=moduleConfig(def,'AITargetable');if(targetable){if(!Array.isArray(targetable.categories)||!targetable.categories.length)throw new Error(`${source}: AITargetable.categories must not be empty`);for(const c of targetable.categories)if(typeof c!=='string'||!c)throw new Error(`${source}: invalid AITargetable category`);}
  }

  _validateLateDefinitionRefs(def,source){
    const prod=moduleConfig(def,'Production');for(const id of prod?.buildable||[])if(!this.definitions.has(id))throw new Error(`${source}: unknown buildable definition ${id}`);
    const builder=moduleConfig(def,'Builder');for(const id of builder?.buildable||[])if(!this.definitions.has(id))throw new Error(`${source}: unknown Builder target ${id}`);
    const construction=moduleConfig(def,'Construction');for(const id of construction?.prerequisites||[])if(!this.definitions.has(id))throw new Error(`${source}: unknown prerequisite ${id}`);
  }



  _validateTargetPrioritySet(value,source){
    if(!value?.id)throw new Error(`${source}: target priority set missing id`);
    if(value.distanceModifier!=null&&!(value.distanceModifier>0))throw new Error(`${source}: distanceModifier must be > 0`);
    for(const [key,v] of Object.entries(value.priorities??{}))if(!Number.isFinite(v))throw new Error(`${source}: priority ${key} must be numeric`);
    for(const key of ['defaultPriority','recentAttackerBonus'])if(value[key]!=null&&!Number.isFinite(value[key]))throw new Error(`${source}: ${key} must be numeric`);
  }

  _validateTeamPrototype(value,source){
    if(!value?.id)throw new Error(`${source}: TeamPrototype missing id`);
    if(!value.role||typeof value.role!=='string')throw new Error(`${source}: TeamPrototype missing role`);
    if(value.maxInstances!=null&&(!Number.isInteger(value.maxInstances)||value.maxInstances<1))throw new Error(`${source}: maxInstances must be >= 1`);
    for(const key of ['recruitRadius','recruitTimeoutTicks','rallyRadius','rallyTimeoutTicks'])if(value[key]!=null&&!(value[key]>=0))throw new Error(`${source}: ${key} must be >= 0`);
    if(value.initialStance&&!['GUARD','AGGRESSIVE','HOLD_POSITION'].includes(value.initialStance))throw new Error(`${source}: invalid initialStance ${value.initialStance}`);
    if(value.attackPrioritySet&&!this.targetPrioritySets.has(value.attackPrioritySet))throw new Error(`${source}: unknown attackPrioritySet ${value.attackPrioritySet}`);
    if(value.productionPriority!=null&&(!Number.isInteger(value.productionPriority)||value.productionPriority<0))throw new Error(`${source}: productionPriority must be a nonnegative integer`);
    const reinforce=value.reinforcement??{};
    if(reinforce.retreatBelowStrength!=null&&(!(reinforce.retreatBelowStrength>0)||reinforce.retreatBelowStrength>1))throw new Error(`${source}: reinforcement.retreatBelowStrength must be > 0 and <= 1`);
    for(const key of ['reformTimeoutTicks'])if(reinforce[key]!=null&&(!Number.isInteger(reinforce[key])||reinforce[key]<1))throw new Error(`${source}: reinforcement.${key} must be a positive integer`);
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
    const tactical=value.tactical??{};for(const key of ['targetReassessTicks','economicThreatRecentTicks','economicDefenseHoldTicks'])if(tactical[key]!=null&&(!Number.isInteger(tactical[key])||tactical[key]<1))throw new Error(`${source}: tactical.${key} must be a positive integer`);if(tactical.maxRetaliateDistance!=null&&!(tactical.maxRetaliateDistance>=0))throw new Error(`${source}: tactical.maxRetaliateDistance must be >= 0`);if(tactical.economicProtectedCategories&&!Array.isArray(tactical.economicProtectedCategories))throw new Error(`${source}: tactical.economicProtectedCategories must be an array`);
    const econDefense=tactical.economicDefense??{};if(econDefense.protectedCategories&&!Array.isArray(econDefense.protectedCategories))throw new Error(`${source}: tactical.economicDefense.protectedCategories must be an array`);if(econDefense.borrowRoles&&!Array.isArray(econDefense.borrowRoles))throw new Error(`${source}: tactical.economicDefense.borrowRoles must be an array`);if(econDefense.borrowRoles?.some(role=>typeof role!=='string'||!role))throw new Error(`${source}: tactical.economicDefense.borrowRoles entries must be nonempty strings`);for(const key of ['scanIntervalTicks','recentDamageTicks','holdTicks','orderRefreshTicks','escortIncidentWindowTicks','escortDurationTicks'])if(econDefense[key]!=null&&(!Number.isInteger(econDefense[key])||econDefense[key]<1))throw new Error(`${source}: tactical.economicDefense.${key} must be a positive integer`);for(const key of ['maxRetaliateDistance','threatScanRadius','responseLeashDistance','defaultThreatValue','borrowMinThreat','borrowRadius'])if(econDefense[key]!=null&&!(econDefense[key]>=0))throw new Error(`${source}: tactical.economicDefense.${key} must be >= 0`);if(econDefense.maxBorrowedTeams!=null&&(!Number.isInteger(econDefense.maxBorrowedTeams)||econDefense.maxBorrowedTeams<0))throw new Error(`${source}: tactical.economicDefense.maxBorrowedTeams must be a nonnegative integer`);if(econDefense.escortAfterIncidents!=null&&(!Number.isInteger(econDefense.escortAfterIncidents)||econDefense.escortAfterIncidents<1))throw new Error(`${source}: tactical.economicDefense.escortAfterIncidents must be >= 1`);for(const [category,weight] of Object.entries(econDefense.threatWeights??{}))if(!Number.isFinite(weight)||weight<0)throw new Error(`${source}: tactical.economicDefense.threatWeights.${category} must be nonnegative numeric`);let lastThreat=-Infinity;for(const band of econDefense.responseBands??[]){if(!this.teamPrototypes.has(band.prototype))throw new Error(`${source}: unknown economicDefense TeamPrototype ${band.prototype}`);if(!Number.isFinite(band.minThreat)||band.minThreat<0)throw new Error(`${source}: economicDefense minThreat must be nonnegative numeric`);if(band.minThreat<lastThreat)throw new Error(`${source}: economicDefense responseBands must be sorted by minThreat`);lastThreat=band.minThreat;}
    const economy=value.economy??{};
    for(const key of ['harvestCheckIntervalTicks','constructionCheckIntervalTicks','productionCheckIntervalTicks'])if(economy[key]!=null&&(!Number.isInteger(economy[key])||economy[key]<1))throw new Error(`${source}: economy.${key} must be a positive integer`);
    if(economy.maxActiveConstructionSites!=null&&(!Number.isInteger(economy.maxActiveConstructionSites)||economy.maxActiveConstructionSites<1))throw new Error(`${source}: economy.maxActiveConstructionSites must be >= 1`);
    if(economy.constructionSafetyRadius!=null&&!(economy.constructionSafetyRadius>=0))throw new Error(`${source}: economy.constructionSafetyRadius must be >= 0`);
    if(economy.harvester){
      const def=this.definitions.get(economy.harvester.definition);if(!def||!moduleConfig(def,'ResourceCollector'))throw new Error(`${source}: economy.harvester must reference a ResourceCollector definition`);
      if(!Number.isInteger(economy.harvester.desiredCount??0)||(economy.harvester.desiredCount??0)<0)throw new Error(`${source}: economy.harvester.desiredCount must be a nonnegative integer`);
    }
    const buildDefs=new Set();
    for(const entry of economy.buildList||[]){
      const def=this.definitions.get(entry.definition);if(!def||def.kind!=='building'||!moduleConfig(def,'Construction'))throw new Error(`${source}: economy buildList references non-constructible ${entry.definition}`);
      if(buildDefs.has(entry.definition))throw new Error(`${source}: duplicate economy buildList definition ${entry.definition}`);buildDefs.add(entry.definition);
      if(!Number.isInteger(entry.desiredCount??0)||(entry.desiredCount??0)<0)throw new Error(`${source}: desiredCount must be a nonnegative integer for ${entry.definition}`);
      const placement=entry.placement??{};if(placement.anchor&&!['HOME','DEFENSE','RESOURCE','ENEMY'].includes(placement.anchor))throw new Error(`${source}: invalid placement anchor ${placement.anchor}`);
      if(placement.yawMode&&!['MATCH_BUILDER','FACE_TARGET','FACE_OUTWARD','FACE_HOME'].includes(placement.yawMode))throw new Error(`${source}: invalid yawMode ${placement.yawMode}`);
      for(const key of ['minRadius','maxRadius','ringStep','angleStepDeg'])if(placement[key]!=null&&!(placement[key]>0))throw new Error(`${source}: placement.${key} must be > 0`);
    }
    for(const reserve of economy.unitReserves||[]){
      const def=this.definitions.get(reserve.definition);if(!def||!moduleConfig(def,'ProductionCost'))throw new Error(`${source}: unitReserves references non-producible ${reserve.definition}`);
      if(!Number.isInteger(reserve.desiredFree??0)||(reserve.desiredFree??0)<0)throw new Error(`${source}: unitReserves desiredFree must be a nonnegative integer`);
    }
    const ids=new Set();
    for(const plan of value.teamPlans||[]){
      if(!plan.id||ids.has(plan.id))throw new Error(`${source}: duplicate/missing team plan id ${plan.id||''}`);ids.add(plan.id);
      if(!plan.prototype&&!plan.variants?.length)throw new Error(`${source}: team plan ${plan.id} needs prototype or variants`);
      if(plan.prototype&&!this.teamPrototypes.has(plan.prototype))throw new Error(`${source}: unknown TeamPrototype ${plan.prototype}`);
      for(const variant of plan.variants||[]){
        if(!this.teamPrototypes.has(variant.prototype))throw new Error(`${source}: unknown TeamPrototype ${variant.prototype}`);
        for(const [category,weight] of Object.entries(variant.counterWeights??{}))if(!Number.isFinite(weight))throw new Error(`${source}: variant counter weight ${category} must be numeric`);
        if(variant.basePriority!=null&&!Number.isFinite(variant.basePriority))throw new Error(`${source}: variant basePriority must be numeric`);
        for(const key of ['minWealth','maxWealth'])if(variant[key]!=null&&!['POOR','NORMAL','WEALTHY'].includes(variant[key]))throw new Error(`${source}: invalid ${key} ${variant[key]}`);
      }
      if(plan.maxConcurrent!=null&&(!Number.isInteger(plan.maxConcurrent)||plan.maxConcurrent<1))throw new Error(`${source}: maxConcurrent must be >= 1`);
      for(const key of ['startDelayTicks','retryTicks','productionPriority'])if(plan[key]!=null&&(!Number.isInteger(plan[key])||plan[key]<0))throw new Error(`${source}: ${key} must be a nonnegative integer`);
    }
    const strategy=value.strategy??{};
    if(strategy.assessmentIntervalTicks!=null&&(!Number.isInteger(strategy.assessmentIntervalTicks)||strategy.assessmentIntervalTicks<1))throw new Error(`${source}: strategy.assessmentIntervalTicks must be positive`);
    if(strategy.personality){for(const key of ['aggression','economy','defense'])if(strategy.personality[key]!=null&&!(strategy.personality[key]>0))throw new Error(`${source}: strategy.personality.${key} must be > 0`);}
    if(strategy.defaultPersonality!=null&&strategy.personalities&&!strategy.personalities[strategy.defaultPersonality])throw new Error(`${source}: unknown strategy.defaultPersonality ${strategy.defaultPersonality}`);
    for(const [personality,tuning] of Object.entries(strategy.personalities??{})){for(const key of ['aggression','economy','defense'])if(tuning[key]!=null&&!(tuning[key]>0))throw new Error(`${source}: strategy.personalities.${personality}.${key} must be > 0`);}
    if(strategy.wealth){if(strategy.wealth.poorBelow!=null&&!Number.isFinite(strategy.wealth.poorBelow))throw new Error(`${source}: strategy.wealth.poorBelow must be numeric`);if(strategy.wealth.wealthyAbove!=null&&!Number.isFinite(strategy.wealth.wealthyAbove))throw new Error(`${source}: strategy.wealth.wealthyAbove must be numeric`);}
    for(const [difficulty,tuning] of Object.entries(strategy.difficulties??{})){if(!['EASY','NORMAL','HARD'].includes(difficulty))throw new Error(`${source}: invalid AI difficulty ${difficulty}`);for(const key of ['constructionIntervalScale','productionIntervalScale','teamIntervalScale'])if(tuning[key]!=null&&!(tuning[key]>0))throw new Error(`${source}: ${difficulty}.${key} must be > 0`);}
    const expansion=strategy.expansion??{};if(expansion.refineryDefinition&&!this.definitions.has(expansion.refineryDefinition))throw new Error(`${source}: unknown expansion refineryDefinition ${expansion.refineryDefinition}`);
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
  targetPrioritySet(id){return this.targetPrioritySets.get(id);}
  teamPrototype(id){return this.teamPrototypes.get(id);}
  aiProfile(id){return this.aiProfiles.get(id);}
  contentTemplate(id){return this.contentTemplates.get(id);}
  contentPack(id){return this.contentPacks.get(id);}
  definitionsForCategory(category){return (this.contentCategoryIndex.get(category)||[]).map(id=>this.definitions.get(id));}
  definitionsForAffiliation(affiliation){return (this.contentAffiliationIndex.get(affiliation)||[]).map(id=>this.definitions.get(id));}
  module(definitionOrId,type){
    const def=typeof definitionOrId==='string'?this.definition(definitionOrId):definitionOrId;
    return def?moduleConfig(def,type):null;
  }
}
