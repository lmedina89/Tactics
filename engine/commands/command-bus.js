export const CommandType=Object.freeze({
  MOVE:'MOVE',STOP:'STOP',ATTACK:'ATTACK',ATTACK_MOVE:'ATTACK_MOVE',GUARD_POSITION:'GUARD_POSITION',GUARD_OBJECT:'GUARD_OBJECT',SET_STANCE:'SET_STANCE',
  HARVEST:'HARVEST',RETURN_CARGO:'RETURN_CARGO',
  PRODUCE:'PRODUCE',CANCEL_PRODUCTION:'CANCEL_PRODUCTION',
  BUILD_STRUCTURE:'BUILD_STRUCTURE',CANCEL_CONSTRUCTION:'CANCEL_CONSTRUCTION'
});

// Mirrors the useful Generals distinction between player/script/AI command origin.
// The simulation, not the UI, decides whether the issuer may control an object.
export const CommandSource=Object.freeze({
  PLAYER:'FROM_PLAYER',SCRIPT:'FROM_SCRIPT',AI:'FROM_AI',SYSTEM:'FROM_SYSTEM'
});

export class CommandBus{
  constructor(){this.queue=[];this.serial=0;}
  issue(command){const c={serial:++this.serial,...structuredClone(command)};this.queue.push(c);return c;}
  drain(){const q=this.queue;this.queue=[];return q;}
  snapshot(){return {serial:this.serial,queue:structuredClone(this.queue)};}
  restore(state){this.serial=state?.serial??0;this.queue=structuredClone(state?.queue??[]);}
}
