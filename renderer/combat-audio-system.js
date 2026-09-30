const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash01=(n,s=0)=>{let x=((n|0)^Math.imul((s|0)+1,0x9e3779b1))>>>0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;return (x>>>0)/4294967295;};

export const SUPPORTED_AUDIO_PRESETS=Object.freeze(['rifle','hmg','autocannon','cannon','artillery','impact_light','impact_medium','impact_heavy','destroy']);

const PRESET_SPEC=Object.freeze({
  rifle:{duration:.12,noise:1.0,noiseDecay:48,tones:[[760,.18,35],[1350,.06,58]],master:.72},
  hmg:{duration:.16,noise:1.0,noiseDecay:36,tones:[[185,.30,20],[920,.10,42]],master:.82},
  autocannon:{duration:.22,noise:.92,noiseDecay:26,tones:[[125,.42,13],[410,.12,25]],master:.90},
  cannon:{duration:.58,noise:.88,noiseDecay:12,tones:[[68,.72,5.2],[118,.34,8.5],[520,.08,20]],master:.96},
  artillery:{duration:.92,noise:.86,noiseDecay:8.0,tones:[[48,.90,3.5],[82,.52,5.5],[220,.13,10]],master:1.0},
  impact_light:{duration:.13,noise:.92,noiseDecay:45,tones:[[330,.08,28]],master:.55},
  impact_medium:{duration:.24,noise:.9,noiseDecay:25,tones:[[145,.28,14]],master:.70},
  impact_heavy:{duration:.55,noise:.82,noiseDecay:10,tones:[[72,.62,5.5],[126,.24,8.5]],master:.90},
  destroy:{duration:1.05,noise:.9,noiseDecay:6.5,tones:[[52,.85,3.1],[91,.44,4.8]],master:1.0}
});

export class CombatAudioSystem{
  constructor({maxVoices=28}={}){this.maxVoices=maxVoices;this.context=null;this.master=null;this.buffers=new Map();this.active=0;this.groupCounts=new Map();this.groupCaps={small_arms:7,heavy_mg:6,autocannon:5,cannon:5,artillery:4,weapons:6,impacts:7,destroy:4};}
  get unlocked(){return !!this.context;}
  async unlock(){
    if(typeof window==='undefined')return false;const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return false;
    if(!this.context){this.context=new Ctx({latencyHint:'interactive'});this.master=this.context.createGain();this.master.gain.value=.82;this.master.connect(this.context.destination);this._buildBuffers();}
    if(this.context.state==='suspended')await this.context.resume();return this.context.state==='running';
  }
  _buildBuffers(){for(const preset of SUPPORTED_AUDIO_PRESETS)this.buffers.set(preset,this._synthesize(preset));}
  _synthesize(preset){
    const spec=PRESET_SPEC[preset],sr=this.context.sampleRate||44100,n=Math.max(64,Math.floor(spec.duration*sr)),buffer=this.context.createBuffer(1,n,sr),out=buffer.getChannelData(0);let seed=(preset.length*2654435761)>>>0;
    for(let i=0;i<n;i++){
      const t=i/sr,progress=i/n;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=((seed>>>8)/0x00ffffff)*2-1;let v=noise*spec.noise*Math.exp(-t*spec.noiseDecay);
      for(const [hz,amp,decay] of spec.tones)v+=Math.sin(Math.PI*2*hz*t)*amp*Math.exp(-t*decay);
      const attack=Math.min(1,t/.004),tail=Math.min(1,(1-progress)/.035);out[i]=Math.tanh(v*1.55)*spec.master*attack*tail;
    }
    return buffer;
  }
  _listener(camera){return camera?.userData?.audioTarget||camera?.position||null;}
  _pan(position,camera){if(!position||!camera)return 0;const listener=this._listener(camera);if(!listener)return 0;const right={x:camera.matrixWorld.elements[0],z:camera.matrixWorld.elements[2]},dx=position.x-listener.x,dz=position.z-listener.z,d=Math.hypot(dx,dz)||1;return clamp((dx*right.x+dz*right.z)/d,-.85,.85);}
  play(preset,{position=null,camera=null,gain=1,maxDistance=380,serial=0,group='weapons'}={}){
    if(!this.context||this.context.state!=='running'||!this.buffers.has(preset)||this.active>=this.maxVoices)return false;
    const cap=this.groupCaps[group]??6,current=this.groupCounts.get(group)??0;if(current>=cap)return false;
    let attenuation=1;if(position&&camera){const listener=this._listener(camera);const d=listener?Math.hypot(position.x-listener.x,position.z-listener.z):0;if(d>=maxDistance)return false;const q=1-d/maxDistance;attenuation=.12+.88*q*q;}
    const source=this.context.createBufferSource(),voiceGain=this.context.createGain(),pan=this.context.createStereoPanner?this.context.createStereoPanner():null;source.buffer=this.buffers.get(preset);source.playbackRate.value=.965+hash01(serial,preset.length)*.07;voiceGain.gain.value=clamp(gain*attenuation,0,1.15);
    source.connect(voiceGain);if(pan){pan.pan.value=this._pan(position,camera);voiceGain.connect(pan);pan.connect(this.master);}else voiceGain.connect(this.master);
    this.active++;this.groupCounts.set(group,current+1);source.onended=()=>{this.active=Math.max(0,this.active-1);this.groupCounts.set(group,Math.max(0,(this.groupCounts.get(group)??1)-1));try{source.disconnect();voiceGain.disconnect();pan?.disconnect();}catch{}};source.start();return true;
  }
}
