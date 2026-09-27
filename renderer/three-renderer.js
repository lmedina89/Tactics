import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as skeletonClone} from 'three/addons/utils/SkeletonUtils.js';
import {TerrainRenderer} from './terrain-renderer.js';
import {renderConfigOf} from '../engine/entities/game-object.js';

const wrapPi=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};

export class ThreeRenderer{
  constructor({canvas,registry,map}){
    this.canvas=canvas;this.registry=registry;this.map=map;
    const env=map.environment||{};
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(env.skyColor||0x87958a);
    if(env.fogFar)this.scene.fog=new THREE.Fog(new THREE.Color(env.fogColor||env.skyColor||0x87958a),env.fogNear??300,env.fogFar);
    this.camera=new THREE.PerspectiveCamera(47,1,.1,2200);this.camera.position.set(-85,165,185);this.camera.lookAt(0,0,0);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=false;
    this.loader=new GLTFLoader();this.assetPromises=new Map();this.entityViews=new Map();this.projectileViews=new Map();this.effectViews=[];this.lastCombatEventSerial=0;this.terrain=null;this.ground=null;this.placementGhost=null;this.placementDefinitionId=null;
    this.selectionRing=this._makeRing(0x9de06d);this.destinationRing=this._makeRing(0xf1d35d);this.attackRing=this._makeRing(0xff665c);this.destinationRing.visible=false;this.attackRing.visible=false;this.selectionRing.visible=false;this.scene.add(this.selectionRing,this.destinationRing,this.attackRing);
    this.projectileGeometry=new THREE.SphereGeometry(1,8,6);
    this._setupLights();this.resize();addEventListener('resize',()=>this.resize());
  }

  _setupLights(){
    const e=this.map.environment||{};this.scene.add(new THREE.HemisphereLight(e.hemisphereSky||0xc8d8e8,e.hemisphereGround||0x3c4437,e.hemisphereIntensity??1.7));
    const d=e.sunDirection||{x:-.55,y:1,z:.32};const sun=new THREE.DirectionalLight(e.sunColor||0xffffff,e.sunIntensity??2.2);sun.position.set(d.x*220,d.y*220,d.z*220);this.scene.add(sun);
  }

  async buildWorld(terrain){this.terrain=terrain;this.terrainRenderer=new TerrainRenderer({scene:this.scene,map:this.map,terrain});this.ground=await this.terrainRenderer.build();}

  _makeRing(color){const m=new THREE.Mesh(new THREE.RingGeometry(1.2,1.6,40),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.12;return m;}
  async _loadAsset(assetId){if(this.assetPromises.has(assetId))return this.assetPromises.get(assetId);const info=this.registry.asset(assetId);if(!info)throw new Error(`Unknown asset ${assetId}`);const p=this.loader.loadAsync(info.path).then(g=>g.scene);this.assetPromises.set(assetId,p);return p;}

  async buildViews(sim){
    for(const e of sim.entities.values()){
      if(this.entityViews.has(e.id))continue;const def=this.registry.definition(e.definitionId),render=renderConfigOf(def);if(!render?.asset)continue;
      const base=await this._loadAsset(render.asset),obj=skeletonClone(base);obj.name=e.id;obj.userData.entityId=e.id;
      const faction=e.factionId?this.registry.faction(e.factionId):null;
      obj.traverse(n=>{if(!n.isMesh)return;n.userData.entityId=e.id;n.material=n.material.clone();n.material.userData.baseOpacity=n.material.opacity;n.material.userData.baseTransparent=n.material.transparent;if(n.material.color)n.material.userData.baseColor=n.material.color.clone();if(n.material.emissive)n.material.userData.baseEmissive=n.material.emissive.clone();if(faction?.id==='crimson'){const c=n.material.color?.clone?.();if(c){c.lerp(new THREE.Color(faction.color),.34);n.material.color.copy(c);n.material.userData.baseColor=n.material.color.clone();}if(n.material.emissive){n.material.emissive.lerp(new THREE.Color(faction.accent),.08);n.material.userData.baseEmissive=n.material.emissive.clone();}}});
      obj.userData.baseScale=render.scale??1;obj.scale.setScalar(obj.userData.baseScale);
      const turret=render.turretNode?obj.getObjectByName(render.turretNode):null;
      if(turret){turret.userData.baseRotationY=turret.rotation.y;obj.userData.turretNodeRef=turret;}
      const muzzle=render.muzzleNode?obj.getObjectByName(render.muzzleNode):null;if(muzzle)obj.userData.muzzleNodeRef=muzzle;
      this.scene.add(obj);this.entityViews.set(e.id,obj);
    }
  }


  async beginPlacementGhost(definitionId){
    this.endPlacementGhost();const def=this.registry.definition(definitionId),render=renderConfigOf(def);if(!render?.asset)return;
    const base=await this._loadAsset(render.asset),obj=skeletonClone(base);obj.name='placement-ghost';obj.userData.baseScale=render.scale??1;obj.scale.setScalar(obj.userData.baseScale);
    obj.traverse(n=>{if(!n.isMesh)return;n.material=n.material.clone();n.material.transparent=true;n.material.opacity=.46;n.material.depthWrite=false;if(n.material.color)n.material.userData.ghostBaseColor=n.material.color.clone();});
    obj.visible=false;this.scene.add(obj);this.placementGhost=obj;this.placementDefinitionId=definitionId;
  }
  updatePlacementGhost(point,yaw,valid){
    const v=this.placementGhost;if(!v||!point)return;const render=renderConfigOf(this.registry.definition(this.placementDefinitionId));v.visible=true;v.position.set(point.x,(this.terrain?.heightAt(point.x,point.z)??0)+.08,point.z);v.rotation.y=yaw+(render?.headingOffset||0);
    const tint=new THREE.Color(valid?0x72df7e:0xff6a62);v.traverse(n=>{if(!n.isMesh||!n.material?.color)return;const base=n.material.userData.ghostBaseColor;if(base)n.material.color.copy(base).lerp(tint,.58);});
  }
  endPlacementGhost(){if(!this.placementGhost)return;const v=this.placementGhost;this.scene.remove(v);v.traverse(n=>{if(n.isMesh)n.material?.dispose?.();});this.placementGhost=null;this.placementDefinitionId=null;}

  _applyConstructionLook(view,entity){
    const constructing=entity.operational===false&&entity.construction&&entity.alive;if(view.userData.constructingApplied===constructing)return;view.userData.constructingApplied=constructing;
    view.traverse(n=>{if(!n.isMesh||!n.material)return;const op=n.material.userData.baseOpacity??1,tr=n.material.userData.baseTransparent??false;n.material.opacity=constructing?Math.min(op,.62):op;n.material.transparent=constructing?true:tr;n.material.depthWrite=!constructing;});
  }

  _applyDestroyedLook(view,dead){
    if(view.userData.deadApplied===dead)return;view.userData.deadApplied=dead;
    view.traverse(n=>{if(!n.isMesh||!n.material)return;const base=n.material.userData.baseColor;if(base&&n.material.color){n.material.color.copy(base);if(dead)n.material.color.multiplyScalar(.28);}const be=n.material.userData.baseEmissive;if(be&&n.material.emissive){n.material.emissive.copy(be);if(dead)n.material.emissive.multiplyScalar(.08);}if('roughness' in n.material&&dead)n.material.roughness=Math.max(n.material.roughness??0,.9);});
  }

  _syncProjectiles(sim){
    const live=new Set();
    for(const p of sim.projectiles?.projectiles?.values?.()||[]){
      live.add(p.id);let v=this.projectileViews.get(p.id);
      if(!v){const mat=new THREE.MeshBasicMaterial({color:new THREE.Color(p.color||'#ffd27a')});v=new THREE.Mesh(this.projectileGeometry,mat);v.scale.setScalar(p.radius??.18);this.scene.add(v);this.projectileViews.set(p.id,v);}
      v.position.set(p.x,p.y,p.z);
    }
    for(const [id,v] of this.projectileViews)if(!live.has(id)){this.scene.remove(v);v.material?.dispose?.();this.projectileViews.delete(id);}
  }

  _consumeCombatEvents(sim){
    const events=sim.combat?.events||[];
    for(const ev of events){if(ev.serial<=this.lastCombatEventSerial)continue;this.lastCombatEventSerial=ev.serial;
      if(ev.type==='HITSCAN')this._spawnTracer(ev.start,ev.end,ev.color||'#ffd98a');
      if(ev.type==='PROJECTILE_IMPACT')this._spawnImpact({x:ev.x,y:ev.y,z:ev.z},ev.hit?0xffb768:0xc8bca4);
    }
  }
  _spawnTracer(a,b,color){
    const geom=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x,a.y,a.z),new THREE.Vector3(b.x,b.y,b.z)]);const mat=new THREE.LineBasicMaterial({color:new THREE.Color(color),transparent:true,opacity:.95});const line=new THREE.Line(geom,mat);this.scene.add(line);this.effectViews.push({obj:line,expires:performance.now()+90});
  }
  _spawnImpact(p,color){const g=new THREE.SphereGeometry(.35,6,4),m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}),o=new THREE.Mesh(g,m);o.position.set(p.x,p.y,p.z);this.scene.add(o);this.effectViews.push({obj:o,expires:performance.now()+120});}
  _cleanupEffects(){const now=performance.now();for(let i=this.effectViews.length-1;i>=0;i--){const e=this.effectViews[i];if(now<e.expires)continue;this.scene.remove(e.obj);e.obj.geometry?.dispose?.();e.obj.material?.dispose?.();this.effectViews.splice(i,1);}}

  ensureViews(sim){if(this._viewBuildPending)return;for(const e of sim.entities.values())if(!this.entityViews.has(e.id)){this._viewBuildPending=this.buildViews(sim).finally(()=>{this._viewBuildPending=null;});break;}}

  sync(sim){
    this.ensureViews(sim);
    for(const [id,v] of [...this.entityViews])if(!sim.entities.has(id)){this.scene.remove(v);v.traverse(n=>{if(n.isMesh)n.material?.dispose?.();});this.entityViews.delete(id);}
    for(const e of sim.entities.values()){
      const v=this.entityViews.get(e.id);if(!v)continue;const render=renderConfigOf(this.registry.definition(e.definitionId));v.position.set(e.x,e.y??0,e.z);v.rotation.y=e.yaw+(render?.headingOffset||0);
      if(e.initialResourceCapacity!=null){const ratio=Math.max(0,Math.min(1,(e.resourceRemaining??0)/Math.max(1,e.initialResourceCapacity)));v.visible=ratio>0.001;const scale=(v.userData.baseScale??1)*(0.35+0.65*Math.sqrt(ratio));v.scale.setScalar(scale);}else v.visible=true;
      const turret=v.userData.turretNodeRef;if(turret&&e.turretYaw!=null){const relative=wrapPi(e.turretYaw-e.yaw)+(render?.turretHeadingOffset||0);turret.rotation.y=(turret.userData.baseRotationY||0)+relative;}
      this._applyConstructionLook(v,e);this._applyDestroyedLook(v,!e.alive);
    }
    this._syncProjectiles(sim);this._consumeCombatEvents(sim);this._cleanupEffects();
  }
  setSelection(entity){if(!entity?.alive){this.selectionRing.visible=false;return;}this.selectionRing.visible=true;this.selectionRing.position.set(entity.x,(entity.y??0)+.14,entity.z);const r=Math.max(1.3,(entity.radius||1)*1.25);this.selectionRing.scale.setScalar(r);}
  showDestination(p){this.destinationRing.visible=true;this.destinationRing.position.set(p.x,(this.terrain?.heightAt(p.x,p.z)??0)+.16,p.z);this.destinationRing.scale.setScalar(1.2);clearTimeout(this._destTimer);this._destTimer=setTimeout(()=>this.destinationRing.visible=false,900);}
  showAttackTarget(entity){if(!entity)return;this.attackRing.visible=true;this.attackRing.position.set(entity.x,(entity.y??0)+.18,entity.z);this.attackRing.scale.setScalar(Math.max(1.45,(entity.radius||1)*1.35));clearTimeout(this._atkTimer);this._atkTimer=setTimeout(()=>this.attackRing.visible=false,900);}
  resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  render(){this.renderer.render(this.scene,this.camera);}
}
