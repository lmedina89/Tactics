import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

export class ThreeRenderer {
  constructor({canvas, registry, map}) {
    this.canvas=canvas; this.registry=registry; this.map=map;
    this.scene=new THREE.Scene(); this.scene.background=new THREE.Color(0x7d8a6b);
    this.camera=new THREE.PerspectiveCamera(48,1,0.1,1800);
    this.camera.position.set(-70,150,170); this.camera.lookAt(0,0,0);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    this.renderer.shadowMap.enabled=false;
    this.loader=new GLTFLoader(); this.assetPromises=new Map(); this.entityViews=new Map();
    this.selectionRing=this._makeRing(0x9de06d); this.destinationRing=this._makeRing(0xf1d35d); this.destinationRing.visible=false;
    this.scene.add(this.selectionRing,this.destinationRing); this.selectionRing.visible=false;
    this._setupWorld(); this.resize();
    addEventListener('resize',()=>this.resize());
  }
  _setupWorld() {
    this.scene.add(new THREE.HemisphereLight(0xc8d8e8,0x3c4437,2.0));
    const sun=new THREE.DirectionalLight(0xffffff,2.3); sun.position.set(-120,220,80); this.scene.add(sun);
    const geo=new THREE.PlaneGeometry(this.map.size.width,this.map.size.depth,1,1);
    const mat=new THREE.MeshStandardMaterial({color:this.map.terrain.color,roughness:1});
    const ground=new THREE.Mesh(geo,mat); ground.rotation.x=-Math.PI/2; ground.userData.ground=true; this.scene.add(ground); this.ground=ground;
    const obstacleMat=new THREE.MeshStandardMaterial({color:0x4e5548,roughness:1});
    for(const o of this.map.staticObstacles||[]) {
      const m=new THREE.Mesh(new THREE.BoxGeometry(o.width,5,o.depth),obstacleMat); m.position.set(o.x,2.3,o.z); this.scene.add(m);
    }
    const grid=new THREE.GridHelper(Math.max(this.map.size.width,this.map.size.depth),52,0x56614c,0x6e7961); grid.position.y=.03; grid.material.opacity=.22; grid.material.transparent=true; this.scene.add(grid);
  }
  _makeRing(color) {
    const m=new THREE.Mesh(new THREE.RingGeometry(1.2,1.6,40),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));
    m.rotation.x=-Math.PI/2; m.position.y=.12; return m;
  }
  async _loadAsset(assetId) {
    if(this.assetPromises.has(assetId)) return this.assetPromises.get(assetId);
    const info=this.registry.asset(assetId); if(!info) throw new Error(`Unknown asset ${assetId}`);
    const p=this.loader.loadAsync(info.path).then(g=>g.scene);
    this.assetPromises.set(assetId,p); return p;
  }
  async buildViews(sim) {
    for(const e of sim.entities.values()) {
      if(this.entityViews.has(e.id)) continue;
      const def=this.registry.definition(e.definitionId), base=await this._loadAsset(def.asset);
      const obj=skeletonClone(base); obj.name=e.id; obj.userData.entityId=e.id;
      const faction=this.registry.faction(e.factionId==='player'?'aegis':'crimson');
      obj.traverse(n=>{
        if(n.isMesh){ n.userData.entityId=e.id; n.material=n.material.clone();
          if(e.factionId==='enemy') {
            const c=n.material.color?.clone?.(); if(c){ c.lerp(new THREE.Color(faction.color),.34); n.material.color.copy(c); }
            if(n.material.emissive) n.material.emissive.lerp(new THREE.Color(faction.accent),.08);
          }
        }
      });
      obj.scale.setScalar(def.model?.scale ?? 1); this.scene.add(obj); this.entityViews.set(e.id,obj);
    }
  }
  sync(sim) {
    for(const e of sim.entities.values()) {
      const v=this.entityViews.get(e.id); if(!v) continue;
      v.position.set(e.x,0,e.z); v.rotation.y=e.yaw+(this.registry.definition(e.definitionId).model?.headingOffset||0);
    }
  }
  setSelection(entity) {
    if(!entity){this.selectionRing.visible=false;return;}
    this.selectionRing.visible=true; this.selectionRing.position.set(entity.x,.14,entity.z); const r=Math.max(1.3,(entity.radius||1)*1.25); this.selectionRing.scale.setScalar(r);
  }
  showDestination(p) { this.destinationRing.visible=true; this.destinationRing.position.set(p.x,.16,p.z); this.destinationRing.scale.setScalar(1.2); clearTimeout(this._destTimer); this._destTimer=setTimeout(()=>this.destinationRing.visible=false,900); }
  resize() {
    const w=this.canvas.clientWidth||innerWidth,h=this.canvas.clientHeight||innerHeight;
    this.renderer.setSize(w,h,false); this.camera.aspect=w/h; this.camera.updateProjectionMatrix();
  }
  render(){this.renderer.render(this.scene,this.camera);}
}
