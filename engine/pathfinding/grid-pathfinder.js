const key=(x,z)=>`${x},${z}`;

export class GridPathfinder {
  constructor(map, terrain, cellSize = null) {
    this.map=map; this.terrain=terrain;
    this.cellSize=cellSize ?? map.navigation?.cellSize ?? 4;
    this.halfW=map.size.width/2; this.halfD=map.size.depth/2;
    this.cols=Math.ceil(map.size.width/this.cellSize); this.rows=Math.ceil(map.size.depth/this.cellSize);
    this.baseBlocked=new Set(); this.dynamicBlockedCounts=new Map(); this.dynamicObstacleCells=new Map();
    this.inflateCache=new Map(); this.terrainCellCache=new Map();
    this._buildBlocked();
  }

  _cellOf(x,z){return {x:Math.max(0,Math.min(this.cols-1,Math.floor((x+this.halfW)/this.cellSize))),z:Math.max(0,Math.min(this.rows-1,Math.floor((z+this.halfD)/this.cellSize)))}};
  _worldOf(cx,cz){return {x:-this.halfW+(cx+.5)*this.cellSize,z:-this.halfD+(cz+.5)*this.cellSize};}
  _inBounds(x,z){return x>=0&&z>=0&&x<this.cols&&z<this.rows;}

  _buildBlocked(){
    for(const o of this.map.staticObstacles||[])this._rasterAxisAligned(o,this.baseBlocked);
    for(const o of this.map.passability?.blockedRects||[])this._rasterAxisAligned(o,this.baseBlocked);
  }

  _rasterAxisAligned(o,target){
    const min=this._cellOf(o.x-o.width/2,o.z-o.depth/2),max=this._cellOf(o.x+o.width/2,o.z+o.depth/2);
    for(let z=min.z;z<=max.z;z++)for(let x=min.x;x<=max.x;x++)target.add(key(x,z));
  }

  _rotatedBounds(o){
    const c=Math.cos(o.yaw||0),s=Math.sin(o.yaw||0),hw=o.width/2,hd=o.depth/2;
    const ex=Math.abs(c)*hw+Math.abs(s)*hd,ez=Math.abs(s)*hw+Math.abs(c)*hd;
    return {minX:o.x-ex,minZ:o.z-ez,maxX:o.x+ex,maxZ:o.z+ez};
  }

  _cellOverlapsRotatedRect(cx,cz,o){
    const p=this._worldOf(cx,cz),c=Math.cos(o.yaw||0),s=Math.sin(o.yaw||0),dx=p.x-o.x,dz=p.z-o.z;
    const lx=dx*c+dz*s,lz=-dx*s+dz*c,pad=this.cellSize*.72;
    return Math.abs(lx)<=o.width/2+pad && Math.abs(lz)<=o.depth/2+pad;
  }

  addDynamicObstacle(id,o){
    if(!id||!o||!(o.width>0)||!(o.depth>0))return;
    this.removeDynamicObstacle(id);
    const b=this._rotatedBounds(o),min=this._cellOf(b.minX,b.minZ),max=this._cellOf(b.maxX,b.maxZ),cells=new Set();
    for(let z=min.z;z<=max.z;z++)for(let x=min.x;x<=max.x;x++)if(this._cellOverlapsRotatedRect(x,z,o)){
      const k=key(x,z);cells.add(k);this.dynamicBlockedCounts.set(k,(this.dynamicBlockedCounts.get(k)||0)+1);
    }
    this.dynamicObstacleCells.set(id,cells);this.inflateCache.clear();
  }

  removeDynamicObstacle(id){
    const cells=this.dynamicObstacleCells.get(id);if(!cells)return;
    for(const k of cells){const n=(this.dynamicBlockedCounts.get(k)||0)-1;if(n<=0)this.dynamicBlockedCounts.delete(k);else this.dynamicBlockedCounts.set(k,n);}
    this.dynamicObstacleCells.delete(id);this.inflateCache.clear();
  }

  clearDynamicObstacles(){this.dynamicBlockedCounts.clear();this.dynamicObstacleCells.clear();this.inflateCache.clear();}
  _combinedBlocked(){const out=new Set(this.baseBlocked);for(const k of this.dynamicBlockedCounts.keys())out.add(k);return out;}

  _inflatedBlocked(clearance=0){
    const cells=Math.max(0,Math.ceil(clearance/this.cellSize));
    const cacheKey=`${cells}:${this.dynamicObstacleCells.size}:${this.dynamicBlockedCounts.size}`;
    if(this.inflateCache.has(cacheKey))return this.inflateCache.get(cacheKey);
    const seed=this._combinedBlocked();if(cells===0){this.inflateCache.set(cacheKey,seed);return seed;}
    const out=new Set(seed);
    for(const v of seed){
      const [sx,sz]=v.split(',').map(Number);
      for(let dz=-cells;dz<=cells;dz++)for(let dx=-cells;dx<=cells;dx++){
        if(dx*dx+dz*dz>cells*cells+0.25)continue;
        const x=sx+dx,z=sz+dz;if(this._inBounds(x,z))out.add(key(x,z));
      }
    }
    this.inflateCache.set(cacheKey,out);return out;
  }

  _terrainCell(x,z){
    const k=key(x,z);if(this.terrainCellCache.has(k))return this.terrainCellCache.get(k);
    const p=this._worldOf(x,z),value={slope:this.terrain.slopeDeg(p.x,p.z,this.cellSize*.45),water:!!this.terrain.waterAt(p.x,p.z)};
    this.terrainCellCache.set(k,value);return value;
  }

  isWalkableCell(x,z,profile={}){
    if(!this._inBounds(x,z))return false;
    if(this._inflatedBlocked(profile.clearance??0).has(key(x,z)))return false;
    const t=this._terrainCell(x,z);
    if((this.map.navigation?.waterIsBlocked??true)&&!profile.allowWater&&t.water)return false;
    if(t.slope>(profile.maxSlopeDeg??this.map.navigation?.defaultMaxSlopeDeg??32))return false;
    return true;
  }

  isWalkableWorld(x,z,profile={}){if(x<-this.halfW||x>=this.halfW||z<-this.halfD||z>=this.halfD)return false;const c=this._cellOf(x,z);return this.isWalkableCell(c.x,c.z,profile);}

  nearestWalkable(x,z,profile={},maxR=16){
    const c=this._cellOf(x,z);
    if(this.isWalkableCell(c.x,c.z,profile))return this._worldOf(c.x,c.z);
    let best=null,bestD=Infinity;
    for(let r=1;r<=maxR;r++){
      for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;
        const nx=c.x+dx,nz=c.z+dz;if(!this.isWalkableCell(nx,nz,profile))continue;
        const p=this._worldOf(nx,nz),d=(p.x-x)**2+(p.z-z)**2;
        if(d<bestD){bestD=d;best=p;}
      }
      if(best)return best;
    }
    return null;
  }

  findPath(sx,sz,tx,tz,profile={}){
    const adjS=this.nearestWalkable(sx,sz,profile),adjT=this.nearestWalkable(tx,tz,profile);
    if(!adjS||!adjT)return [];
    const s=this._cellOf(adjS.x,adjS.z),t=this._cellOf(adjT.x,adjT.z);
    const open=[{x:s.x,z:s.z,g:0,f:0}],came=new Map(),gScore=new Map([[key(s.x,s.z),0]]),closed=new Set();
    const heuristic=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
    const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    while(open.length){
      let bestI=0;for(let i=1;i<open.length;i++)if(open[i].f<open[bestI].f)bestI=i;
      const cur=open.splice(bestI,1)[0],ck=key(cur.x,cur.z);if(closed.has(ck))continue;closed.add(ck);
      if(cur.x===t.x&&cur.z===t.z){
        const cells=[];let node={x:cur.x,z:cur.z},k=ck;cells.push(node);
        while(came.has(k)){node=came.get(k);cells.push(node);k=key(node.x,node.z);}cells.reverse();
        const pts=cells.map(c=>this._worldOf(c.x,c.z));if(pts.length){pts[0]=adjS;pts[pts.length-1]=adjT;}return this._simplify(pts,profile);
      }
      for(const [dx,dz] of dirs){
        const nx=cur.x+dx,nz=cur.z+dz;if(!this.isWalkableCell(nx,nz,profile))continue;
        if(dx&&dz&&(!this.isWalkableCell(cur.x+dx,cur.z,profile)||!this.isWalkableCell(cur.x,cur.z+dz,profile)))continue;
        const nk=key(nx,nz),step=dx&&dz?1.41421356:1,ng=cur.g+step;
        if(ng>=(gScore.get(nk)??Infinity))continue;
        gScore.set(nk,ng);came.set(nk,{x:cur.x,z:cur.z});open.push({x:nx,z:nz,g:ng,f:ng+heuristic({x:nx,z:nz},t)});
      }
    }
    return [];
  }

  _lineWalkable(a,b,profile){
    const ac=this._cellOf(a.x,a.z),bc=this._cellOf(b.x,b.z);let x0=ac.x,z0=ac.z,x1=bc.x,z1=bc.z;
    const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dz=-Math.abs(z1-z0),sz=z0<z1?1:-1;let err=dx+dz;
    while(true){if(!this.isWalkableCell(x0,z0,profile))return false;if(x0===x1&&z0===z1)break;const e2=2*err;if(e2>=dz){err+=dz;x0+=sx;}if(e2<=dx){err+=dx;z0+=sz;}}
    return true;
  }

  _simplify(points,profile){
    if(points.length<3)return points;
    const out=[points[0]];let anchor=0;
    while(anchor<points.length-1){let far=anchor+1;for(let i=anchor+2;i<points.length;i++){if(!this._lineWalkable(points[anchor],points[i],profile))break;far=i;}out.push(points[far]);anchor=far;}
    return out;
  }
}
