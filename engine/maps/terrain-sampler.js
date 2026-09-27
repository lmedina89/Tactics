const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a||1),0,1);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;

function hash2(seed,x,z){
  let h=(seed|0) ^ Math.imul((x|0),0x45d9f3b) ^ Math.imul((z|0),0x27d4eb2d);
  h=Math.imul(h^(h>>>16),0x45d9f3b); h=Math.imul(h^(h>>>16),0x45d9f3b); h^=h>>>16;
  return (h>>>0)/4294967295;
}
function valueNoise(seed,x,z,scale){
  const fx=x/scale,fz=z/scale,x0=Math.floor(fx),z0=Math.floor(fz),tx=fx-x0,tz=fz-z0;
  const sx=tx*tx*(3-2*tx),sz=tz*tz*(3-2*tz);
  const a=hash2(seed,x0,z0),b=hash2(seed,x0+1,z0),c=hash2(seed,x0,z0+1),d=hash2(seed,x0+1,z0+1);
  return lerp(lerp(a,b,sx),lerp(c,d,sx),sz)*2-1;
}
function segNearest(px,pz,a,b){
  const vx=b.x-a.x,vz=b.z-a.z,wx=px-a.x,wz=pz-a.z;
  const vv=vx*vx+vz*vz||1; const t=clamp((wx*vx+wz*vz)/vv,0,1);
  const x=a.x+vx*t,z=a.z+vz*t; return {x,z,t,distance:Math.hypot(px-x,pz-z)};
}

export class TerrainSampler {
  constructor(map){this.map=map;this.seed=map.seed??1;this.hf=map.terrain.heightfield;}

  rawHeightAt(x,z){
    let h=this.hf.baseHeight??0;
    const n=this.hf.noise||{};
    const oct=n.octaves??3,scale=n.scale??90,amp=n.amplitude??8,persist=n.persistence??0.5;
    let a=amp,s=scale;
    for(let i=0;i<oct;i++){h+=valueNoise(this.seed+i*101,x,z,s)*a;a*=persist;s*=0.5;}
    for(const f of this.hf.features||[]){
      const dx=x-f.x,dz=z-f.z,d=Math.hypot(dx,dz),r=f.radius||1;
      if(d>=r)continue;
      const t=1-d/r,shape=t*t*(3-2*t);
      h+=(f.height||0)*shape;
    }
    return h;
  }

  _nearestRoad(x,z){
    let best=null;
    for(const road of this.map.roads||[]){
      const pts=road.points||[];
      for(let i=0;i<pts.length-1;i++){
        const n=segNearest(x,z,pts[i],pts[i+1]);
        if(!best||n.distance<best.distance)best={...n,road,a:pts[i],b:pts[i+1]};
      }
    }
    return best;
  }
  _nearestRiver(x,z){
    let best=null;
    for(const river of this.map.water?.rivers||[]){
      const pts=river.points||[];
      for(let i=0;i<pts.length-1;i++){
        const n=segNearest(x,z,pts[i],pts[i+1]);
        if(!best||n.distance<best.distance)best={...n,river,a:pts[i],b:pts[i+1]};
      }
    }
    return best;
  }

  heightAt(x,z){
    let h=this.rawHeightAt(x,z);
    const riverHit=this._nearestRiver(x,z);
    if(riverHit){
      const r=riverHit.river, half=(r.width??18)/2, bank=r.bankWidth??12;
      if(riverHit.distance < half+bank){
        const water=r.waterLevel??0, depth=r.depth??4;
        const channel=water-depth;
        const edgeT=smoothstep(half,half+bank,riverHit.distance);
        const target=lerp(channel,h,edgeT);
        h=Math.min(h,target);
      }
    }
    const roadHit=this._nearestRoad(x,z);
    if(roadHit){
      const road=roadHit.road,half=(road.width??9)/2,shoulder=road.shoulderWidth??5;
      if(roadHit.distance<half+shoulder){
        const ah=this.rawHeightAt(roadHit.a.x,roadHit.a.z),bh=this.rawHeightAt(roadHit.b.x,roadHit.b.z);
        const grade=lerp(ah,bh,roadHit.t)+(road.gradeOffset??0);
        const edge=smoothstep(half,half+shoulder,roadHit.distance);
        h=lerp(grade,h,edge);
      }
    }
    return h;
  }

  slopeDeg(x,z,step=2){
    const dx=(this.heightAt(x+step,z)-this.heightAt(x-step,z))/(step*2);
    const dz=(this.heightAt(x,z+step)-this.heightAt(x,z-step))/(step*2);
    return Math.atan(Math.hypot(dx,dz))*180/Math.PI;
  }

  waterAt(x,z){
    const h=this._nearestRiver(x,z); if(!h)return null;
    const half=(h.river.width??18)/2;
    if(h.distance>half)return null;
    return {id:h.river.id,level:h.river.waterLevel??0,distance:h.distance};
  }

  materialWeights(x,z){
    const slope=this.slopeDeg(x,z,2.5);
    const cliff=this.map.terrain.cliffs||{};
    const rock=smoothstep(cliff.slopeStartDeg??24,cliff.slopeFullDeg??38,slope);
    const river=this._nearestRiver(x,z);
    const moisture=river?1-smoothstep((river.river.width??18)/2+8,(river.river.width??18)/2+70,river.distance):0;
    const noise=valueNoise(this.seed+991,x,z,32)*0.5+0.5;
    let dirt=clamp((1-moisture)*0.32 + (noise-0.5)*0.35,0,1)*(1-rock);
    let grass=clamp(1-rock-dirt,0,1);
    if(moisture>0){grass=clamp(grass+moisture*0.24,0,1);dirt*=1-moisture*0.35;}
    const sum=grass+dirt+rock||1;
    return {grass:grass/sum,dirt:dirt/sum,rock:rock/sum};
  }
}
