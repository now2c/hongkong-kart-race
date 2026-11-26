
"use strict";
/* ============================================================
   香江卡丁車大賽 3D — third-person low-poly kart racer (three.js)
   Player vs 3 AI, 3 laps, Hong Kong items & scenery.
   ============================================================ */
var errBox = document.getElementById('err');
window.addEventListener('error', function(e){
  errBox.style.display='block';
  errBox.textContent = '出咗問題：' + (e.message || e.type) + '\n請重新整理頁面再試。';
});
var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- Audio (tiny synth, no assets) ---------------- */
var AC=null, muted=false;
function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC&&AC.state==='suspended')AC.resume(); return AC; }
function beep(f,d,type,g,slide){
  if(muted) return; var a=ac(); if(!a)return;
  var o=a.createOscillator(), gn=a.createGain();
  o.type=type||'square'; o.frequency.setValueAtTime(f,a.currentTime);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,slide),a.currentTime+d);
  gn.gain.setValueAtTime(g||0.06,a.currentTime);
  gn.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+d);
  o.connect(gn); gn.connect(a.destination); o.start(); o.stop(a.currentTime+d);
}
/* ---------------- SFX — named game sound effects (built on beep) ---------------- */
var sfx = {
  count:  function(){ beep(440, .12, 'square', .07); },
  go:     function(){ beep(880, .38, 'square', .09, 1318); },
  boost:  function(){ beep(280, .30, 'sawtooth', .05, 940); },
  pickup: function(){ beep(660, .16, 'square', .06, 990); },
  shield: function(){ beep(520, .20, 'triangle', .09, 790); },
  shoot:  function(){ beep(920, .18, 'square', .06, 210); },
  freeze: function(){ beep(1250, .32, 'sine', .08, 290); },
  hit:    function(){ beep(170, .26, 'sawtooth', .09, 55); },
  lap:    function(){ beep(659, .10, 'square', .07); setTimeout(function(){ beep(880, .16, 'square', .07); }, 95); },
  win:    function(){
    [523, 659, 784, 1046].forEach(function(f, i){
      setTimeout(function(){ beep(f, .22, 'square', .08); }, i * 120);
    });
  }
};
/* ---------------- BGM — two genuinely different original tracks ----------------
   Title/demo: 〈維港放克〉Harbour Funk — D-minor disco-funk, 120 BPM, SWUNG 16ths:
               wah-filter lead, syncopated slap-style bass, Rhodes chord stabs,
               disco kick/clap pattern. Laid-back groove, party feel.
   Race:       〈霓虹衝刺〉Neon Sprint — E-minor driving rock, 156 BPM, STRAIGHT 16ths:
               sawtooth riff lead, galloping bass, power-chord stabs, hard 4-floor
               kick + backbeat snare. Completely different key, feel & arrangement.
   Both run through a compressor + feedback-delay bus for depth. */
var bgmOn = true, bgmVol = 0.9, bgmTrack = 'menu';
var bgmTimer = null, bgmStep = 0, bgmNextTime = 0;
var bgmBus = null, bgmDelaySend = null, bgmDelayNode = null, bgmPadFilter = null, noiseBuf = null;
function midiHz(m){ return 440 * Math.pow(2, (m-69)/12); }
var TRACKS = {
  menu: {
    bpm: 120, swing: 0.32, delay: 0.375, name: '大廳音樂〈維港放克〉',
    chords: [[62,65,69,72],[55,59,65,71],[62,65,69,72],[57,61,65,69]],
    bassRoots: [38,43,38,45],
    // per-bar funk bass: -1 = rest, otherwise semitone offset from the bar root
    bassPat: [0,-1,-1,0,-1,-1,12,-1,0,-1,7,-1,10,-1,12,-1],
    lead: [74,0,0,77,0,0,74,0,81,0,0,79,0,0,77,0,
           76,0,0,74,0,0,71,0,74,0,0,79,0,0,76,0,
           81,0,0,84,0,0,81,0,79,0,0,77,0,0,74,0,
           81,0,0,85,0,0,81,0,77,0,0,76,0,0,74,0]
  },
  race: {
    bpm: 156, swing: 0, delay: 0.29, name: '比賽音樂〈霓虹衝刺〉',
    chords: [[64,67,71],[60,64,67],[59,62,67],[62,66,69]],
    bassRoots: [40,36,43,38],
    lead: [76,0,76,0,79,0,76,0,83,0,79,0,76,0,74,0,
           72,0,76,0,79,0,76,0,81,0,79,0,76,0,72,0,
           79,0,83,0,86,0,83,0,79,0,83,0,88,0,83,0,
           86,0,81,0,78,0,81,0,83,0,81,0,78,0,76,0]
  }
};
function bgmEnsureGraph(){
  var a = AC; if(!a || bgmBus) return;
  var comp = a.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
  comp.connect(a.destination);
  bgmBus = a.createGain(); bgmBus.gain.value = bgmVol; bgmBus.connect(comp);
  // feedback delay (echo) send
  var delay = a.createDelay(1); delay.delayTime.value = TRACKS[bgmTrack].delay; bgmDelayNode = delay;
  var fb = a.createGain(); fb.gain.value = 0.34;
  var fbFilter = a.createBiquadFilter(); fbFilter.type = 'lowpass'; fbFilter.frequency.value = 2400;
  var wet = a.createGain(); wet.gain.value = 0.16;
  bgmDelaySend = a.createGain(); bgmDelaySend.gain.value = 0.5;
  bgmDelaySend.connect(delay); delay.connect(fbFilter); fbFilter.connect(fb); fb.connect(delay);
  delay.connect(wet); wet.connect(comp);
  bgmPadFilter = a.createBiquadFilter(); bgmPadFilter.type = 'lowpass'; bgmPadFilter.frequency.value = 1500;
  bgmPadFilter.connect(bgmBus);
  noiseBuf = a.createBuffer(1, a.sampleRate * 0.3, a.sampleRate);
  var d = noiseBuf.getChannelData(0);
  for(var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function bgmTone(midi, t, dur, type, vol, atk, echo, detune){
  var a = AC; if(!a || !midi) return;
  var o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(midiHz(midi), t);
  if(detune) o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + (atk || 0.01));
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * 0.55), t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bgmBus);
  if(echo) g.connect(bgmDelaySend);
  o.start(t); o.stop(t + dur + 0.03);
}
// Funk wah lead: sawtooth through a bandpass whose cutoff sweeps up then down —
// the signature sound of the menu track; the race track never uses it.
function bgmWah(midi, t, dur, vol){
  var a = AC; if(!a || !midi) return;
  var o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(midiHz(midi), t);
  f.type = 'bandpass'; f.Q.value = 6;
  f.frequency.setValueAtTime(650, t);
  f.frequency.exponentialRampToValueAtTime(2700, t + dur * 0.35);
  f.frequency.exponentialRampToValueAtTime(800, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * 0.5), t + dur * 0.65);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(bgmBus); g.connect(bgmDelaySend);
  o.start(t); o.stop(t + dur + 0.03);
}
function bgmPad(notes, t, dur, vol, atk){
  var a = AC; if(!a) return;
  notes.forEach(function(m){
    var o = a.createOscillator(), g = a.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(midiHz(m), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.setValueAtTime(vol, t + dur - atk);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bgmPadFilter);
    o.start(t); o.stop(t + dur + 0.03);
  });
}
function bgmKick(t, vol){
  var a = AC; if(!a) return;
  var o = a.createOscillator(), g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(43, t + 0.11);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(g); g.connect(bgmBus); o.start(t); o.stop(t + 0.16);
}
function bgmNoise(t, dur, vol, freq, type){
  var a = AC; if(!a || !noiseBuf) return;
  var src = a.createBufferSource(); src.buffer = noiseBuf;
  var f = a.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = freq;
  var g = a.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(bgmBus);
  src.start(t); src.stop(t + dur + 0.02);
}
function bgmScheduleStep(tr, s, t){
  var stepDur = 60 / tr.bpm / 4;
  var bar = Math.floor(s / 16), st = s % 16;
  var chord = tr.chords[bar], root = tr.bassRoots[bar];
  // Swing: funk delays every off-16th; the race track is dead straight (swing 0).
  var tt = t + ((st % 2 === 1) ? stepDur * (tr.swing || 0) : 0);
  if(bgmTrack === 'menu'){
    // 〈維港放克〉— D-minor disco-funk: wah lead, slap bass, Rhodes stabs, disco drums.
    var ln = tr.lead[s];
    if(ln) bgmWah(ln, tt, stepDur * 1.6, 0.34);
    var bp = tr.bassPat[st];
    if(bp >= 0){
      // slap bass: bright square snap layered on a round sine body
      bgmTone(root + bp, tt, stepDur * 1.1, 'square', 0.10, 0.004, false);
      bgmTone(root + bp, tt, stepDur * 1.5, 'sine', 0.42, 0.004, false);
    }
    // Rhodes-style chord stabs on the swung offbeats — short, dry, percussive
    if(st === 2 || st === 7 || st === 10 || st === 15)
      chord.forEach(function(m){ bgmTone(m + 12, tt, stepDur * 0.9, 'triangle', 0.075, 0.004, false); });
    // disco drums: kick 1 & 3 plus a syncopated push, claps on 2 & 4, open hat offbeats
    if(st === 0 || st === 8 || st === 11) bgmKick(tt, 0.44);
    if(st === 4 || st === 12) { bgmNoise(tt, 0.11, 0.16, 1800, 'bandpass'); bgmTone(190, tt, 0.08, 'triangle', 0.08, 0.004, false); }
    if(st % 4 === 2) bgmNoise(tt, 0.16, 0.075, 6800);            // open hi-hat
    else if(st % 2 === 0) bgmNoise(tt, 0.03, 0.045, 8600);       // closed hat, beats only
    else bgmNoise(tt, 0.025, 0.02, 9000);                        // swung ghost hat
    if(s === 0) bgmNoise(tt, 0.3, 0.05, 5400);                   // soft shaker swell per loop
  } else {
    // 〈霓虹衝刺〉— E-minor driving rock: riff lead, gallop bass, power chords, hard drums.
    var rn = tr.lead[s];
    if(rn) { bgmTone(rn, tt, stepDur * 1.9, 'sawtooth', 0.15, 0.005, true); bgmTone(rn - 12, tt, stepDur * 1.9, 'square', 0.055, 0.005, false); }
    // galloping bass: a 16th-note pulse on every step, octave pops on the off-8ths
    var gOff = (st % 4 === 2) ? 12 : 0;
    if(bar === 3 && st >= 13) gOff = [7, 10, 12][st - 13];       // climb into the loop top
    bgmTone(root + gOff, tt, stepDur * 0.95, 'sawtooth', st % 2 === 0 ? 0.16 : 0.11, 0.003, false);
    bgmTone(root + gOff, tt, stepDur * 0.95, 'triangle', 0.20, 0.003, false);
    // power-chord stabs (root+fifth+octave, distorted saw stack) on 1 and the "and of 3"
    if(st === 0 || st === 8 || st === 14){
      [root + 24, root + 31, root + 36].forEach(function(m){ bgmTone(m, tt, stepDur * (st === 14 ? 1.6 : 2.6), 'sawtooth', 0.055, 0.004, false); });
    }
    // hard drums: 4-floor kick, backbeat snare, driving 8th hats, crash on the loop
    if(st % 4 === 0) bgmKick(tt, 0.52);
    if(st === 4 || st === 12) { bgmNoise(tt, 0.12, 0.22, 1900, 'bandpass'); bgmTone(196, tt, 0.09, 'triangle', 0.11, 0.004, false); }
    if(st % 2 === 0) bgmNoise(tt, 0.04, 0.07, 7600);
    if(st === 14) bgmNoise(tt, 0.15, 0.10, 7400);
    if(s === 0) bgmNoise(tt, 0.45, 0.12, 5000);                  // crash
  }
}
function bgmSchedule(){
  if(!bgmOn || !AC) return;
  var tr = TRACKS[bgmTrack];
  var stepDur = 60 / tr.bpm / 4;
  while(bgmNextTime < AC.currentTime + 0.15){
    bgmScheduleStep(tr, bgmStep % 64, bgmNextTime);
    bgmStep++; bgmNextTime += stepDur;
  }
}
function startBGM(){
  if(!bgmOn || muted) return;
  var a = ac(); if(!a) return;
  bgmEnsureGraph();
  if(bgmTimer) { updateBgmBtn(); return; }
  bgmStep = 0; bgmNextTime = a.currentTime + 0.06;
  bgmTimer = setInterval(bgmSchedule, 25); bgmSchedule();
  updateBgmBtn();
}
function stopBGM(){ if(bgmTimer){ clearInterval(bgmTimer); bgmTimer = null; } updateBgmBtn(); }
function setBgmTrack(name){
  if(bgmTrack === name && bgmTimer) { updateNowTrack(); return; }
  bgmTrack = name; bgmStep = 0;
  if(AC) bgmNextTime = AC.currentTime + 0.05;
  if(bgmDelayNode && AC) bgmDelayNode.delayTime.setTargetAtTime(TRACKS[name].delay, AC.currentTime, 0.05);
  updateNowTrack();
  if(bgmOn && !muted && AC && !bgmTimer) startBGM();
}
function setBgmVolume(v){
  bgmVol = Math.max(0, Math.min(1, v));
  if(bgmBus && AC) bgmBus.gain.setTargetAtTime(bgmVol, AC.currentTime, 0.05);
}
function updateNowTrack(){
  var el = document.getElementById('nowTrack');
  if(el) el.textContent = '🎵 而家播放：' + TRACKS[bgmTrack].name + '（另一首會喺' + (bgmTrack === 'menu' ? '比賽開始' : '返大廳') + '時自動切換）';
}
function updateBgmBtn(){
  var playing = bgmOn && !muted;
  ['btnBGM', 'btnBGMOpt'].forEach(function(id){
    var b = document.getElementById(id); if(!b) return;
    b.textContent = playing ? '♪ BGM ON' : '♪ BGM OFF';
    b.classList.toggle('on', playing);
  });
}
function toggleBGM(){ bgmOn = !bgmOn; if(bgmOn && !muted) startBGM(); else stopBGM(); updateBgmBtn(); }
/* ---------------- Data: items & characters ---------------- */
var ITEMS = {
  waffle:  {name:'雞蛋仔',   col:'#f4a259', hex:0xf4a259, desc:'加速衝刺 2 秒，尾氣噴金光。', w:22},
  fishball:{name:'魚蛋串',   col:'#ffd166', hex:0xffd166, desc:'向前發射魚蛋串，追蹤命中對手即刻打轉停低。', w:22},
  bun:     {name:'菠蘿包',   col:'#e9c46a', hex:0xe9c46a, desc:'開防護罩，擋走一次攻擊或陷阱。', w:17},
  cheungfun:{name:'腸粉',    col:'#f1fa8c', hex:0xf1fa8c, desc:'喺車尾放低滑腸粉，邊個踩中邊個打滑。', w:16},
  redbean: {name:'紅豆冰',   col:'#ef476f', hex:0xef476f, desc:'凍結附近對手 3 秒，全部慢晒。', w:12},
  milktea: {name:'絲襪奶茶', col:'#c68b4e', hex:0xc68b4e, desc:'無敵衝刺：加速兼唔怕攻擊同陷阱。', w:11}
};
var ITEM_KEYS = Object.keys(ITEMS);
function rollItem(forRacer){
  var bonus = (forRacer && (forRacer.def.tank || forRacer.def.counter)) ? {bun:14, milktea:9, redbean:6} : {};
  var tot=0, ws={}, k, r;
  for(k of ITEM_KEYS){ ws[k]=ITEMS[k].w+(bonus[k]||0); tot+=ws[k]; }
  r=Math.random()*tot;
  for(k of ITEM_KEYS){ r-=ws[k]; if(r<=0) return k; }
  return 'waffle';
}
function itemArt(key){
  var S={
  waffle:'<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="30" fill="#f4a259" stroke="#8a4b12" stroke-width="3"/><g fill="#ffd166" stroke="#b96a1b" stroke-width="2"><circle cx="28" cy="28" r="8"/><circle cx="42" cy="24" r="8"/><circle cx="54" cy="32" r="8"/><circle cx="26" cy="44" r="8"/><circle cx="40" cy="40" r="9"/><circle cx="54" cy="50" r="8"/><circle cx="34" cy="56" r="8"/><circle cx="48" cy="62" r="7"/></g></svg>',
  fishball:'<svg viewBox="0 0 80 80" aria-hidden="true"><line x1="10" y1="66" x2="68" y2="16" stroke="#d9c9a8" stroke-width="5" stroke-linecap="round"/><circle cx="28" cy="52" r="13" fill="#e8a34c" stroke="#8a4b12" stroke-width="3"/><circle cx="44" cy="38" r="13" fill="#f2b25c" stroke="#8a4b12" stroke-width="3"/><circle cx="60" cy="24" r="13" fill="#e8a34c" stroke="#8a4b12" stroke-width="3"/><circle cx="24" cy="48" r="3" fill="#fff3"/><circle cx="40" cy="34" r="3" fill="#fff3"/><circle cx="56" cy="20" r="3" fill="#fff3"/></svg>',
  bun:'<svg viewBox="0 0 80 80" aria-hidden="true"><ellipse cx="40" cy="56" rx="30" ry="12" fill="#c98a3a"/><path d="M10 54 Q12 22 40 20 Q68 22 70 54 Z" fill="#e9c46a" stroke="#8a6410" stroke-width="3"/><path d="M22 34 L34 42 L28 50 M40 28 L42 40 L52 34 M30 44 L44 50" stroke="#b97e00" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  cheungfun:'<svg viewBox="0 0 80 80" aria-hidden="true"><ellipse cx="40" cy="56" rx="32" ry="13" fill="#dfe8f5" stroke="#8fa3cc" stroke-width="3"/><g fill="#fff7ea" stroke="#d8b48f" stroke-width="2.5"><rect x="14" y="36" width="24" height="13" rx="6"/><rect x="34" y="30" width="26" height="13" rx="6"/><rect x="24" y="44" width="28" height="13" rx="6"/></g><path d="M16 50 Q40 60 64 48" stroke="#6b3410" stroke-width="4" fill="none" stroke-linecap="round" opacity=".65"/></svg>',
  redbean:'<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M24 22 L56 22 L52 68 Q51 72 46 72 L34 72 Q29 72 28 68 Z" fill="#fff" opacity=".92" stroke="#cbd7ff" stroke-width="3"/><path d="M25 36 L55 36 L53 58 L27 58 Z" fill="#7a1f2b"/><g fill="#ef476f"><circle cx="32" cy="46" r="4"/><circle cx="42" cy="50" r="4"/><circle cx="48" cy="44" r="4"/><circle cx="37" cy="54" r="4"/></g><ellipse cx="40" cy="24" rx="18" ry="7" fill="#ffb3c6" stroke="#ef476f" stroke-width="3"/><line x1="48" y1="8" x2="42" y2="24" stroke="#ef476f" stroke-width="5" stroke-linecap="round"/></svg>',
  milktea:'<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M25 20 L55 20 L51 68 Q50 72 45 72 L35 72 Q30 72 29 68 Z" fill="#d9a05f" stroke="#8a4b12" stroke-width="3"/><path d="M26 34 L54 34 L52 56 L28 56 Z" fill="#c68b4e"/><g fill="#2b1608"><circle cx="33" cy="64" r="3.5"/><circle cx="42" cy="66" r="3.5"/><circle cx="48" cy="63" r="3.5"/></g><ellipse cx="40" cy="20" rx="17" ry="6" fill="#f2d5a0" stroke="#8a4b12" stroke-width="3"/><line x1="52" y1="4" x2="44" y2="20" stroke="#e63946" stroke-width="6" stroke-linecap="round"/></svg>'
  };
  return S[key]||'';
}
(function(){
  var g=document.getElementById('itemGuide');
  var eff={waffle:'⚡ 加速',fishball:'🎯 追蹤攻擊',bun:'🛡 防守',cheungfun:'🌀 陷阱',redbean:'❄ 範圍凍結',milktea:'⭐ 無敵加速'};
  for(var k of ITEM_KEYS){
    var it=ITEMS[k];
    var d=document.createElement('div'); d.className='itemRow';
    d.innerHTML='<div class="itemThumb">'+itemArt(k)+'</div><div class="body"><b>'+it.name+'</b><span class="typeTag">'+eff[k]+'</span><p>'+it.desc+'</p></div>';
    g.appendChild(d);
  }
})();

var CHARS = [
  {id:'chen', name:'陳記', title:'冰室阿叔', shape:'bun', img:CHAR_PORTRAITS.chen,
   col:'#e9c46a', hex:0xe9c46a, dark:0x9c7414, skill:.955, aggro:.45, accel:1.10, turn:1.0,
   stats:{spd:3, acc:4, hnd:3, def:2},
   stat:'⚡ 起步快 — 加速稍勝一籌，彈射起步最快',
   desc:'冰室老闆，架車髹到成個菠蘿包咁，鬆脆香甜，出閘快到飛起。'},
  {id:'turkey', name:'Turkey姐', title:'牛丸小販', shape:'beefball', img:CHAR_PORTRAITS.turkey,
   col:'#e4572e', hex:0xe4572e, dark:0x8f2d12, skill:.965, aggro:.6, accel:1.0, turn:1.0, tank:true,
   stats:{spd:4, acc:3, hnd:3, def:5},
   stat:'🛡 防守勁 — 中招打轉時間減半，護罩道具更常出現',
   desc:'喺街邊賣牛丸嘅小販姐姐，架車成個牛丸檔咁：大鑊彈牙牛丸、串串牛丸同紅橙小販車身，硬淨又惹味，撞極都唔易瞇埋眼。'},
  {id:'hai', name:'阿海', title:'豆花檔主', shape:'tofu', img:CHAR_PORTRAITS.hai,
   col:'#f7ead1', hex:0xf7ead1, dark:0x8a5a2b, skill:.95, aggro:.35, accel:1.0, turn:1.22,
   stats:{spd:3, acc:3, hnd:5, def:3},
   stat:'🛤 轉彎穩 — 過彎軚感大增，貼彎唔甩尾',
   desc:'喺街市賣豆腐花嘅檔主，架車成個木桶豆腐花咁，滑溜順手，過彎穩如泰山。'},
  {id:'wong', name:'黃老闆', title:'腦場機神', shape:'pc', img:CHAR_PORTRAITS.wong,
   col:'#f5c542', hex:0xf5c542, dark:0x8a6410, skill:.995, aggro:.9, accel:1.08, turn:1.06, counter:true,
   stats:{spd:5, acc:4, hnd:4, def:4},
   stat:'💻 專剋道具 — 中招有機會即刻反制，防反道具更常出現（隱藏高手）',
   desc:'電腦商場嘅電腦高手，架車用舊主機板、風扇同線材左拼右砌，金光閃閃，深不可測。'}
];
var selectedChar = 0;
function barRow(label, val, cls){
  return '<div class="statRow"><span>'+label+'</span><div class="bar"><i class="'+cls+'" style="width:'+(val*20)+'%"></i></div><span>'+val+' / 5</span></div>';
}
function renderShowcase(){
  var c = CHARS[selectedChar];
  var el = document.getElementById('showcase');
  if(!el) return;
  el.innerHTML =
    '<div class="paneHead"><div><div class="en">NOW SELECTED</div><h2>車手檔案</h2></div><span class="p1Badge">READY</span></div>'+
    '<div class="showcaseImgWrap"><img src="'+c.img+'" alt="'+c.name+' — '+c.title+' 大頭像"><span class="vs">VS AI x3</span></div>'+
    '<h3><small>'+c.title+'</small>'+c.name+'</h3>'+
    '<p>'+c.desc+'</p><p class="stat" style="color:#ffd166;font-weight:800;">'+c.stat+'</p>'+
    '<div class="statBars">'+
      barRow('速度', c.stats.spd, '')+
      barRow('加速', c.stats.acc, 'pink')+
      barRow('操控', c.stats.hnd, 'blue')+
      barRow('防守', c.stats.def, 'green')+
    '</div>'+
    '<p style="text-align:center;margin-top:12px;color:#8fd0ff;font-weight:800;font-size:12px;letter-spacing:.08em;">座駕主色 <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:'+c.col+';vertical-align:-1px;border:1px solid #fff3"></span> '+c.col+'</p>';
}
(function buildCharCards(){
  var g=document.getElementById('charGrid');
  CHARS.forEach(function(c,i){
    var b=document.createElement('button');
    b.className='charCard'+(i===selectedChar?' sel':'');
    b.setAttribute('aria-label','選擇 '+c.name+' '+c.title);
    b.innerHTML='<span class="cursor">1P ▼</span><img src="'+c.img+'" alt="'+c.name+' 大頭像" loading="eager">'+
      '<div class="meta"><span class="ttl">'+c.title+'</span><b>'+c.name+'</b></div>';
    b.addEventListener('click',function(){
      selectedChar=i;
      g.querySelectorAll('.charCard').forEach(function(el,j){el.classList.toggle('sel', j===i);});
      renderShowcase();
      ac(); startBGM(); beep(700,.07,'square',.05);
    });
    g.appendChild(b);
  });
  renderShowcase();
})();
var TOTAL_LAPS = 3;
