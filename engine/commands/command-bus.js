export const CommandType=Object.freeze({MOVE:'MOVE',STOP:'STOP',ATTACK:'ATTACK'});

export class CommandBus{
  constructor(){this.queue=[];this.serial=0;}
  issue(command){const c={serial:++this.serial,...structuredClone(command)};this.queue.push(c);return c;}
  drain(){const q=this.queue;this.queue=[];return q;}
  snapshot(){return {serial:this.serial,queue:structuredClone(this.queue)};}
  restore(state){this.serial=state?.serial??0;this.queue=structuredClone(state?.queue??[]);}
}
