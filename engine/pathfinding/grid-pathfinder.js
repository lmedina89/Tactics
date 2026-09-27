const key = (x,z) => `${x},${z}`;

export class GridPathfinder {
  constructor(map, cellSize = 4) {
    this.map = map;
    this.cellSize = cellSize;
    this.halfW = map.size.width/2;
    this.halfD = map.size.depth/2;
    this.cols = Math.ceil(map.size.width/cellSize);
    this.rows = Math.ceil(map.size.depth/cellSize);
    this.blocked = new Set();
    this._buildBlocked();
  }

  _cellOf(x,z) {
    return {
      x: Math.max(0, Math.min(this.cols-1, Math.floor((x+this.halfW)/this.cellSize))),
      z: Math.max(0, Math.min(this.rows-1, Math.floor((z+this.halfD)/this.cellSize)))
    };
  }
  _worldOf(cx,cz) {
    return {x: -this.halfW + (cx+0.5)*this.cellSize, z: -this.halfD + (cz+0.5)*this.cellSize};
  }
  _buildBlocked() {
    for (const o of this.map.staticObstacles || []) {
      const min = this._cellOf(o.x-o.width/2, o.z-o.depth/2);
      const max = this._cellOf(o.x+o.width/2, o.z+o.depth/2);
      for (let z=min.z; z<=max.z; z++) for (let x=min.x; x<=max.x; x++) this.blocked.add(key(x,z));
    }
  }
  isWalkableCell(x,z) {
    return x>=0 && z>=0 && x<this.cols && z<this.rows && !this.blocked.has(key(x,z));
  }
  nearestWalkable(x,z,maxR=12) {
    const c=this._cellOf(x,z);
    if (this.isWalkableCell(c.x,c.z)) return this._worldOf(c.x,c.z);
    for (let r=1;r<=maxR;r++) {
      for (let dz=-r;dz<=r;dz++) for (let dx=-r;dx<=r;dx++) {
        if (Math.max(Math.abs(dx),Math.abs(dz))!==r) continue;
        const nx=c.x+dx,nz=c.z+dz;
        if (this.isWalkableCell(nx,nz)) return this._worldOf(nx,nz);
      }
    }
    return null;
  }
  findPath(sx,sz,tx,tz) {
    const s=this._cellOf(sx,sz), rawT=this._cellOf(tx,tz);
    const adj=this.nearestWalkable(tx,tz);
    if (!adj) return [];
    const t=this._cellOf(adj.x,adj.z);
    const open=[{x:s.x,z:s.z,g:0,f:0}];
    const came=new Map(), gScore=new Map([[key(s.x,s.z),0]]), closed=new Set();
    const heuristic=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
    const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    while(open.length) {
      open.sort((a,b)=>a.f-b.f);
      const cur=open.shift(), ck=key(cur.x,cur.z);
      if (closed.has(ck)) continue;
      closed.add(ck);
      if (cur.x===t.x && cur.z===t.z) {
        const cells=[]; let k=ck, node={x:cur.x,z:cur.z};
        cells.push(node);
        while(came.has(k)) { node=came.get(k); cells.push(node); k=key(node.x,node.z); }
        cells.reverse();
        const pts=cells.map(c=>this._worldOf(c.x,c.z));
        if (pts.length) pts[pts.length-1]=adj;
        return this._simplify(pts);
      }
      for (const [dx,dz] of dirs) {
        const nx=cur.x+dx,nz=cur.z+dz;
        if (!this.isWalkableCell(nx,nz)) continue;
        if (dx && dz && (!this.isWalkableCell(cur.x+dx,cur.z)||!this.isWalkableCell(cur.x,cur.z+dz))) continue;
        const nk=key(nx,nz), step=dx&&dz?1.4142:1, ng=cur.g+step;
        if (ng >= (gScore.get(nk) ?? Infinity)) continue;
        gScore.set(nk,ng); came.set(nk,{x:cur.x,z:cur.z});
        open.push({x:nx,z:nz,g:ng,f:ng+heuristic({x:nx,z:nz},t)});
      }
    }
    return [];
  }
  _simplify(points) {
    if (points.length<3) return points;
    const out=[points[0]];
    let pdx=0,pdz=0;
    for(let i=1;i<points.length;i++) {
      const dx=Math.sign(points[i].x-points[i-1].x), dz=Math.sign(points[i].z-points[i-1].z);
      if (i>1 && (dx!==pdx || dz!==pdz)) out.push(points[i-1]);
      pdx=dx;pdz=dz;
    }
    out.push(points.at(-1)); return out;
  }
}
