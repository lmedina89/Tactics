import * as THREE from 'three';

function makeStripGeometry(points,width,terrain,yOffset=0){
  const positions=[],uvs=[],indices=[];let run=0;
  for(let i=0;i<points.length;i++){
    const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
    const tx=next.x-prev.x,tz=next.z-prev.z,len=Math.hypot(tx,tz)||1,nx=-tz/len,nz=tx/len;
    if(i>0)run+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);
    const lx=p.x+nx*width*.5,lz=p.z+nz*width*.5,rx=p.x-nx*width*.5,rz=p.z-nz*width*.5;
    positions.push(lx,terrain.heightAt(lx,lz)+yOffset,lz, rx,terrain.heightAt(rx,rz)+yOffset,rz);
    uvs.push(0,run/8, 1,run/8);
    if(i<points.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function samplePolyline(points,step=4){
  if(points.length<2)return points;
  const out=[];
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],d=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(d/step));
    for(let j=0;j<n;j++){const t=j/n;out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
  }
  out.push({...points.at(-1)});return out;
}

export class TerrainRenderer{
  constructor({scene,map,terrain}){this.scene=scene;this.map=map;this.terrain=terrain;this.textureLoader=new THREE.TextureLoader();this.textures=new Map();}
  async build(){
    const materials=this.map.terrain.materials||[];
    await Promise.all(materials.map(async m=>{const t=await this.textureLoader.loadAsync(m.albedo);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;this.textures.set(m.id,t);}));
    this.ground=this._buildTerrainMesh();this.scene.add(this.ground);
    await this._buildRoads();this._buildWater();
    return this.ground;
  }

  _buildTerrainMesh(){
    const w=this.map.size.width,d=this.map.size.depth,cell=6,cols=Math.ceil(w/cell),rows=Math.ceil(d/cell);
    const geo=new THREE.PlaneGeometry(w,d,cols,rows);geo.rotateX(-Math.PI/2);
    const pos=geo.attributes.position,weights=new Float32Array(pos.count*3),worldUv=new Float32Array(pos.count*2);
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),z=pos.getZ(i),y=this.terrain.heightAt(x,z),sw=this.terrain.materialWeights(x,z);
      pos.setY(i,y);weights[i*3]=sw.grass;weights[i*3+1]=sw.dirt;weights[i*3+2]=sw.rock;worldUv[i*2]=x;worldUv[i*2+1]=z;
    }
    geo.setAttribute('aSplat',new THREE.BufferAttribute(weights,3));geo.setAttribute('aWorldUv',new THREE.BufferAttribute(worldUv,2));geo.computeVertexNormals();
    const mats=Object.fromEntries((this.map.terrain.materials||[]).map(m=>[m.id,m]));
    const env=this.map.environment||{},sunDir=env.sunDirection||{x:-.55,y:1,z:.32};
    const mat=new THREE.ShaderMaterial({
      uniforms:{
        uGrass:{value:this.textures.get('grass')},uDirt:{value:this.textures.get('dirt')},uRock:{value:this.textures.get('rock')},
        uGrassTile:{value:mats.grass?.tileMeters??18},uDirtTile:{value:mats.dirt?.tileMeters??14},uRockTile:{value:mats.rock?.tileMeters??12},
        uSunDir:{value:new THREE.Vector3(sunDir.x,sunDir.y,sunDir.z).normalize()},uSunColor:{value:new THREE.Color(env.sunColor||'#fff2d5')},uSunIntensity:{value:env.sunIntensity??2.0},
        uAmbient:{value:new THREE.Color(env.hemisphereSky||'#cad8df')},uGroundAmbient:{value:new THREE.Color(env.hemisphereGround||'#3f4638')}
      },
      vertexShader:`
        attribute vec3 aSplat; attribute vec2 aWorldUv; varying vec3 vSplat; varying vec2 vWorldUv; varying vec3 vNormalW;
        void main(){vSplat=aSplat;vWorldUv=aWorldUv;vNormalW=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
      `,
      fragmentShader:`
        uniform sampler2D uGrass;uniform sampler2D uDirt;uniform sampler2D uRock;uniform float uGrassTile;uniform float uDirtTile;uniform float uRockTile;
        uniform vec3 uSunDir;uniform vec3 uSunColor;uniform float uSunIntensity;uniform vec3 uAmbient;uniform vec3 uGroundAmbient;
        varying vec3 vSplat;varying vec2 vWorldUv;varying vec3 vNormalW;
        void main(){
          vec3 w=max(vSplat,vec3(0.0));w/=max(dot(w,vec3(1.0)),0.0001);
          vec3 grass=texture2D(uGrass,vWorldUv/uGrassTile).rgb;vec3 dirt=texture2D(uDirt,vWorldUv/uDirtTile).rgb;vec3 rock=texture2D(uRock,vWorldUv/uRockTile).rgb;
          vec3 base=grass*w.x+dirt*w.y+rock*w.z;vec3 n=normalize(vNormalW);float ndl=max(dot(n,uSunDir),0.0);
          float up=clamp(n.y*.5+.5,0.0,1.0);vec3 hemi=mix(uGroundAmbient,uAmbient,up)*0.48;vec3 lit=base*(hemi+uSunColor*ndl*uSunIntensity*.62);
          gl_FragColor=vec4(lit,1.0);
        }
      `
    });
    const mesh=new THREE.Mesh(geo,mat);mesh.userData.ground=true;mesh.name='TerrainHeightfield';return mesh;
  }

  async _roadTexture(path){
    if(this.textures.has(path))return this.textures.get(path);const t=await this.textureLoader.loadAsync(path);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);t.anisotropy=4;this.textures.set(path,t);return t;
  }

  async _buildRoads(){
    for(const road of this.map.roads||[]){
      const pts=samplePolyline(road.points||[],3.5);if(pts.length<2)continue;
      if(road.shoulder){const tex=await this._roadTexture(road.shoulder);const mat=new THREE.MeshStandardMaterial({map:tex,roughness:1,metalness:0});const mesh=new THREE.Mesh(makeStripGeometry(pts,(road.width??8)+(road.shoulderWidth??4)*2,this.terrain,.018),mat);mesh.name=`RoadShoulder:${road.id}`;this.scene.add(mesh);}
      if(road.surface){const tex=await this._roadTexture(road.surface);const mat=new THREE.MeshStandardMaterial({map:tex,roughness:.92,metalness:.02});const mesh=new THREE.Mesh(makeStripGeometry(pts,road.width??8,this.terrain,.038),mat);mesh.name=`Road:${road.id}`;this.scene.add(mesh);}
    }
  }

  _buildWater(){
    for(const river of this.map.water?.rivers||[]){
      const pts=samplePolyline(river.points||[],3.0);if(pts.length<2)continue;
      const positions=[],indices=[];
      for(let i=0;i<pts.length;i++){
        const p=pts[i],prev=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)],tx=next.x-prev.x,tz=next.z-prev.z,len=Math.hypot(tx,tz)||1,nx=-tz/len,nz=tx/len,w=(river.width??18)*.5,y=(river.waterLevel??0)+.035;
        positions.push(p.x+nx*w,y,p.z+nz*w,p.x-nx*w,y,p.z-nz*w);if(i<pts.length-1){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
      const m=new THREE.MeshPhysicalMaterial({color:new THREE.Color(river.color||'#496f75'),transparent:true,opacity:.82,roughness:.24,metalness:.03,clearcoat:.25,side:THREE.DoubleSide,depthWrite:false});
      const mesh=new THREE.Mesh(g,m);mesh.name=`River:${river.id}`;this.scene.add(mesh);
    }
  }
}
