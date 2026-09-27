import * as THREE from 'three';

export class InputController {
  constructor({canvas, renderer, sim, onSelection, onStatus}) {
    this.canvas=canvas; this.renderer=renderer; this.sim=sim; this.onSelection=onSelection; this.onStatus=onStatus;
    this.selectedId=null; this.raycaster=new THREE.Raycaster(); this.ndc=new THREE.Vector2();
    this.pointers=new Map(); this.dragging=false; this.cameraTarget=new THREE.Vector3(0,0,0); this.lastPinch=0;
    this._bind();
  }
  selected(){return this.selectedId?this.sim.entities.get(this.selectedId):null;}
  clear(){this.selectedId=null;this.onSelection(null);}
  _bind(){
    const c=this.canvas; c.style.touchAction='none';
    c.addEventListener('pointerdown',e=>this._down(e));
    c.addEventListener('pointermove',e=>this._move(e));
    c.addEventListener('pointerup',e=>this._up(e));
    c.addEventListener('pointercancel',e=>this._up(e));
    c.addEventListener('wheel',e=>{e.preventDefault();this._zoom(Math.sign(e.deltaY)*12);},{passive:false});
  }
  _down(e){this.canvas.setPointerCapture?.(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now()});if(this.pointers.size===2)this.lastPinch=this._pinchDistance();}
  _move(e){const p=this.pointers.get(e.pointerId);if(!p)return;const ox=p.x,oy=p.y;p.x=e.clientX;p.y=e.clientY;
    if(this.pointers.size===2){const d=this._pinchDistance(); if(this.lastPinch){this._zoom((this.lastPinch-d)*.20);} this.lastPinch=d;return;}
    const dist=Math.hypot(p.x-p.sx,p.y-p.sy); if(dist>18){this.dragging=true;this._pan(p.x-ox,p.y-oy);}
  }
  _up(e){const p=this.pointers.get(e.pointerId);if(!p)return;const dist=Math.hypot(e.clientX-p.sx,e.clientY-p.sy),duration=performance.now()-p.t;this.pointers.delete(e.pointerId);if(this.pointers.size<2)this.lastPinch=0;
    const wasDrag=this.dragging; if(this.pointers.size===0)this.dragging=false;
    if(!wasDrag && dist<24 && duration<650)this._tap(e.clientX,e.clientY);
  }
  _pinchDistance(){const a=[...this.pointers.values()];return a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}
  _mouseNdc(x,y){const r=this.canvas.getBoundingClientRect();this.ndc.x=((x-r.left)/r.width)*2-1;this.ndc.y=-((y-r.top)/r.height)*2+1;}
  _tap(x,y){this._mouseNdc(x,y);this.raycaster.setFromCamera(this.ndc,this.renderer.camera);
    const hits=this.raycaster.intersectObjects([...this.renderer.entityViews.values()],true);
    for(const h of hits){const id=h.object.userData.entityId||h.object.parent?.userData.entityId;if(!id)continue;const ent=this.sim.entities.get(id);if(ent?.selectable && ent.factionId==='player'){this.selectedId=id;this.onSelection(ent);this.onStatus(`SELECTED ${this.renderer.registry.definition(ent.definitionId).name.toUpperCase()}`);return;}}
    const s=this.selected(); if(!s)return;
    const gh=this.raycaster.intersectObject(this.renderer.ground,false)[0]; if(!gh)return;
    const dest={x:gh.point.x,z:gh.point.z}; this.sim.issueMove([s.id],dest); this.renderer.showDestination(dest); this.onStatus('MOVE ORDER');
  }
  stop(){const s=this.selected();if(!s)return;this.sim.issueStop([s.id]);this.onStatus('STOP');}
  _pan(dx,dy){const cam=this.renderer.camera;const scale=cam.position.y/620;cam.position.x-=dx*scale;cam.position.z-=dy*scale;this._clampCamera();}
  _zoom(delta){const cam=this.renderer.camera;const target=new THREE.Vector3(0,0,0);const dir=cam.position.clone().sub(target);const next=THREE.MathUtils.clamp(dir.length()+delta,95,390);dir.setLength(next);cam.position.copy(target).add(dir);this._clampCamera();}
  _clampCamera(){const c=this.renderer.camera;c.position.x=THREE.MathUtils.clamp(c.position.x,-240,240);c.position.z=THREE.MathUtils.clamp(c.position.z,-240,240);c.position.y=THREE.MathUtils.clamp(c.position.y,75,310);}
}
