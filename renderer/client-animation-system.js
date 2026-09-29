import * as THREE from 'three';

const TAU=Math.PI*2;
const AXES=Object.freeze({x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapTau=v=>Math.abs(v)>TAU*4?v%TAU:v;
const axisOf=name=>AXES[String(name||'y').toLowerCase()]||AXES.y;
const pathParts=path=>String(path||'').split('.').filter(Boolean);
const pathValue=(obj,parts)=>parts.reduce((v,k)=>v?.[k],obj);

function findNodes(root,names=[],prefixes=[]){
  const out=[],seen=new Set();
  for(const name of names){const n=root.getObjectByName(name);if(n&&!seen.has(n)){seen.add(n);out.push(n);}}
  if(prefixes.length)root.traverse(n=>{const name=n.name||'';if(prefixes.some(p=>name.startsWith(p))&&!seen.has(n)){seen.add(n);out.push(n);}});
  return out;
}
function rememberNodes(nodes){return nodes.map(node=>({node,baseQuaternion:node.quaternion.clone()}));}
function rememberTranslationNodes(nodes){return nodes.map(node=>({node,basePosition:node.position.clone()}));}
function applyLocalAxis(item,axis,angle,tempQ){tempQ.setFromAxisAngle(axis,angle);item.node.quaternion.copy(item.baseQuaternion).multiply(tempQ);}
function applyLocalTranslation(item,axis,distance){item.node.position.copy(item.basePosition).addScaledVector(axis,distance);}
function compileSpec(spec){return {...spec,_activePathParts:spec.activeWhen?.path?pathParts(spec.activeWhen.path):null};}
function allowed(entity,spec){
  if(!entity?.alive)return false;
  if(spec.requiresOperational!==false&&entity.operational===false)return false;
  if(!spec.activeWhen)return true;
  const actual=pathValue(entity,spec._activePathParts||[]);
  if(Array.isArray(spec.activeWhen.in))return spec.activeWhen.in.includes(actual);
  if(Object.hasOwn(spec.activeWhen,'equals'))return actual===spec.activeWhen.equals;
  if(Object.hasOwn(spec.activeWhen,'notEquals'))return actual!==spec.activeWhen.notEquals;
  return !!actual;
}

/**
 * Presentation-only animation layer. It consumes authoritative simulation state
 * but never feeds transforms back into GameLogic. The boundary intentionally
 * mirrors C&C's gameplay-vs-client/draw separation while staying browser-native.
 */
export class ClientAnimationSystem{
  constructor(){this._q=new THREE.Quaternion();}

  setup(view,{animations=[]}={},config){
    if(!view||!config)return null;
    const runtime={config,mixer:null,movingClip:null,triggerClips:new Map(),procedural:[],activeLoop:null,oneShot:null,oneShotUntil:0};

    if((config.clips||[]).length&&animations.length){
      runtime.mixer=new THREE.AnimationMixer(view);
      const byName=new Map(animations.map(c=>[c.name,c]));
      for(const raw of config.clips){
        const spec=compileSpec(raw),clip=byName.get(spec.clip);if(!clip)continue;
        const action=runtime.mixer.clipAction(clip);action.enabled=true;action.clampWhenFinished=false;
        if(spec.loop===false||spec.mode==='ONCE')action.setLoop(THREE.LoopOnce,1);else action.setLoop(THREE.LoopRepeat,Infinity);
        const entry={key:spec.id||spec.driver,spec:{...spec,duration:clip.duration},action};
        const driver=String(spec.driver||'').toUpperCase();
        if(driver==='MOVING')runtime.movingClip=entry;else runtime.triggerClips.set(driver,entry);
      }
    }

    for(const raw of config.procedural||[]){
      const spec=compileSpec(raw),driver=String(spec.driver||'').toUpperCase();
      if(driver==='TRIGGER_TRANSLATE'){
        const nodes=findNodes(view,spec.nodes||[],spec.nodePrefixes||[]);if(!nodes.length)continue;
        runtime.procedural.push({spec,driver,axis:axisOf(spec.axis),items:rememberTranslationNodes(nodes),triggerStart:-Infinity,active:false});continue;
      }
      if(driver==='GROUP_SPIN'){
        const pivotNode=spec.pivotNode?view.getObjectByName(spec.pivotNode):null,parent=(spec.parentNode?view.getObjectByName(spec.parentNode):null)||pivotNode?.parent||view,prefixes=spec.nodePrefixes||[],members=[];
        view.traverse(n=>{if(n===pivotNode)return;const name=n.name||'';if(prefixes.some(p=>name.startsWith(p)))members.push(n);});
        if(!members.length||!parent)continue;
        view.updateMatrixWorld(true);
        let local;
        if(spec.pivotLocal)local=new THREE.Vector3(spec.pivotLocal.x??0,spec.pivotLocal.y??0,spec.pivotLocal.z??0);
        else if(pivotNode){const center=new THREE.Box3().setFromObject(pivotNode).getCenter(new THREE.Vector3());local=parent.worldToLocal(center.clone());}
        else continue;
        const group=new THREE.Group();group.name=`__ClientAnim_${spec.id||spec.pivotNode||'group'}`;group.position.copy(local);parent.add(group);parent.updateMatrixWorld(true);group.updateMatrixWorld(true);
        for(const n of members)group.attach(n);
        runtime.procedural.push({spec,driver,axis:axisOf(spec.axis),items:rememberNodes([group]),angle:0});continue;
      }
      const nodes=findNodes(view,spec.nodes||[],spec.nodePrefixes||[]);if(!nodes.length)continue;
      runtime.procedural.push({spec,driver,axis:axisOf(spec.axis),items:rememberNodes(nodes),angle:0});
    }
    view.userData.clientAnimation=runtime;return runtime;
  }

  dispose(view){
    const r=view?.userData?.clientAnimation;if(!r)return;
    r.mixer?.stopAllAction();r.mixer?.uncacheRoot(view);delete view.userData.clientAnimation;
  }

  trigger(view,trigger,nowMs=performance.now()){
    const r=view?.userData?.clientAnimation;if(!r)return;
    const triggerKey=String(trigger||'').toUpperCase();
    for(const p of r.procedural){if(p.driver==='TRIGGER_TRANSLATE'&&String(p.spec.trigger||'WEAPON_FIRE').toUpperCase()===triggerKey){p.triggerStart=nowMs/1000;p.active=true;}}
    if(!r.mixer)return;
    const entry=r.triggerClips.get(triggerKey);if(!entry)return;
    const {key,spec,action}=entry;
    if(r.activeLoop&&r.activeLoop!==key)r.movingClip?.action?.fadeOut(spec.fadeSeconds??.06);
    if(r.oneShot&&r.oneShot.key!==key)r.oneShot.action.stop();
    const scale=Math.max(.05,spec.timeScale??1);action.reset();action.setEffectiveTimeScale(scale);action.setEffectiveWeight(1);action.fadeIn(spec.fadeSeconds??.04);action.play();
    r.oneShot=entry;r.oneShotUntil=nowMs+(spec.duration/scale)*1000;
  }

  _updateClips(r,entity,dt,nowMs){
    if(!r.mixer)return;
    if(r.oneShot&&nowMs<r.oneShotUntil){r.mixer.update(dt);return;}
    if(r.oneShot){r.oneShot.action.fadeOut(r.oneShot.spec.fadeSeconds??.05);r.oneShot=null;r.oneShotUntil=0;}
    const entry=r.movingClip;
    if(entry){
      const {key,spec,action}=entry,moving=entity.alive&&entity.operational!==false&&Math.abs(entity.speed??0)>(spec.minSpeed??.12);
      if(moving){
        const ref=Math.max(.05,spec.referenceSpeed??5),scale=spec.speedFromMovement===false?(spec.timeScale??1):clamp(Math.abs(entity.speed??0)/ref,spec.minTimeScale??.55,spec.maxTimeScale??1.65);
        action.setEffectiveTimeScale(scale);
        if(r.activeLoop!==key){action.reset().fadeIn(spec.fadeSeconds??.1).play();r.activeLoop=key;}
      }else if(r.activeLoop===key){action.fadeOut(spec.fadeSeconds??.12);r.activeLoop=null;}
    }
    r.mixer.update(dt);
  }

  _updateProcedural(r,entity,dt,elapsed){
    for(const p of r.procedural){
      const s=p.spec,active=allowed(entity,s),axis=p.axis;
      if(p.driver==='WHEEL_SPIN'){
        const radius=Math.max(.05,s.radius??.5),speed=active?(entity.speed??0):0;p.angle=wrapTau(p.angle+(speed/radius)*(s.direction??1)*dt);
        for(const item of p.items)applyLocalAxis(item,axis,p.angle,this._q);continue;
      }
      if(p.driver==='STEERING'){
        const a=active?(entity.steeringAngle??0)*(s.multiplier??1):0;for(const item of p.items)applyLocalAxis(item,axis,a,this._q);continue;
      }
      if(p.driver==='CONTINUOUS_SPIN'||p.driver==='GROUP_SPIN'||p.driver==='STATE_SPIN'){
        if(active)p.angle=wrapTau(p.angle+(s.radiansPerSecond??4)*(s.direction??1)*dt);
        for(const item of p.items)applyLocalAxis(item,axis,p.angle,this._q);continue;
      }
      if(p.driver==='OSCILLATE'){
        const a=active?Math.sin((elapsed*(s.frequencyHz??.25)+((s.phase??0)/TAU))*TAU)*(s.amplitudeRadians??.15):0;
        for(const item of p.items)applyLocalAxis(item,axis,a,this._q);
        continue;
      }
      if(p.driver==='TRIGGER_TRANSLATE'){
        const kick=Math.max(.001,s.kickSeconds??.05),ret=Math.max(.001,s.returnSeconds??.16),total=kick+ret;
        let distance=0;
        if(active&&p.active){
          const t=Math.max(0,elapsed-p.triggerStart);
          if(t<kick){const u=t/kick,ease=1-Math.pow(1-u,3);distance=(s.distance??-.25)*ease;}
          else if(t<total){const u=(t-kick)/ret,ease=1-Math.pow(1-u,3);distance=(s.distance??-.25)*(1-ease);}
          else p.active=false;
        }else p.active=false;
        for(const item of p.items)applyLocalTranslation(item,axis,distance);
      }
    }
  }

  update(view,entity,dt,nowMs=performance.now()){
    const r=view?.userData?.clientAnimation;if(!r)return;
    dt=clamp(dt||0,0,.08);const elapsed=nowMs/1000;
    this._updateClips(r,entity,dt,nowMs);this._updateProcedural(r,entity,dt,elapsed);
  }
}
