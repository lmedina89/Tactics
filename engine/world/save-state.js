export function encodeWorldState(simulation){return JSON.stringify(simulation.snapshot());}
export function decodeWorldState(simulation,text){const data=typeof text==='string'?JSON.parse(text):structuredClone(text);simulation.restore(data);return data;}
