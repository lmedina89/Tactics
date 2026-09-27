export class SeededRng {
  constructor(seed=1) { this.state=(seed>>>0)||1; }
  nextU32() {
    let x=this.state;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.state=x>>>0; return this.state;
  }
  next() { return this.nextU32()/0x100000000; }
  range(min,max) { return min+(max-min)*this.next(); }
  snapshot() { return this.state>>>0; }
  restore(state) { this.state=(state>>>0)||1; }
}
