export const CommandType = Object.freeze({ MOVE:'MOVE', STOP:'STOP' });

export class CommandBus {
  constructor() { this.queue = []; this.serial = 0; }
  issue(command) {
    const c = { serial: ++this.serial, ...structuredClone(command) };
    this.queue.push(c);
    return c;
  }
  drain() {
    const q = this.queue;
    this.queue = [];
    return q;
  }
}
