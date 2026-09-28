import {moduleConfig} from '../entities/game-object.js';
const TAU=Math.PI*2;
const wrapPi=a=>{while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU;return a;};
function localToWorldOffset(x,z,yaw){return {x:Math.cos(yaw)*x+Math.sin(yaw)*z,z:-Math.sin(yaw)*x+Math.cos(yaw)*z};}
export function wallConnectionOf(def){return moduleConfig(def,'WallConnection');}
export function wallSocketsWorld(def,pose){const wall=wallConnectionOf(def);if(!wall)return [];return (wall.sockets||[]).map(s=>{const o=localToWorldOffset(s.x??0,s.z??0,pose.yaw??0);return {...s,worldX:(pose.x??0)+o.x,worldZ:(pose.z??0)+o.z,worldFacing:wrapPi((pose.yaw??0)+(s.facing??0))};});}
export function wallDefinitionsCompatible(a,b){const aw=wallConnectionOf(a),bw=wallConnectionOf(b);return !!(aw&&bw&&aw.connectionGroup===bw.connectionGroup);}
export function findBestWallSnap({movingDef,movingPose,targetDef,targetPose,maxDistance=null}){
  const mw=wallConnectionOf(movingDef),tw=wallConnectionOf(targetDef);if(!mw||!tw||mw.connectionGroup!==tw.connectionGroup)return null;
  const movingNow=wallSocketsWorld(movingDef,movingPose),targetNow=wallSocketsWorld(targetDef,targetPose);let best=null;
  for(const ms of movingNow)for(const ts of targetNow){const d=Math.hypot(ms.worldX-ts.worldX,ms.worldZ-ts.worldZ),limit=maxDistance??Math.max(mw.snapDistance??1,tw.snapDistance??1);if(d>limit)continue;const yaw=wrapPi(ts.worldFacing+Math.PI-(ms.facing??0)),offset=localToWorldOffset(ms.x??0,ms.z??0,yaw),pose={x:ts.worldX-offset.x,z:ts.worldZ-offset.z,yaw};const score=d;const key=`${ts.id}|${ms.id}`;if(!best||score<best.score-1e-8||(Math.abs(score-best.score)<=1e-8&&key<best.key))best={score,key,movingSocketId:ms.id,targetSocketId:ts.id,targetPoint:{x:ts.worldX,z:ts.worldZ},pose};}
  return best;
}
