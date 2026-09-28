import test from 'node:test';
import assert from 'node:assert/strict';
import {GestureResolver,GestureType} from '../ui/gesture-resolver.js';

test('gesture resolver emits no gameplay tap before pointer-up classification',()=>{
  const g=new GestureResolver();assert.deepEqual(g.down(1,10,10,0),[]);assert.deepEqual(g.move(1,20,18,100),[]);const out=g.up(1,21,19,180);assert.equal(out.length,1);assert.equal(out[0].type,GestureType.TAP);
});

test('deliberate drag becomes pan and never emits tap',()=>{
  const g=new GestureResolver();g.down(1,0,0,0);const m=g.move(1,40,0,100);assert.ok(m.some(x=>x.type===GestureType.PAN_START));assert.ok(m.some(x=>x.type===GestureType.PAN));const end=g.up(1,42,0,180);assert.equal(end.length,1);assert.equal(end[0].type,GestureType.PAN_END);
});

test('long press is classified separately from tap',()=>{
  const g=new GestureResolver({longPressMs:500});g.down(1,5,5,0);const out=g.up(1,7,6,600);assert.equal(out[0].type,GestureType.LONG_PRESS);
});

test('pinch suppresses tap classification for participating touches',()=>{
  const g=new GestureResolver();g.down(1,0,0,0);g.down(2,20,0,0);const out=g.move(2,30,0,50);assert.equal(out[0].type,GestureType.PINCH);assert.deepEqual(g.up(2,30,0,80),[]);assert.deepEqual(g.up(1,0,0,90),[]);
});
