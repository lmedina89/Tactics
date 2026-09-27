import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as skeletonClone} from 'three/addons/utils/SkeletonUtils.js';
import {TerrainRenderer} from './terrain-renderer.js';

export class ThreeRenderer{
  constructor({canvas,registry,map}){
    this.canvas=canvas;this.registry=registry;this.map=map;
    const env=map.environment||{};
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(env.skyColor||0x87958a);
    if(env.fogFar)this.scene.fog=new THREE.Fog(new THREE.Color(env.fogColor||env.skyColor||0x87958a),env.fogNear??300,env.fogFar);
    this.camera=new THREE.PerspectiveCamera(47,1,.1,2200);this.camera.position.set(-85,165,185);this.camera.lookAt(0,0,0);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=false;
    this.loader=new GLTFLoader();this.assetPromises=new Map();this.entityViews=new Map();this.terrain=null;this.ground=null;
    this.selectionRing=this._makeRing(0x9de06d);this.destinationRing=this._makeRing(0xf1d35d);this.destinationRing.visible=false;this.selectionRing.visible=false;this.scene.add(this.selectionRing,this.destinationRing);
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
      if(this.entityViews.has(e.id))continue;const def=this.registry.definition(e.definitionId);if(!def?.asset)continue;
      const base=await this._loadAsset(def.asset),obj=skeletonClone(base);obj.name=e.id;obj.userData.entityId=e.id;
      const faction=e.factionId?this.registry.faction(e.factionId):null;
      obj.traverse(n=>{if(!n.isMesh)return;n.userData.entityId=e.id;n.material=n.material.clone();if(faction?.id==='crimson'){const c=n.material.color?.clone?.();if(c){c.lerp(new THREE.Color(faction.color),.34);n.material.color.copy(c);}if(n.material.emissive)n.material.emissive.lerp(new THREE.Color(faction.accent),.08);}});
      obj.scale.setScalar(def.model?.scale??1);this.scene.add(obj);this.entityViews.set(e.id,obj);
    }
  }

  sync(sim){for(const e of sim.entities.values()){const v=this.entityViews.get(e.id);if(!v)continue;v.position.set(e.x,e.y??0,e.z);v.rotation.y=e.yaw+(this.registry.definition(e.definitionId).model?.headingOffset||0);}}
  setSelection(entity){if(!entity){this.selectionRing.visible=false;return;}this.selectionRing.visible=true;this.selectionRing.position.set(entity.x,(entity.y??0)+.14,entity.z);const r=Math.max(1.3,(entity.radius||1)*1.25);this.selectionRing.scale.setScalar(r);}
  showDestination(p){this.destinationRing.visible=true;this.destinationRing.position.set(p.x,(this.terrain?.heightAt(p.x,p.z)??0)+.16,p.z);this.destinationRing.scale.setScalar(1.2);clearTimeout(this._destTimer);this._destTimer=setTimeout(()=>this.destinationRing.visible=false,900);}
  resize(){const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  render(){this.renderer.render(this.scene,this.camera);}
}
