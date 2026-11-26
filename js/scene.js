
/* ============================================================
   THREE setup
   ============================================================ */
var gameBox = document.getElementById('gameBox');
var renderer;
try{
  renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
}catch(e){
  errBox.style.display='block'; errBox.textContent='呢部裝置開唔到 WebGL，未能載入 3D 畫面。';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.domElement.className = 'webgl';
gameBox.insertBefore(renderer.domElement, gameBox.firstChild);

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x2e4470);           // dusk harbour sky
scene.fog = new THREE.Fog(0x2e4470, 190, 520);

var camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
camera.position.set(0, 30, 60);

var hemi = new THREE.HemisphereLight(0xbdd5ff, 0x2c3444, 0.95);
scene.add(hemi);
var sun = new THREE.DirectionalLight(0xffd9a8, 2.0);
sun.position.set(150, 190, 90);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
sun.shadow.camera.left=-300; sun.shadow.camera.right=300;
sun.shadow.camera.top=300; sun.shadow.camera.bottom=-300;
sun.shadow.camera.near=10; sun.shadow.camera.far=600;
sun.shadow.bias = -0.0004;
scene.add(sun);
var fill = new THREE.DirectionalLight(0x88aaff, 0.5);
fill.position.set(-120, 80, -140);
scene.add(fill);

function resizeGL(){
  var w = gameBox.clientWidth, h = gameBox.clientHeight;
  if(!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w/h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resizeGL);

/* ---------------- Canvas texture helpers ---------------- */
function canvasTex(w, h, draw, srgb){
  var c = document.createElement('canvas'); c.width=w; c.height=h;
  draw(c.getContext('2d'), w, h);
  var t = new THREE.CanvasTexture(c);
  if(srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
var roadTex = canvasTex(256, 256, function(g){
  g.fillStyle='#34383f'; g.fillRect(0,0,256,256);
  for(var i=0;i<900;i++){ g.fillStyle = Math.random()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.14)';
    g.fillRect(Math.random()*256, Math.random()*256, 2, 2); }
  g.fillStyle='#e8e8e8'; g.fillRect(6,0,7,256); g.fillRect(243,0,7,256);       // edge lines
  g.fillStyle='#ffb703'; g.fillRect(124,0,8,120);                              // centre dash
});
roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
var winTex = canvasTex(128, 256, function(g){
  g.fillStyle='#cfd4dc'; g.fillRect(0,0,128,256);
  for(var y=0;y<8;y++) for(var x=0;x<4;x++){
    var lit = ((x*7+y*13)%5===0);
    g.fillStyle = lit ? '#ffd873' : '#232c3d';
    g.fillRect(10+x*29, 12+y*30, 19, 20);
  }
});
winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
var checkerTex = canvasTex(128, 32, function(g){
  for(var y=0;y<4;y++) for(var x=0;x<16;x++){ g.fillStyle=(x+y)%2? '#111':'#f5f5f5'; g.fillRect(x*8,y*8,8,8); }
});
var chevronTex = canvasTex(128, 128, function(g){
  g.clearRect(0,0,128,128);
  g.strokeStyle='#fff3c4'; g.lineWidth=15; g.lineCap='round';
  g.beginPath(); g.moveTo(24,96); g.lineTo(64,40); g.lineTo(104,96); g.stroke();
  g.beginPath(); g.moveTo(24,122); g.lineTo(64,66); g.lineTo(104,122); g.stroke();
});
var softDot = canvasTex(64, 64, function(g){
  var gr = g.createRadialGradient(32,32,2,32,32,30);
  gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr; g.fillRect(0,0,64,64);
}, false);
function textPlate(text, opts){
  opts = opts || {};
  var fs = opts.fs || 54, col = opts.col || '#ffffff', bg = opts.bg || 'rgba(8,10,20,.72)';
  var c = document.createElement('canvas');
  var g0 = c.getContext('2d');
  g0.font = '900 ' + fs + 'px "PingFang TC","Microsoft JhengHei",sans-serif';
  var tw = Math.ceil(g0.measureText(text).width);
  c.width = tw + 44; c.height = fs + 40;
  var g = c.getContext('2d');
  if(bg){ g.fillStyle=bg; g.beginPath(); g.roundRect(2,2,c.width-4,c.height-4,18); g.fill(); }
  if(opts.glow){ g.shadowColor = col; g.shadowBlur = 22; }
  g.font = '900 ' + fs + 'px "PingFang TC","Microsoft JhengHei",sans-serif';
  g.textAlign='center'; g.textBaseline='middle'; g.fillStyle=col;
  g.fillText(text, c.width/2, c.height/2 + 2);
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  var m = new THREE.Mesh(new THREE.PlaneGeometry(c.width/28, c.height/28),
    new THREE.MeshBasicMaterial({map:t, transparent:true, side:THREE.DoubleSide}));
  return m;
}
function nameSprite(text, colCss){
  var plate = textPlate(text, {fs:46, col:colCss||'#ffffff', bg:'rgba(8,10,20,.55)'});
  var sp = new THREE.Sprite(new THREE.SpriteMaterial({map:plate.material.map, transparent:true, depthWrite:false}));
  var w = plate.geometry.parameters.width, h = plate.geometry.parameters.height;
  sp.scale.set(w, h, 1);
  return sp;
}

/* ============================================================
   Track path (closed loop, XZ plane)
   Segments: 0.00 中環海濱直路 → 0.25 尖沙咀海旁彎 →
             0.50 銅鑼灣鬧市段 → 0.80 紅磡短隧道 → 碼頭彎返起點
   ============================================================ */
var CTRL = [
  [-140,-105],[-158,0],[-135,93],[-72,147],[27,162],[117,138],
  [168,72],[177,-18],[138,-102],[60,-138],[-42,-144],[-108,-132]
];
var curve = new THREE.CatmullRomCurve3(
  CTRL.map(function(p){ return new THREE.Vector3(p[0], 0, p[1]); }), true, 'catmullrom', 0.6);
var PN = 600;
var PATH = curve.getSpacedPoints(PN); PATH.pop();
var CUM = [0], PATH_LEN = 0;
for(var ci=1; ci<=PN; ci++){
  var ca = PATH[ci-1], cb = PATH[ci%PN];
  PATH_LEN += Math.hypot(cb.x-ca.x, cb.z-ca.z); CUM.push(PATH_LEN);
}
var HALF = 8;                       // road half width
function pathPoint(i){ return PATH[((i%PN)+PN)%PN]; }
function pathDir(i){
  var a=pathPoint(i), b=pathPoint(i+2);
  var dx=b.x-a.x, dz=b.z-a.z, d=Math.hypot(dx,dz)||1;
  return {x:dx/d, z:dz/d};
}
function nearestIdx(x, z, guess, win){
  var best=guess, bd=1e18; win = win||46;
  for(var k=-win;k<=win;k++){
    var i=((guess+k)%PN+PN)%PN, p=PATH[i];
    var d=(p.x-x)*(p.x-x)+(p.z-z)*(p.z-z);
    if(d<bd){bd=d;best=i;}
  }
  return best;
}
function lateralOffset(x, z, idx){
  var p=PATH[idx], d=pathDir(idx);
  return (x-p.x)*(-d.z) + (z-p.z)*(d.x);
}
function fracIdx(f){ return Math.floor(f*PN)%PN; }

/* ============================================================
   World: water, land, road, barriers, start line
   ============================================================ */
var worldGroup = new THREE.Group(); scene.add(worldGroup);
(function buildGround(){
  var water = new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),
    new THREE.MeshStandardMaterial({color:0x155e7a, roughness:.35, metalness:.55}));
  water.rotation.x = -Math.PI/2; water.position.y = -1.4;
  worldGroup.add(water);
  var land = new THREE.Mesh(new THREE.PlaneGeometry(470,430),
    new THREE.MeshStandardMaterial({color:0x49523f, roughness:.95}));
  land.rotation.x = -Math.PI/2; land.position.y = -0.06;
  land.receiveShadow = true;
  worldGroup.add(land);
  // harbour promenade slab under the sea-side stretch
  var prom = new THREE.Mesh(new THREE.PlaneGeometry(470,26),
    new THREE.MeshStandardMaterial({color:0x8b8f96, roughness:.9}));
  prom.rotation.x = -Math.PI/2; prom.position.set(0,-0.03, 196);
  worldGroup.add(prom);
})();
(function buildRoad(){
  var pos=[], uv=[], idx=[];
  for(var i=0;i<=PN;i++){
    var p=pathPoint(i), d=pathDir(i);
    var lx=p.x + (-d.z)*HALF, lz=p.z + d.x*HALF;
    var rx=p.x - (-d.z)*HALF, rz=p.z - d.x*HALF;
    pos.push(lx,0.05,lz, rx,0.05,rz);
    uv.push(0, CUM[i]/13, 1, CUM[i]/13);
    if(i<PN){ var a=i*2; idx.push(a,a+1,a+2, a+1,a+3,a+2); }
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(idx); geo.computeVertexNormals();
  var road = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({map:roadTex, roughness:.94}));
  road.receiveShadow = true;
  worldGroup.add(road);
  // start / finish checker line
  var sp = pathPoint(0), sd = pathDir(0);
  var line = new THREE.Mesh(new THREE.PlaneGeometry(HALF*2, 3.4),
    new THREE.MeshBasicMaterial({map:checkerTex}));
  line.rotation.x = -Math.PI/2; line.rotation.z = -Math.atan2(sd.z, sd.x) + Math.PI/2;
  line.position.set(sp.x, 0.09, sp.z);
  worldGroup.add(line);
})();
(function buildBarriers(){
  var geoB = new THREE.BoxGeometry(1, 0.55, 0.5);
  var matB = new THREE.MeshStandardMaterial({roughness:.6});
  var step = 3, count = Math.floor(PN/step)*2;
  var inst = new THREE.InstancedMesh(geoB, matB, count);
  var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0,1,0);
  var sc = new THREE.Vector3(1,1,1), pv = new THREE.Vector3();
  var colA = new THREE.Color(0xd8404f), colB = new THREE.Color(0xf2f2f2);
  var n=0;
  for(var i=0;i<PN;i+=step){
    var p=pathPoint(i), d=pathDir(i);
    var segLen = PATH_LEN/PN*step*1.04;
    var ang = Math.atan2(d.z, d.x);
    q.setFromAxisAngle(up, -ang);
    for(var s=-1;s<=1;s+=2){
      pv.set(p.x + (-d.z)*s*(HALF+0.7), 0.42, p.z + d.x*s*(HALF+0.7));
      sc.set(segLen,1,1);
      m4.compose(pv, q, sc);
      inst.setMatrixAt(n, m4);
      inst.setColorAt(n, ((i/step)%2===0) ? colA : colB);
      n++;
    }
  }
  inst.count = n; inst.castShadow = false; inst.receiveShadow = true;
  worldGroup.add(inst);
})();
/* ============================================================
   Scenery — Hong Kong harbour, skyline, signs, stalls, tram…
   ============================================================ */
var MAT = {
  concrete: new THREE.MeshStandardMaterial({color:0x767c85, roughness:.9}),
  darkMetal: new THREE.MeshStandardMaterial({color:0x2b2f36, roughness:.5, metalness:.6}),
  trunk: new THREE.MeshStandardMaterial({color:0x5b4326, roughness:.95}),
  leaf: new THREE.MeshStandardMaterial({color:0x2e7d46, roughness:.9}),
  white: new THREE.MeshStandardMaterial({color:0xf2f0e6, roughness:.55})
};
function box(w,h,d,mat,x,y,z,ry){
  var m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  m.position.set(x||0,y||0,z||0); if(ry) m.rotation.y = ry;
  return m;
}
function placeAt(f, side, off){
  var i = fracIdx(f), p = pathPoint(i), d = pathDir(i);
  return { x: p.x + (-d.z)*side*off, z: p.z + d.x*side*off,
           nx: -d.z, nz: d.x, dx: d.x, dz: d.z, ang: Math.atan2(d.z, d.x) };
}
function faceRoad(plate, pl, side){
  var fx = -pl.nx*side, fz = -pl.nz*side;
  plate.rotation.y = Math.atan2(fx, fz);
}
var dynFerry, dynJunk, tramGroup, tramIdx, tramHitCool = {};
(function buildScenery(){
  var S = worldGroup;
  /* --- generic city blocks / estates on the land --- */
  var palette = [0x5b6b8c,0x6d7f9e,0x7d7468,0x8c6d5b,0x546e7a,0x77685a];
  var placed = 0, tries = 0;
  while(placed < 115 && tries < 3000){
    tries++;
    var x = -222 + Math.random()*444, z = -200 + Math.random()*392;
    var gi = nearestIdx(x, z, Math.floor(Math.random()*PN), PN/2);
    var pp = pathPoint(gi);
    if(Math.hypot(pp.x-x, pp.z-z) < HALF + 13) continue;
    var tall = (z < -60 && x > -80 && x < 120);            // Central-ish cluster
    var h = tall ? 26 + Math.random()*30 : 8 + Math.random()*20;
    var w = 10 + Math.random()*12, dep = 10 + Math.random()*12;
    var mat = new THREE.MeshStandardMaterial({color:palette[placed%palette.length], map:winTex, roughness:.88});
    var b = box(w, h, dep, mat, x, h/2, z, Math.random()*Math.PI);
    S.add(b); placed++;
  }
  /* --- far shore skyline across the harbour (+z) --- */
  var shore = box(560, 2, 60, new THREE.MeshStandardMaterial({color:0x3c4652, roughness:1}), 0, -0.6, 300);
  S.add(shore);
  for(var si=0; si<16; si++){
    var sx = -260 + si*34 + Math.random()*10, sh = 22 + Math.random()*38;
    var sm = new THREE.MeshStandardMaterial({color: si%3? 0x46586e : 0x5a6c84, map:winTex, roughness:.9});
    S.add(box(20+Math.random()*10, sh, 16, sm, sx, sh/2, 292 + Math.random()*22));
  }
  // IFC-like tower: tall, slightly tapered stack
  var ifc = new THREE.Group();
  var ifcMat = new THREE.MeshStandardMaterial({color:0x7f97b5, map:winTex, roughness:.5, metalness:.35});
  ifc.add(box(20, 62, 18, ifcMat, 0, 31, 0));
  ifc.add(box(15, 22, 13, ifcMat, 0, 73, 0));
  ifc.add(box(2.5, 12, 2.5, MAT.darkMetal, 0, 90, 0));
  ifc.position.set(88, 0, 296); S.add(ifc);
  var ifcSign = textPlate('IFC · 中環', {col:'#bfe0ff', fs:44});
  ifcSign.position.set(88, 52, 282); ifcSign.rotation.y = Math.PI; S.add(ifcSign);
  // Convention centre: wide block with curved roof
  var cc = new THREE.Group();
  cc.add(box(56, 10, 24, new THREE.MeshStandardMaterial({color:0x9aa7b4, roughness:.6, metalness:.2}), 0, 5, 0));
  var roof = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 56, 20, 1, false, 0, Math.PI),
    new THREE.MeshStandardMaterial({color:0xc7d2dc, roughness:.45, metalness:.3, side:THREE.DoubleSide}));
  roof.rotation.z = Math.PI/2; roof.rotation.y = Math.PI/2; roof.position.y = 10;
  cc.add(roof); cc.position.set(-52, 0, 294); S.add(cc);
  var ccSign = textPlate('會展', {col:'#ffe9a8', fs:44});
  ccSign.position.set(-52, 18, 280); ccSign.rotation.y = Math.PI; S.add(ccSign);
  // Cultural centre wedge + clock tower silhouette
  S.add(box(30, 9, 18, new THREE.MeshStandardMaterial({color:0xb08d6a, roughness:.8}), -150, 4.5, 292));
  S.add(box(7, 26, 7, new THREE.MeshStandardMaterial({color:0xa89880, roughness:.85}), -186, 13, 294));
  var ctSign = textPlate('文化中心 · 鐘樓', {col:'#ffd9a0', fs:40});
  ctSign.position.set(-168, 30, 282); ctSign.rotation.y = Math.PI; S.add(ctSign);

  /* --- roadside neon signs & shop signs --- */
  var signs = [
    {f:.045, s: 1, t:'冰室 · 茶餐廳', c:'#ffb703'},
    {f:.13,  s:-1, t:'大押', c:'#ff5964'},
    {f:.24,  s: 1, t:'金碧酒家', c:'#ff5d8f'},
    {f:.36,  s:-1, t:'涼茶舖', c:'#7bf1a8'},
    {f:.55,  s: 1, t:'糖水舖', c:'#ffd166'},
    {f:.68,  s:-1, t:'士多', c:'#8fd0ff'},
    {f:.93,  s: 1, t:'茶餐廳', c:'#ffb703'}
  ];
  signs.forEach(function(sg){
    var pl = placeAt(sg.f, sg.s, HALF + 5.5);
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,6.4,8), MAT.darkMetal);
    pole.position.set(pl.x, 3.2, pl.z); S.add(pole);
    var plate = textPlate(sg.t, {col:sg.c, glow:true, fs:50});
    plate.position.set(pl.x, 5.6, pl.z); faceRoad(plate, pl, sg.s); S.add(plate);
  });

  /* --- street stalls: dai pai dong / food stalls --- */
  function stall(f, side, label, awnCol){
    var pl = placeAt(f, side, HALF + 7);
    var g = new THREE.Group();
    g.add(box(6.4, 1.6, 3, new THREE.MeshStandardMaterial({color:0xa33b2e, roughness:.8}), 0, .8, 0));
    var awn = box(7.4, .18, 4.4, new THREE.MeshStandardMaterial({color:awnCol, roughness:.85}), 0, 2.9, 0);
    awn.rotation.x = .18; g.add(awn);
    [[-3,-1.6],[3,-1.6],[-3,1.6],[3,1.6]].forEach(function(c){
      var p = new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,2.9,6), MAT.darkMetal);
      p.position.set(c[0],1.45,c[1]); g.add(p);
    });
    var plate = textPlate(label, {col:'#ffe9a8', fs:46});
    plate.position.y = 2.1; g.add(plate);
    g.position.set(pl.x, 0, pl.z);
    g.rotation.y = Math.atan2(-pl.nx*side, -pl.nz*side);
    plate.rotation.y = 0; // plate is child; group faces road, plate local +z faces road
    S.add(g);
  }
  stall(.30,  1, '大排檔', 0xf2e3c6);
  stall(.585, 1, '雞蛋仔檔', 0xf4a259);
  stall(.66, -1, '魚蛋檔', 0xffd166);
  stall(.86, -1, '涼茶舖', 0x7bf1a8);

  /* --- public estate slab with label --- */
  var epl = placeAt(.40, -1, HALF + 26);
  var est = box(34, 22, 12, new THREE.MeshStandardMaterial({color:0x8a7f6d, map:winTex, roughness:.9}), epl.x, 11, epl.z, epl.ang);
  S.add(est);
  var eSign = textPlate('公共屋邨', {col:'#ffffff', fs:44});
  eSign.position.set(epl.x, 24.5, epl.z); faceRoad(eSign, epl, -1); S.add(eSign);
  /* --- market --- */
  var mpl = placeAt(.575, -1, HALF + 12);
  var mkt = box(16, 6, 10, new THREE.MeshStandardMaterial({color:0x9c5b4a, roughness:.9}), mpl.x, 3, mpl.z, mpl.ang);
  S.add(mkt);
  var mSign = textPlate('街市', {col:'#ffb3c6', fs:48, glow:true});
  mSign.position.set(mpl.x, 8.4, mpl.z); faceRoad(mSign, mpl, -1); S.add(mSign);

  /* --- red minibus + green minibus parked roadside --- */
  function minibus(f, side, colr){
    var pl = placeAt(f, side, HALF + 4.6);
    var g = new THREE.Group();
    g.add(box(5.6, 2.2, 2.3, new THREE.MeshStandardMaterial({color:0xf2f0e6, roughness:.5}), 0, 1.45, 0));
    g.add(box(5.6, .8, 2.34, new THREE.MeshStandardMaterial({color:colr, roughness:.5}), 0, 2.2, 0));
    g.add(box(4.6, .8, 2.36, new THREE.MeshStandardMaterial({color:0x22303e, roughness:.2, metalness:.4}), 0, 1.7, 0));
    [[-1.9,-1.1],[1.9,-1.1],[-1.9,1.1],[1.9,1.1]].forEach(function(w){
      var wh = new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.3,12), MAT.darkMetal);
      wh.rotation.x = Math.PI/2; wh.position.set(w[0], .5, w[1]); g.add(wh);
    });
    g.position.set(pl.x, 0, pl.z); g.rotation.y = -pl.ang;
    S.add(g);
  }
  minibus(.72, 1, 0xd8404f);
  minibus(.185, 1, 0x1f9d63);

  /* --- Peak: hill + peak tram (NW corner) --- */
  var hill = new THREE.Mesh(new THREE.ConeGeometry(58, 42, 24),
    new THREE.MeshStandardMaterial({color:0x39543a, roughness:1}));
  hill.position.set(-232, 20, -196); S.add(hill);
  var ptrack = box(1.6, .4, 34, MAT.darkMetal, -198, 15.5, -168);
  ptrack.rotation.x = -.72; S.add(ptrack);
  var ptram = box(3, 3.4, 5, new THREE.MeshStandardMaterial({color:0xb03a2e, roughness:.6}), -198, 17.6, -168);
  ptram.rotation.x = -.72; S.add(ptram);
  var pSign = textPlate('山頂纜車', {col:'#ffd9a0', fs:40});
  pSign.position.set(-196, 26, -160); pSign.rotation.y = Math.PI/4; S.add(pSign);

  /* --- Star Ferry pier + moving ferry + junk boat --- */
  var ppl = placeAt(.47, 1, HALF + 16);
  var pier = box(10, 1, 26, MAT.concrete, ppl.x, .2, ppl.z, ppl.ang);
  S.add(pier);
  var pierSign = textPlate('天星碼頭', {col:'#bfe0ff', fs:44});
  pierSign.position.set(ppl.x, 5.4, ppl.z); faceRoad(pierSign, ppl, 1); S.add(pierSign);
  dynFerry = new THREE.Group();
  dynFerry.add(box(13, 2.2, 4.6, MAT.white, 0, 1.1, 0));
  dynFerry.add(box(13, .7, 4.7, new THREE.MeshStandardMaterial({color:0x1f9d63, roughness:.6}), 0, 2.4, 0));
  dynFerry.add(box(8.6, 2.4, 3.6, MAT.white, -.4, 3.9, 0));
  dynFerry.add(box(8.6, 1, 3.7, new THREE.MeshStandardMaterial({color:0x8fd0ff, roughness:.2, metalness:.3}), -.4, 4.1, 0));
  var funnel = new THREE.Mesh(new THREE.CylinderGeometry(.7,.8,2.6,10), MAT.darkMetal);
  funnel.position.set(-4.6, 5.4, 0); dynFerry.add(funnel);
  dynFerry.position.set(0, -.4, 248); S.add(dynFerry);
  dynJunk = new THREE.Group();
  dynJunk.add(box(8, 1.8, 3, new THREE.MeshStandardMaterial({color:0x6e4525, roughness:.85}), 0, .9, 0));
  var sail = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 6),
    new THREE.MeshStandardMaterial({color:0xc8452c, side:THREE.DoubleSide, roughness:.8}));
  sail.position.set(0, 5, 0); dynJunk.add(sail);
  dynJunk.position.set(-165, -.5, 256); dynJunk.rotation.y = .5; S.add(dynJunk);

  /* --- trees & lamp posts (instanced) --- */
  var treeN = 60;
  var trunkI = new THREE.InstancedMesh(new THREE.CylinderGeometry(.22,.3,1.6,6), MAT.trunk, treeN);
  var leafI = new THREE.InstancedMesh(new THREE.ConeGeometry(2.1, 4.6, 8), MAT.leaf, treeN);
  var m4 = new THREE.Matrix4(); var tn = 0; tries = 0;
  while(tn < treeN && tries < 900){
    tries++;
    var tx = -225 + Math.random()*450, tz = -205 + Math.random()*400;
    var ti2 = nearestIdx(tx, tz, Math.floor(Math.random()*PN), PN/2);
    var tp2 = pathPoint(ti2);
    if(Math.hypot(tp2.x-tx, tp2.z-tz) < HALF + 6) continue;
    m4.makeTranslation(tx, .8, tz); trunkI.setMatrixAt(tn, m4);
    m4.makeTranslation(tx, 3.8, tz); leafI.setMatrixAt(tn, m4);
    tn++;
  }
  trunkI.count = leafI.count = tn; S.add(trunkI); S.add(leafI);
  var lampStep = 15, lampN = Math.floor(PN/lampStep)*2;
  var poleI = new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.09,5,6), MAT.darkMetal, lampN);
  var headI = new THREE.InstancedMesh(new THREE.SphereGeometry(.34,8,8),
    new THREE.MeshBasicMaterial({color:0xffd98a}), lampN);
  var ln = 0; var q4 = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3(1,1,1);
  for(var li=0; li<PN; li+=lampStep){
    var lp = pathPoint(li), ld = pathDir(li);
    for(var ls=-1; ls<=1; ls+=2){
      pv.set(lp.x + (-ld.z)*ls*(HALF+1.6), 2.5, lp.z + ld.x*ls*(HALF+1.6));
      m4.compose(pv, q4, sv); poleI.setMatrixAt(ln, m4);
      pv.y = 5.1; m4.compose(pv, q4, sv); headI.setMatrixAt(ln, m4);
      ln++;
    }
  }
  poleI.count = headI.count = ln; S.add(poleI); S.add(headI);

  /* --- Hung Hom short tunnel (frac .80–.88): frames + roof --- */
  var tunMat = new THREE.MeshStandardMaterial({color:0x565d66, roughness:.85});
  var i0 = fracIdx(.80), i1 = fracIdx(.88);
  for(var ti=i0; ti<i1; ti+=3){
    var tp = pathPoint(ti), td = pathDir(ti), tang = Math.atan2(td.z, td.x);
    var segLen = PATH_LEN/PN*3*1.15;
    for(var ts=-1; ts<=1; ts+=2){
      var pil = box(segLen, 7, .9, tunMat, tp.x + (-td.z)*ts*(HALF+.8), 3.5, tp.z + td.x*ts*(HALF+.8), -tang);
      S.add(pil);
    }
    var roofB = box(segLen, .5, HALF*2+2.4, tunMat, tp.x, 7.1, tp.z, -tang);
    S.add(roofB);
    var strip = box(segLen*.9, .12, .5, new THREE.MeshBasicMaterial({color:0xffe9a8}), tp.x, 6.8, tp.z, -tang);
    S.add(strip);
  }
  var tEnt = placeAt(.798, 0, 0);
  var tSign = textPlate('紅磡海底隧道', {col:'#ffd166', fs:46, glow:true});
  tSign.position.set(tEnt.x, 8.6, tEnt.z);
  tSign.rotation.y = Math.atan2(-tEnt.dx, -tEnt.dz);
  S.add(tSign);

  /* --- Causeway Bay tram crossing the road (frac .52) --- */
  tramIdx = fracIdx(.52);
  tramGroup = new THREE.Group();
  var tramBody = box(3, 3.6, 7.6, new THREE.MeshStandardMaterial({color:0x1f9d63, roughness:.45}), 0, 2.3, 0);
  tramGroup.add(tramBody);
  tramGroup.add(box(3.04, 1.2, 7, new THREE.MeshStandardMaterial({color:0xe8f6ee, roughness:.3}), 0, 3.1, 0));
  tramGroup.add(box(3.04, 1, 7, new THREE.MeshStandardMaterial({color:0xe8f6ee, roughness:.3}), 0, 1.6, 0));
  tramGroup.add(box(2.2, .5, 3, MAT.darkMetal, 0, 4.4, 0));
  var tSign2 = textPlate('叮叮', {col:'#ffffff', fs:40});
  tSign2.position.set(0, 3.1, 3.85); tramGroup.add(tSign2);
  var tp3 = pathPoint(tramIdx), td3 = pathDir(tramIdx);
  tramGroup.position.set(tp3.x, 0, tp3.z);
  tramGroup.rotation.y = Math.atan2(-td3.z, td3.x);
  S.add(tramGroup);
})();
function animateScenery(t){
  if(dynFerry){
    var ph = t*0.055;
    dynFerry.position.x = Math.sin(ph)*175;
    dynFerry.position.z = 248 + Math.sin(t*.5)*.4;
    dynFerry.rotation.y = Math.cos(ph) >= 0 ? 0 : Math.PI;
  }
  if(dynJunk){
    dynJunk.position.y = -.5 + Math.sin(t*.8)*.25;
    dynJunk.rotation.z = Math.sin(t*.6)*.04;
  }
  if(tramGroup){
    var tp = pathPoint(tramIdx), td = pathDir(tramIdx);
    var off = Math.sin(t*.30) * (HALF + 15);
    tramGroup.position.x = tp.x + (-td.z)*off;
    tramGroup.position.z = tp.z + td.x*off;
  }
}
/* ============================================================
   Kart models (low-poly, one per character shape)
   ============================================================ */
function stdMat(hex, rough, metal){ return new THREE.MeshStandardMaterial({color:hex, roughness:rough==null?.5:rough, metalness:metal||0}); }
function makeWheel(){
  var g = new THREE.Group();
  var tyre = new THREE.Mesh(new THREE.CylinderGeometry(.44,.44,.36,14), stdMat(0x14161c,.9));
  tyre.rotation.x = Math.PI/2; tyre.castShadow = true;
  var hub = new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.38,10), stdMat(0xb9c2cf,.35,.7));
  hub.rotation.x = Math.PI/2;
  g.add(tyre); g.add(hub);
  g.userData.spin = tyre; g.userData.spin2 = hub;
  return g;
}
function makeDriver(shirtHex, hatHex, hatStyle){
  var g = new THREE.Group();
  var torso = box(.66,.66,.52, stdMat(shirtHex,.8), 0, .3, 0); torso.castShadow = true; g.add(torso);
  var head = new THREE.Mesh(new THREE.SphereGeometry(.34, 14, 12), stdMat(0xf2c79b,.65));
  head.position.y = .92; head.castShadow = true; g.add(head);
  if(hatStyle === 'cap'){
    var cap = new THREE.Mesh(new THREE.SphereGeometry(.36, 14, 8, 0, Math.PI*2, 0, Math.PI/2), stdMat(hatHex,.7));
    cap.position.y = .97; g.add(cap);
    g.add(box(.5,.07,.4, stdMat(hatHex,.7), .3, .99, 0));
  } else if(hatStyle === 'captain'){
    var brim = new THREE.Mesh(new THREE.CylinderGeometry(.37,.37,.09,14), stdMat(0xffffff,.6));
    brim.position.y = 1.12; g.add(brim);
    var top = new THREE.Mesh(new THREE.CylinderGeometry(.3,.34,.16,14), stdMat(0xffffff,.6));
    top.position.y = 1.22; g.add(top);
    g.add(box(.76,.05,.76, stdMat(0x1c2f4a,.6), 0, 1.06, 0));
  } else if(hatStyle === 'band'){
    var band = new THREE.Mesh(new THREE.CylinderGeometry(.355,.355,.16,14,1,true), stdMat(hatHex,.7));
    band.position.y = 1.0; g.add(band);
  }
  return g;
}
function buildKart(def){
  var g = new THREE.Group();
  var body = stdMat(def.hex, .42, .08);
  var wheels = [], steerWheels = [];
  [[1.15,-.95],[1.15,.95],[-1.15,-.95],[-1.15,.95]].forEach(function(wp, wi){
    var pivot = new THREE.Group(); pivot.position.set(wp[0], .44, wp[1]);
    var wheel = makeWheel(); pivot.add(wheel); g.add(pivot);
    wheels.push(wheel);
    if(wi < 2) steerWheels.push(pivot);
  });
  var shape = def.shape;
  if(shape === 'tram'){
    var tb = box(3.7, 1.5, 1.95, body, 0, 1.12, 0); tb.castShadow = true; g.add(tb);
    g.add(box(3.1, .55, 1.99, stdMat(0xe8f6ee,.3), .15, 1.42, 0));
    g.add(box(3.1, .42, 1.99, stdMat(0xe8f6ee,.5), .15, .68, 0));
    g.add(box(2.7, .16, 1.6, stdMat(0x39424e,.6), 0, 1.95, 0));
    var pg1 = box(1.5,.07,.07, MAT.darkMetal, 0, 2.25, 0); pg1.rotation.z = .5; g.add(pg1);
    var pg2 = box(1.5,.07,.07, MAT.darkMetal, 0, 2.25, 0); pg2.rotation.z = -.5; g.add(pg2);
    g.add(box(.55, .95, 1.7, stdMat(0x20242f,.3), 1.62, 1.2, 0));
    var drv = makeDriver(0x1f9d63, 0x0d5c39, 'cap'); drv.position.set(.4, 1.55, 0); drv.scale.setScalar(.82); g.add(drv);
  } else if(shape === 'tofu'){
    // Tofu-pudding (豆腐花) wooden-bucket stall kart
    var base2 = box(3.2, .55, 2.0, stdMat(0x9a6a33,.7), 0, .58, 0); base2.castShadow = true; g.add(base2);
    g.add(box(3.24, .16, 2.04, stdMat(0x6e4420,.7), 0, .9, 0));
    var bucket = new THREE.Mesh(new THREE.CylinderGeometry(1.02,.88,1.25,16), stdMat(0xb07f3f,.65));
    bucket.position.set(.55, 1.45, 0); bucket.castShadow = true; g.add(bucket);
    var tofuTop = new THREE.Mesh(new THREE.CylinderGeometry(.94,.94,.2,16), stdMat(0xfff7ea,.35));
    tofuTop.position.set(.55, 2.12, 0); g.add(tofuTop);
    [[1.05,.93],[1.75,1.0]].forEach(function(bd){
      var band2 = new THREE.Mesh(new THREE.TorusGeometry(bd[1], .05, 8, 22), stdMat(0x3a3f4a,.4,.6));
      band2.rotation.x = Math.PI/2; band2.position.set(.55, bd[0], 0); g.add(band2);
    });
    g.add(box(.9, .45, 1.3, stdMat(0xfff7ea,.4), 1.78, .68, 0));
    var ladle = box(.08,.08,.9, stdMat(0xb9c2cf,.3,.7), .55, 2.32, .2); ladle.rotation.y = .5; g.add(ladle);
    var drv2 = makeDriver(0xfff7ea, 0x8a5a2b, 'cap'); drv2.position.set(-1.05, .85, 0); g.add(drv2);
  } else if(shape === 'pc'){
    var base = box(3.0, .6, 2.0, body, .1, .55, 0); base.castShadow = true; g.add(base);
    g.add(box(1.7, .1, 1.55, stdMat(0x1d7a3a,.6), .75, .92, 0));                    // motherboard deck
    g.add(box(.4,.22,.4, stdMat(0xc0c6cf,.3,.7), .45, 1.08, -.4));
    g.add(box(.55,.16,.3, stdMat(0x30343c,.5), 1.05, 1.05, .35));
    var tower = box(.85, 2.0, 1.65, stdMat(0xd9a92f,.38,.35), -1.2, 1.6, 0); tower.castShadow = true; g.add(tower);
    g.add(box(.06, 1.7, 1.4, stdMat(0x8a6410,.5,.3), -1.64, 1.6, 0));               // rear panel
    var fans = [];
    [-.45, .45].forEach(function(fz){
      var fan = new THREE.Group();
      var ring = new THREE.Mesh(new THREE.TorusGeometry(.34, .07, 8, 18), stdMat(0x2b2b26,.6));
      fan.add(ring);
      for(var b=0;b<3;b++){
        var bl = box(.6,.13,.05, stdMat(0x9aa7c7,.4,.5), 0, 0, 0);
        bl.rotation.z = b * Math.PI*2/3; fan.add(bl);
      }
      fan.position.set(-1.7, 1.6, fz); fan.rotation.y = Math.PI/2;
      g.add(fan); fans.push(fan);
    });
    g.userData.fans = fans;
    var led1 = box(.07,.12,.12, new THREE.MeshBasicMaterial({color:0x39ff6a}), -1.66, 2.42, -.6); g.add(led1);
    var led2 = box(.07,.12,.12, new THREE.MeshBasicMaterial({color:0xff5964}), -1.66, 2.42, -.3); g.add(led2);
    [[0x274b73,.5],[0x14161c,-.55]].forEach(function(cb){
      var pts = [ new THREE.Vector3(-1.5,.8,cb[1]), new THREE.Vector3(-2.1,.45,cb[1]*1.5),
                  new THREE.Vector3(-2.5,.7,cb[1]*1.8), new THREE.Vector3(-2.9,.35,cb[1]*1.6) ];
      var tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, .05, 6),
        stdMat(cb[0],.7));
      g.add(tube);
    });
    g.add(box(.8, .5, 1.5, stdMat(0x20242f,.4), 1.35, .95, 0));                     // front drive bay
    var drv3 = makeDriver(0x30343c, 0xf5c542, 'band'); drv3.position.set(.1, .85, 0); g.add(drv3);
  } else { /* bun — pineapple bun kart */
    var bb = box(2.9, .55, 1.95, body, 0, .58, 0); bb.castShadow = true; g.add(bb);
    var dome = new THREE.Mesh(new THREE.SphereGeometry(1.35, 18, 12, 0, Math.PI*2, 0, Math.PI/2), body);
    dome.scale.set(1.15, .55, .74); dome.position.set(-.1, .8, 0); dome.castShadow = true; g.add(dome);
    [.7, -.7].forEach(function(r){
      var cr = box(2.1, .05, .17, stdMat(def.dark,.6), -.1, 1.52, 0); cr.rotation.y = r; g.add(cr);
    });
    g.add(box(1.0, .5, 1.15, stdMat(0x20242f,.4), -.6, .95, 0));
    g.add(box(.75, .45, 1.5, body, 1.55, .62, 0));
    var drv4 = makeDriver(0xffffff, 0xe9c46a, 'cap'); drv4.position.set(-.6, 1.1, 0); g.add(drv4);
  }
  // shield bubble + boost flames + held-item slot
  var shield = new THREE.Mesh(new THREE.SphereGeometry(2.35, 18, 14),
    new THREE.MeshBasicMaterial({color:0x8cdcff, transparent:true, opacity:.25, depthWrite:false}));
  shield.position.y = 1; shield.visible = false; g.add(shield);
  var flames = [];
  [-.5, .5].forEach(function(fz){
    var fl = new THREE.Mesh(new THREE.ConeGeometry(.32, 1.6, 10),
      new THREE.MeshBasicMaterial({color:0xff9f43, transparent:true, opacity:.92}));
    fl.rotation.z = Math.PI/2; fl.position.set(-2.1, .55, fz); fl.visible = false; g.add(fl); flames.push(fl);
  });
  var iconSlot = new THREE.Group(); iconSlot.position.set(0, 3.1, 0); g.add(iconSlot);
  g.userData.wheels = wheels; g.userData.steerWheels = steerWheels;
  g.userData.shield = shield; g.userData.flames = flames; g.userData.iconSlot = iconSlot;
  g.traverse(function(o){ if(o.isMesh) o.castShadow = true; });
  shield.castShadow = false;
  return g;
}
function makeItemIcon(key){
  var g = new THREE.Group();
  if(key === 'waffle'){
    var s = new THREE.Mesh(new THREE.SphereGeometry(.42, 12, 10), stdMat(0xf4a259,.6));
    s.scale.y = .55; g.add(s);
  } else if(key === 'fishball'){
    var stick = new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,1.15,6), stdMat(0xd9c9a8,.7));
    stick.rotation.z = Math.PI/2; g.add(stick);
    [-.32, 0, .32].forEach(function(x){
      var b = new THREE.Mesh(new THREE.SphereGeometry(.21, 10, 8), stdMat(0xe8a34c,.55));
      b.position.x = x; g.add(b);
    });
  } else if(key === 'bun'){
    var d = new THREE.Mesh(new THREE.SphereGeometry(.44, 12, 8, 0, Math.PI*2, 0, Math.PI/2), stdMat(0xe9c46a,.55));
    d.scale.y = .8; g.add(d);
    g.add(box(.8,.18,.8, stdMat(0xe9c46a,.55), 0, -.05, 0));
  } else if(key === 'cheungfun'){
    var c = new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.16,14), stdMat(0xf7f3e8,.4));
    g.add(c);
  } else if(key === 'redbean'){
    var cup = new THREE.Mesh(new THREE.CylinderGeometry(.3,.24,.55,12),
      new THREE.MeshStandardMaterial({color:0xffffff, roughness:.15, metalness:.1, transparent:true, opacity:.55}));
    g.add(cup);
    var top = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 8, 0, Math.PI*2, 0, Math.PI/2), stdMat(0xef476f,.35));
    top.position.y = .26; g.add(top);
  } else if(key === 'milktea'){
    var cup2 = new THREE.Mesh(new THREE.CylinderGeometry(.27,.21,.6,12), stdMat(0xd9a05f,.35));
    g.add(cup2);
    var straw = box(.07,.5,.07, stdMat(0xe63946,.5), .12, .45, 0); straw.rotation.z = -.25; g.add(straw);
  }
  return g;
}
function setKartIcon(r){
  var slot = r.mesh.userData.iconSlot;
  while(slot.children.length) slot.remove(slot.children[0]);
  if(r.item) slot.add(makeItemIcon(r.item));
}

/* ============================================================
   Pickups: item boxes + boost pads, traps & projectile meshes
   ============================================================ */
var itemBoxes = [], boostPads = [];
(function buildPickups(){
  var boxFrac = [.06,.22,.38,.55,.71,.87];
  boxFrac.forEach(function(f){
    var i = fracIdx(f), p = pathPoint(i), d = pathDir(i);
    [-4.2, 4.2].forEach(function(s){
      var x = p.x + (-d.z)*s, z = p.z + d.x*s;
      var grp = new THREE.Group();
      var outer = new THREE.Mesh(new THREE.BoxGeometry(1.6,1.6,1.6),
        new THREE.MeshStandardMaterial({color:0xffd166, transparent:true, opacity:.32, roughness:.15, emissive:0x8a6410}));
      grp.add(outer);
      var inner = new THREE.Mesh(new THREE.BoxGeometry(.9,.9,.9),
        new THREE.MeshBasicMaterial({color:0xffe066}));
      grp.add(inner);
      var glow = new THREE.Sprite(new THREE.SpriteMaterial({map:softDot, color:0xffd166, transparent:true, opacity:.5, depthWrite:false}));
      glow.scale.set(5,5,1); grp.add(glow);
      grp.position.set(x, 1.5, z);
      scene.add(grp);
      itemBoxes.push({x:x, z:z, grp:grp, inner:inner, outer:outer, active:true, respawn:0, bob:Math.random()*6});
    });
  });
  var padFrac = [.14,.47,.80];
  padFrac.forEach(function(f){
    var i = fracIdx(f), p = pathPoint(i), d = pathDir(i);
    var ang = Math.atan2(d.z, d.x);
    var pad = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 5),
      new THREE.MeshBasicMaterial({map:chevronTex, transparent:true, color:0xff8c1a, side:THREE.DoubleSide, depthWrite:false}));
    pad.rotation.set(-Math.PI/2, 0, -Math.PI/2 - ang);
    pad.position.set(p.x, .12, p.z);
    pad.renderOrder = 2;
    scene.add(pad);
    boostPads.push({x:p.x, z:p.z});
  });
})();
function makeFishballMesh(){
  var g = new THREE.Group();
  var stick = new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,1.3,6), stdMat(0xd9c9a8,.7));
  stick.rotation.z = Math.PI/2; g.add(stick);
  [-.38, 0, .38].forEach(function(x){
    var b = new THREE.Mesh(new THREE.SphereGeometry(.24, 10, 8), stdMat(0xe8a34c,.5));
    b.position.x = x; g.add(b);
  });
  return g;
}
function makeTrapMesh(){
  var g = new THREE.Group();
  var base = new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,.14,18), stdMat(0xf7f3e8,.35));
  g.add(base);
  var top = new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.2,14), stdMat(0xf2b8c6,.4));
  g.add(top);
  return g;
}

/* ---------------- Particles (pooled points) ---------------- */
var PMAX = 260;
var pGeo = new THREE.BufferGeometry();
var pPos = new Float32Array(PMAX*3), pCol = new Float32Array(PMAX*3);
for(var pi=0; pi<PMAX; pi++){ pPos[pi*3+1] = -999; }
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
var pPoints = new THREE.Points(pGeo, new THREE.PointsMaterial({size:1.05, map:softDot, vertexColors:true,
  transparent:true, depthWrite:false, opacity:.95}));
pPoints.frustumCulled = false;
scene.add(pPoints);
var particles = [];
var tmpColor = new THREE.Color();
function burst(x, y, z, hex, n, spd){
  tmpColor.setHex(hex);
  for(var i=0;i<n;i++){
    if(particles.length >= PMAX) particles.shift();
    var a = Math.random()*Math.PI*2, s = (Math.random()*.7+.3)*(spd||7);
    particles.push({x:x, y:y, z:z, vx:Math.cos(a)*s, vy:2.5+Math.random()*4, vz:Math.sin(a)*s,
      t:.55+Math.random()*.4, life:.95, r:tmpColor.r, g:tmpColor.g, b:tmpColor.b});
  }
}
function stepParticles(dt){
  for(var i=particles.length-1;i>=0;i--){
    var q = particles[i]; q.t -= dt;
    if(q.t<=0){ particles.splice(i,1); continue; }
    q.x += q.vx*dt; q.y += q.vy*dt; q.z += q.vz*dt;
    q.vy -= 9*dt; q.vx *= .94; q.vz *= .94;
    if(q.y < .15){ q.y = .15; q.vy = 0; }
  }
  for(var j=0;j<PMAX;j++){
    if(j < particles.length){
      var p = particles[j];
      pPos[j*3]=p.x; pPos[j*3+1]=p.y; pPos[j*3+2]=p.z;
      pCol[j*3]=p.r; pCol[j*3+1]=p.g; pCol[j*3+2]=p.b;
    } else { pPos[j*3+1] = -999; }
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;
}
/* ============================================================
   Racers & game state
   ============================================================ */
var racers = [], projectiles = [], traps = [];
var state = 'menu'; // menu | count | race | paused | finished
var countT = 0, raceClock = 0, simT = 0, shake = 0, hudT = 0;
var camPos = new THREE.Vector3(0, 26, 60);
var keys = {};
var touch = {left:false, right:false, gas:false, brake:false, drift:false};

function makeRacer(def, gridIdx){
  var back = 7 + Math.floor(gridIdx/2)*7;
  var side = (gridIdx%2===0? -1: 1) * 3.6;
  var startIdx = ((0 - Math.round(back/(PATH_LEN/PN)))%PN+PN)%PN;
  var p = pathPoint(startIdx), d = pathDir(startIdx);
  var x = p.x + (-d.z)*side, z = p.z + d.x*side;
  var mesh = buildKart(def);
  if(!def.player){
    // Short name only, scaled right down — the full "name · title" plate was
    // ~15 world units wide and blocked the player's view at the start grid.
    var label = nameSprite(def.name, '#ffffff');
    label.scale.multiplyScalar(0.6);
    label.position.set(0, 3.45, 0); mesh.add(label);
  }
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    def:def, name:def.name, col:def.col, isPlayer:!!def.player,
    x:x, z:z, ang:Math.atan2(d.z, d.x), speed:0, steerVis:0,
    idx:startIdx, prevIdx:startIdx, lap:-1, finished:false, finishTime:0,
    item:null, shield:false, boostT:0, starT:0, spinT:0, frozenT:0, driftT:0, driftDir:0, miniBoostT:0, rb:1, rbTarget:1,
    aiOffset:(Math.random()*8-4), aiTimer:Math.random()*3+2, wob:Math.random()*10,
    tramCool:0, mesh:mesh
  };
}
function raceProgress(r){ return r.lap*PATH_LEN + CUM[r.idx]; }
function rankings(){
  return racers.slice().sort(function(a,b){
    if(a.finished && b.finished) return a.finishTime - b.finishTime;
    if(a.finished) return -1; if(b.finished) return 1;
    return raceProgress(b) - raceProgress(a);
  });
}
function resetRace(){
  racers.forEach(function(r){ scene.remove(r.mesh); });
  projectiles.forEach(function(p){ scene.remove(p.mesh); });
  traps.forEach(function(t){ scene.remove(t.mesh); });
  racers = []; projectiles = []; traps = []; particles = [];
  itemBoxes.forEach(function(b){ b.active = true; b.respawn = 0; b.grp.visible = true; });
  var playerDef = Object.assign({}, CHARS[selectedChar], {player:true});
  var defs = [playerDef].concat(CHARS.filter(function(c,i){ return i!==selectedChar; }));
  racers = defs.map(function(d,i){ return makeRacer(d,i); });
  raceClock = 0; countT = 3.999; shake = 0;
  var p = racers[0];
  camPos.set(p.x - Math.cos(p.ang)*11, 5, p.z - Math.sin(p.ang)*11);
  document.getElementById('hud').classList.add('on');
  document.getElementById('touch').classList.add('on');
  updateItemBox();
}
function startRace(){
  setKbFocus(null, false);
  if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
  document.getElementById('menuScr').classList.remove('on');
  document.getElementById('charScr').classList.remove('on');
  document.getElementById('optScr').classList.remove('on');
  document.getElementById('endScr').classList.remove('on');
  document.getElementById('pauseScr').classList.remove('on');
  setBgmTrack('race');
  resetRace();
  state = 'count';
  setMsg('3','準備…');
}
function setMsg(t, sub){
  document.getElementById('msg').textContent = t || '';
  document.getElementById('subMsg').textContent = sub || '';
}
var toastTimer = null;
function toast(text, col){
  var el = document.getElementById('toast');
  el.textContent = text; el.style.color = col || '#fff'; el.style.opacity = 1;
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ el.style.opacity = 0; }, 1500);
}
function fmtTime(s){
  if(!isFinite(s) || s<=0) return '00:00.0';
  var m = Math.floor(s/60), ss = s - m*60;
  return String(m).padStart(2,'0') + ':' + ss.toFixed(1).padStart(4,'0');
}

/* ---------------- Input ---------------- */
window.addEventListener('keydown', function(e){
  keys[e.key.toLowerCase()] = true;
  if(isMenuState()){ menuKey(e); return; }
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].indexOf(e.key) >= 0) e.preventDefault();
  if((e.key === ' ' || e.key === 'e' || e.key === 'E') && state === 'race') useItem(racers[0]);
  if(e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
});
window.addEventListener('keyup', function(e){
  keys[e.key.toLowerCase()] = false;
  if(isMenuState() && e.key === ' ') e.preventDefault();
});

/* ---------------- Keyboard menu navigation ----------------
   Every screen's choices are keyboard-operable: arrow keys move a
   visible focus ring (the .kbFocus outline), Enter / Space confirms,
   Esc goes back. Moving onto a character card picks that racer. */
var kbFocusEl = null;
function isMenuState(){ return state==='menu' || state==='select' || state==='options' || state==='paused' || state==='finished'; }
function setKbFocus(el, sound, selectCard){
  if(kbFocusEl) kbFocusEl.classList.remove('kbFocus');
  kbFocusEl = el || null;
  if(!kbFocusEl) return;
  kbFocusEl.classList.add('kbFocus');
  if(kbFocusEl.focus) kbFocusEl.focus({preventScroll:true});
  if(selectCard && kbFocusEl.classList.contains('charCard') && !kbFocusEl.classList.contains('sel')){
    kbFocusEl.click(); // moving onto a card selects that racer (the click beeps)
  } else if(sound) beep(660,.05,'square',.035);
}
function navRows(){
  function el(id){ return document.getElementById(id); }
  if(state === 'menu') return [[el('btnToChar')],[el('btnToOptions')],[el('btnBGM')]];
  if(state === 'select'){
    var cards = Array.prototype.slice.call(document.querySelectorAll('#charGrid .charCard'));
    var rows = [[el('btnBackFromChar'), el('btnOptFromChar')]];
    for(var i=0;i<cards.length;i+=2) rows.push(cards.slice(i, i+2));
    rows.push([el('btnStart')]);
    return rows;
  }
  if(state === 'options') return [[el('btnBackFromOpt')],[el('btnBGMOpt')],[el('btnSfxLobby')],[el('optVol')]];
  if(state === 'paused') return [[el('btnResume')],[el('btnQuit')]];
  if(state === 'finished') return [[el('btnAgain')],[el('btnMenu')]];
  return [];
}
function menuKey(e){
  var k = e.key;
  if(k === 'Escape'){
    e.preventDefault();
    if(state === 'paused') togglePause();
    else if(state === 'select') showMenu();
    else if(state === 'options') closeOptions();
    else if(state === 'finished') showMenu();
    return;
  }
  if((k === 'p' || k === 'P') && state === 'paused'){ togglePause(); return; }
  var rows = navRows();
  if(!rows.length) return;
  var ri = -1, ci = -1;
  rows.forEach(function(row, r){ row.forEach(function(el, c){ if(el === kbFocusEl){ ri = r; ci = c; } }); });
  if(k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight'){
    e.preventDefault();
    if(ri < 0){ setKbFocus(rows[0][0], true, true); return; }
    if(kbFocusEl.id === 'optVol' && (k === 'ArrowLeft' || k === 'ArrowRight')){
      var sl = kbFocusEl;
      sl.value = Math.max(0, Math.min(100, (+sl.value) + (k === 'ArrowRight' ? 5 : -5)));
      sl.dispatchEvent(new Event('input'));
      beep(660,.05,'square',.035);
      return;
    }
    if(k === 'ArrowLeft' || k === 'ArrowRight'){
      var nc = ci + (k === 'ArrowRight' ? 1 : -1);
      if(nc < 0) nc = rows[ri].length - 1;
      if(nc >= rows[ri].length) nc = 0;
      setKbFocus(rows[ri][nc], true, true);
    } else {
      var nr = ri + (k === 'ArrowDown' ? 1 : -1);
      if(nr < 0) nr = rows.length - 1;
      if(nr >= rows.length) nr = 0;
      setKbFocus(rows[nr][Math.min(ci, rows[nr].length - 1)], true, true);
    }
    return;
  }
  if(k === 'Enter' || k === ' '){
    e.preventDefault();
    if(!kbFocusEl){ setKbFocus(rows[0][0], true, true); return; }
    ac();
    if(kbFocusEl.classList.contains('charCard')){ document.getElementById('btnStart').click(); return; }
    if(kbFocusEl.id === 'optVol') return; // slider is adjusted with the arrow keys
    kbFocusEl.click();
  }
}
document.addEventListener('pointerdown', function(e){
  if(!isMenuState() || !e.target.closest) return;
  var t = e.target.closest('button, input');
  if(!t) return;
  var rows = navRows();
  for(var i=0;i<rows.length;i++) if(rows[i].indexOf(t) >= 0){ setKbFocus(t, false, false); return; }
});
function bindTouch(id, prop){
  var el = document.getElementById(id);
  var on = function(e){ e.preventDefault(); ac(); touch[prop] = true; el.classList.add('held'); };
  var off = function(e){ e.preventDefault(); touch[prop] = false; el.classList.remove('held'); };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
}
bindTouch('tLeft','left'); bindTouch('tRight','right'); bindTouch('tGas','gas'); bindTouch('tBrake','brake'); bindTouch('tDrift','drift');
document.getElementById('tItem').addEventListener('pointerdown', function(e){ e.preventDefault(); ac(); if(state==='race') useItem(racers[0]); });
if(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
window.addEventListener('touchstart', function(){ document.body.classList.add('touch'); }, {once:true, passive:true});
document.getElementById('btnStart').addEventListener('click', function(){ ac(); startBGM(); startRace(); });
document.getElementById('btnToChar').addEventListener('click', function(){ ac(); startBGM(); beep(700,.07,'square',.05); showCharSelect(); });
document.getElementById('btnToOptions').addEventListener('click', function(){ ac(); startBGM(); beep(700,.07,'square',.05); showOptions('menuScr'); });
document.getElementById('btnOptFromChar').addEventListener('click', function(){ ac(); showOptions('charScr'); });
document.getElementById('btnBackFromChar').addEventListener('click', function(){ showMenu(); });
document.getElementById('btnBackFromOpt').addEventListener('click', function(){ closeOptions(); });
var bgmOptEl = document.getElementById('btnBGMOpt');
if(bgmOptEl) bgmOptEl.addEventListener('click', function(){ ac(); toggleBGM(); });
var volEl = document.getElementById('optVol');
if(volEl) volEl.addEventListener('input', function(){ setBgmVolume(this.value/100); var lab = document.getElementById('optVolVal'); if(lab) lab.textContent = this.value + '%'; });
document.getElementById('btnAgain').addEventListener('click', function(){ ac(); startRace(); });
document.getElementById('btnMenu').addEventListener('click', showMenu);
document.getElementById('btnResume').addEventListener('click', togglePause);
document.getElementById('btnQuit').addEventListener('click', showMenu);
document.getElementById('btnPause').addEventListener('click', function(){ if(state==='race'||state==='paused') togglePause(); });
document.getElementById('btnRestart').addEventListener('click', function(){ if(state!=='menu') startRace(); });
document.getElementById('btnSound').addEventListener('click', function(){ muted = !muted; this.textContent = muted ? '✕' : '♪'; this.style.opacity = muted ? .5 : 1; if(muted) stopBGM(); else if(bgmOn) startBGM(); updateBgmBtn(); syncSfxBtn(); });
function syncSfxBtn(){ var b=document.getElementById('btnSfxLobby'); if(!b) return; b.textContent = muted ? 'SFX OFF' : 'SFX ON'; b.classList.toggle('on', !muted); }
var bgmBtnEl = document.getElementById('btnBGM');
if(bgmBtnEl) bgmBtnEl.addEventListener('click', function(){ ac(); toggleBGM(); });
var sfxBtnEl = document.getElementById('btnSfxLobby');
if(sfxBtnEl) sfxBtnEl.addEventListener('click', function(){ muted = !muted; syncSfxBtn(); if(muted) stopBGM(); else if(bgmOn) startBGM(); updateBgmBtn(); var hb=document.getElementById('btnSound'); if(hb){ hb.textContent = muted ? '✕' : '♪'; hb.style.opacity = muted ? .5 : 1; } });
window.addEventListener('pointerdown', function(){ if(bgmOn && !muted) startBGM(); }, {once:true});
function showMenu(){
  state = 'menu';
  document.getElementById('pauseScr').classList.remove('on');
  document.getElementById('endScr').classList.remove('on');
  document.getElementById('charScr').classList.remove('on');
  document.getElementById('optScr').classList.remove('on');
  document.getElementById('menuScr').classList.add('on');
  document.getElementById('hud').classList.remove('on');
  document.getElementById('touch').classList.remove('on');
  setMsg('','');
  setBgmTrack('menu');
  setupDemo();
  setKbFocus(document.getElementById('btnToChar'), false);
}
var optReturn = 'menuScr';
function showCharSelect(){
  state = 'select';
  document.getElementById('menuScr').classList.remove('on');
  document.getElementById('optScr').classList.remove('on');
  document.getElementById('charScr').classList.add('on');
  var cards = document.querySelectorAll('#charGrid .charCard');
  setKbFocus(cards[selectedChar] || document.getElementById('btnStart'), false);
}
function showOptions(from){
  optReturn = from || 'menuScr';
  state = 'options';
  document.getElementById('menuScr').classList.remove('on');
  document.getElementById('charScr').classList.remove('on');
  document.getElementById('optScr').classList.add('on');
  setKbFocus(document.getElementById('btnBGMOpt'), false);
}
function closeOptions(){
  document.getElementById('optScr').classList.remove('on');
  document.getElementById(optReturn).classList.add('on');
  state = optReturn === 'charScr' ? 'select' : 'menu';
  if(state === 'select'){
    var cards = document.querySelectorAll('#charGrid .charCard');
    setKbFocus(cards[selectedChar] || document.getElementById('btnStart'), false);
  } else setKbFocus(document.getElementById('btnToOptions'), false);
}
function togglePause(){
  if(state === 'race'){ state = 'paused'; document.getElementById('pauseScr').classList.add('on'); setKbFocus(document.getElementById('btnResume'), false); }
  else if(state === 'paused'){ state = 'race'; document.getElementById('pauseScr').classList.remove('on'); setKbFocus(null, false); if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
}

/* ---------------- Item usage & hits ---------------- */
function useItem(r){
  if(!r || !r.item || r.finished) return;
  var it = r.item; r.item = null; setKartIcon(r);
  if(r.isPlayer) updateItemBox();
  if(it === 'waffle'){ r.boostT = Math.max(r.boostT, 1.6); burst(r.x, 1, r.z, 0xf4a259, 12, 6); if(r.isPlayer) sfx.boost(); }
  else if(it === 'milktea'){ r.starT = 2.6; r.boostT = Math.max(r.boostT, 2.2); if(r.isPlayer){ sfx.boost(); toast('絲襪奶茶無敵衝刺！', '#ffd9a0'); } }
  else if(it === 'bun'){ r.shield = true; if(r.isPlayer){ sfx.shield(); toast('菠蘿包護罩！', '#ffe9a8'); } }
  else if(it === 'fishball'){
    var mesh = makeFishballMesh(); scene.add(mesh);
    projectiles.push({x:r.x + Math.cos(r.ang)*2.6, z:r.z + Math.sin(r.ang)*2.6, ang:r.ang,
      vx:Math.cos(r.ang)*46, vz:Math.sin(r.ang)*46, owner:r, t:2.6, mesh:mesh});
    if(r.isPlayer) sfx.shoot();
  }
  else if(it === 'cheungfun'){
    var tm = makeTrapMesh(); scene.add(tm);
    var tx = r.x - Math.cos(r.ang)*3.2, tz = r.z - Math.sin(r.ang)*3.2;
    tm.position.set(tx, .12, tz);
    traps.push({x:tx, z:tz, owner:r, t:25, mesh:tm});
    if(r.isPlayer) toast('放低腸粉陷阱！', '#f1fa8c');
  }
  else if(it === 'redbean'){
    var hitAny = false;
    racers.forEach(function(o){
      if(o === r || o.finished) return;
      if(Math.hypot(o.x-r.x, o.z-r.z) < 30){
        if(o.starT <= 0){ o.frozenT = Math.max(o.frozenT, 2.2); burst(o.x, 1.2, o.z, 0xaee9ff, 10, 5); }
        hitAny = true;
      }
    });
    burst(r.x, 1.2, r.z, 0xef476f, 16, 8);
    if(r.isPlayer){ sfx.freeze(); toast(hitAny ? '紅豆冰凍結對手！' : '紅豆冰…附近冇對手', '#ffb3c6'); }
  }
}
function hitRacer(r){
  if(r.finished || r.starT > 0 || r.spinT > 0) return;
  if(r.shield){
    r.shield = false; burst(r.x, 1.2, r.z, 0xffe9a8, 14, 7);
    if(r.isPlayer){ sfx.shield(); toast('菠蘿包護罩擋住咗！', '#ffe9a8'); }
    return;
  }
  if(r.def.counter && Math.random() < .38){
    r.boostT = Math.max(r.boostT, .7); burst(r.x, 1.2, r.z, 0xffd700, 16, 8);
    if(r.isPlayer){ sfx.shield(); toast('黃老闆反制！破解道具！', '#ffd700'); }
    else if(r.name === '黃老闆') toast('黃老闆反制咗攻擊！', '#ffd700');
    return;
  }
  r.spinT = r.def.tank ? .55 : 1.15;
  r.speed *= .15;
  burst(r.x, 1.2, r.z, 0xffffff, 14, 8);
  if(r.isPlayer){ sfx.hit(); if(!REDUCED) shake = 7; toast('中招打轉！', '#fff'); }
}
function updateItemBox(){
  var boxEl = document.getElementById('itemBox'), p = racers[0];
  if(!p) return;
  if(p.item){
    var it = ITEMS[p.item];
    boxEl.classList.remove('empty'); boxEl.style.borderColor = it.col;
    boxEl.innerHTML = '<div style="width:46px;height:46px">' + itemArt(p.item) + '</div><div class="ic" style="color:' + it.col + '">' + it.name + '</div><div class="hint">空白鍵 / 道具掣使用</div>';
  } else {
    boxEl.classList.add('empty'); boxEl.style.borderColor = '';
    boxEl.innerHTML = '<div class="ic">未有道具</div><div class="hint">撞道具箱抽道具</div>';
  }
}
/* ============================================================
   Physics, AI, race flow
   ============================================================ */
var MAXS = 37;
function stepRacer(r, dt, input){
  if(r.boostT>0) r.boostT -= dt;
  if(r.starT>0) r.starT -= dt;
  if(r.spinT>0) r.spinT -= dt;
  if(r.frozenT>0) r.frozenT -= dt;
  if(r.miniBoostT>0) r.miniBoostT -= dt;
  if(r.tramCool>0) r.tramCool -= dt;
  var frozen = r.frozenT>0, spinning = r.spinT>0;
  var rbF = r.isPlayer ? 1 : (r.rb || 1);   // rubber-band factor, eased in aiInput
  var maxs = MAXS * (r.isPlayer ? 1 : r.def.skill) * rbF;
  if(r.boostT>0 || r.starT>0) maxs *= 1.45;
  if(r.miniBoostT>0) maxs *= 1.28;
  if(frozen) maxs *= .35;
  r.idx = nearestIdx(r.x, r.z, r.idx, 46);
  var offSign = lateralOffset(r.x, r.z, r.idx);
  var off = Math.abs(offSign);
  var onTrack = off < HALF - .8;
  if(!onTrack) maxs *= .5;

  if(spinning){
    r.speed = Math.max(0, r.speed - 26*dt);
  } else {
    var steer = input.steer;
    r.steerVis += ((steer||0) - r.steerVis) * Math.min(1, dt*10);
    var spdFactor = Math.min(1, Math.abs(r.speed)/10 + .2);
    var turnRate = 2.3 * spdFactor * (r.def.turn||1);
    var drifting = input.drift && Math.abs(r.speed) > 15 && steer !== 0;
    if(drifting){
      turnRate = 3.3 * spdFactor * (r.def.turn||1);
      if(r.driftDir === 0) r.driftDir = steer;
      r.driftT += dt;
      if(Math.random() < .55) particles.length < PMAX && particles.push({
        x:r.x - Math.cos(r.ang)*1.6, y:.35, z:r.z - Math.sin(r.ang)*1.6,
        vx:0, vy:.6, vz:0, t:.3, life:.3,
        r:.55, g:.65, b:1 });
    } else {
      if(r.driftT > .55){
        r.miniBoostT = .7;
        if(r.isPlayer){ sfx.boost(); toast(r.driftT > 1.15 ? '橙火漂移加速！' : '藍火漂移加速！', r.driftT > 1.15 ? '#ffb703' : '#aee9ff'); }
        burst(r.x, .6, r.z, r.driftT > 1.15 ? 0xff9f43 : 0x6ec3ff, 8, 4);
      }
      r.driftT = 0; r.driftDir = 0;
    }
    r.ang += steer * turnRate * dt * (r.speed < 0 ? -1 : 1);
    if(input.gas) r.speed += (frozen ? 9 : 21*(r.def.accel||1)*(1+(rbF-1)*.7))*dt;
    else if(input.brake) r.speed -= (r.speed > 2 ? 26*dt : 8*dt);
    else r.speed -= r.speed * .5 * dt;
    if(r.speed > maxs) r.speed = Math.max(maxs, r.speed - 30*dt);
    if(r.speed < -8) r.speed = -8;
  }
  r.x += Math.cos(r.ang)*r.speed*dt;
  r.z += Math.sin(r.ang)*r.speed*dt;
  r.x = Math.max(-232, Math.min(232, r.x));
  r.z = Math.max(-212, Math.min(212, r.z));
  if(off > HALF + 26){
    var p = pathPoint(r.idx);
    r.x += (p.x - r.x)*1.7*dt; r.z += (p.z - r.z)*1.7*dt; r.speed *= .92;
  }
  // Hung Hom tunnel walls are solid (path frac .80–.88, pillars centred at
  // |off| = HALF+.8, .9 thick). A kart centre may stay inside the tunnel
  // (|off| <= inner face − kart half width) or fully outside it, but it can
  // never cross the wall band: push it back to whichever side it came from.
  // The band tapers away at both mouths so karts can enter / leave there.
  var TUN0 = fracIdx(.80), TUN1 = fracIdx(.88);
  if(r.idx >= TUN0 && r.idx <= TUN1){
    var tOff = lateralOffset(r.x, r.z, r.idx);
    var tAbs = Math.abs(tOff);
    var endK = Math.min(1, Math.min(r.idx - TUN0, TUN1 - r.idx) / 8);
    var wIn = HALF - .65 + (1 - endK) * 2.9;   // 7.35 deep inside → 10.25 at the mouth
    var wOut = HALF + 2.25 - (1 - endK) * 2.9; // 10.25 deep inside → 7.35 at the mouth
    if(tAbs > wIn && tAbs < wOut){
      var tSide = tOff >= 0 ? 1 : -1;
      var tLim = Math.abs(offSign) < HALF + .8 ? wIn : wOut;
      var tpw = pathPoint(r.idx), tdw = pathDir(r.idx);
      var alongW = (r.x - tpw.x)*tdw.x + (r.z - tpw.z)*tdw.z;
      r.x = tpw.x + tdw.x*alongW + (-tdw.z)*tSide*tLim;
      r.z = tpw.z + tdw.z*alongW + tdw.x*tSide*tLim;
      r.speed *= .8;
      if(r.isPlayer && Math.abs(r.speed) > 8){ sfx.hit(); if(!REDUCED) shake = Math.max(shake, 3); }
    }
  }
  if(r.boostT < .4){
    for(var bi=0; bi<boostPads.length; bi++){
      var pad = boostPads[bi];
      if(Math.hypot(pad.x-r.x, pad.z-r.z) < 4.6){
        r.boostT = Math.max(r.boostT, .85);
        if(r.isPlayer) sfx.boost();
        burst(r.x, .7, r.z, 0xffe066, 8, 5);
        break;
      }
    }
  }
  if(!r.item){
    for(var ii=0; ii<itemBoxes.length; ii++){
      var b = itemBoxes[ii];
      if(b.active && Math.hypot(b.x-r.x, b.z-r.z) < 2.9){
        b.active = false; b.respawn = 6; b.grp.visible = false;
        r.item = rollItem(r); setKartIcon(r);
        burst(b.x, 1.5, b.z, 0x7bf1a8, 10, 6);
        if(r.isPlayer){ sfx.pickup(); updateItemBox(); toast('攞到：' + ITEMS[r.item].name, ITEMS[r.item].col); }
        break;
      }
    }
  }
  for(var ti=traps.length-1; ti>=0; ti--){
    var t = traps[ti];
    if(t.owner !== r && Math.hypot(t.x-r.x, t.z-r.z) < 1.9){
      scene.remove(t.mesh); traps.splice(ti,1); hitRacer(r);
    }
  }
  // tram hazard
  if(tramGroup && r.tramCool <= 0 && Math.hypot(tramGroup.position.x-r.x, tramGroup.position.z-r.z) < 3.4){
    r.tramCool = 2.5; hitRacer(r);
    if(r.isPlayer) toast('撞到叮叮電車！', '#7bf1a8');
  }
  // lap counting via index wrap — consume the crossing FIRST (prevIdx is
  // updated before any sound / finish call) so the wrap can only ever fire
  // once per crossing, never repeatedly frame after frame.
  var crossedLine = r.prevIdx > PN*.75 && r.idx < PN*.25;
  var crossedBack = r.prevIdx < PN*.25 && r.idx > PN*.75;
  r.prevIdx = r.idx;
  if(crossedLine){
    r.lap++;
    if(r.lap >= TOTAL_LAPS && !r.finished){ r.finished = true; r.finishTime = raceClock; }
    if(r.isPlayer && state === 'race'){
      if(r.lap >= TOTAL_LAPS) finishRace();
      else { sfx.lap(); toast('第 ' + (r.lap+1) + ' 圈！', '#ffd166'); }
    }
  }
  else if(crossedBack && r.lap >= 0) r.lap--;
  // sync mesh
  r.mesh.position.set(r.x, 0, r.z);
  r.mesh.rotation.y = -r.ang + (spinning ? (1.15 - Math.max(0,r.spinT)) * 9 : 0);
  var ud = r.mesh.userData;
  ud.steerWheels.forEach(function(pv){ pv.rotation.y = -r.steerVis * .42; });
  var spin = r.speed * dt / .44;
  ud.wheels.forEach(function(w){ w.userData.spin.rotation.y += spin; w.userData.spin2.rotation.y += spin; });
  if(ud.fans) ud.fans.forEach(function(f){ f.rotation.x += dt * (4 + Math.abs(r.speed)*.4); });
  ud.shield.visible = r.shield || r.starT > 0;
  ud.shield.material.color.setHex(r.starT > 0 ? 0xffd166 : 0x8cdcff);
  var flaming = (r.boostT>0 || r.starT>0 || r.miniBoostT>0) && Math.abs(r.speed) > 6;
  ud.flames.forEach(function(fl){
    fl.visible = flaming;
    if(flaming){
      fl.material.color.setHex(r.starT>0 ? 0xffd166 : (r.miniBoostT>0 && r.boostT<=0 ? 0x6ec3ff : 0xff9f43));
      fl.scale.set(1, .8 + Math.random()*.6, 1);
    }
  });
  if(ud.iconSlot.children.length) ud.iconSlot.rotation.y += dt*2.2;
}
function aiInput(r, dt){
  var look = 5 + Math.floor(Math.abs(r.speed)/3.2);
  var ti = (r.idx + look) % PN;
  var tp = pathPoint(ti), td = pathDir(ti);
  var wob = Math.sin(raceClock*.7 + r.wob)*1.6;
  var tx = tp.x + (-td.z)*(r.aiOffset*.6 + wob);
  var tz = tp.z + td.x*(r.aiOffset*.6 + wob);
  var want = Math.atan2(tz - r.z, tx - r.x);
  var diff = want - r.ang;
  while(diff > Math.PI) diff -= Math.PI*2;
  while(diff < -Math.PI) diff += Math.PI*2;
  var steer = Math.max(-1, Math.min(1, diff*2.4));
  var ahead = pathDir((r.idx+20)%PN), here = pathDir(r.idx);
  var bend = Math.abs(Math.atan2(ahead.z,ahead.x) - Math.atan2(here.z,here.x));
  var bendN = bend > Math.PI ? Math.PI*2 - bend : bend;
  var gas = true;
  if(bendN > .5 && Math.abs(r.speed) > 27) gas = false;
  var p = racers[0];
  var gap = raceProgress(p) - raceProgress(r);
  // Rubber band — continuous, not a one-frame boost: gap is in track units
  // (one lap ≈ PATH_LEN). Eased toward ±8% of top speed / acceleration
  // (applied every frame in stepRacer via r.rb): an AI far behind the
  // player gains pace, an AI far ahead sheds it, so the pack stays close.
  var rbT = Math.max(-1, Math.min(1, gap / 420));
  r.rbTarget = 1 + rbT * .08;
  r.rb += (r.rbTarget - r.rb) * Math.min(1, dt*1.5);
  if(gap < -420 && Math.random() < .3) gas = false;       // ease off when far ahead
  var drift = bendN > .6 && Math.abs(r.speed) > 24 && Math.random() < .4;
  r.aiTimer -= dt;
  if(r.item && r.aiTimer <= 0){
    r.aiTimer = 2.5 + Math.random()*4;
    var k = r.item;
    if(k === 'cheungfun' || k === 'bun') useItem(r);
    else if(k === 'fishball'){
      var foe = null;
      racers.forEach(function(o){ if(o!==r && raceProgress(o) > raceProgress(r) && raceProgress(o)-raceProgress(r) < 42) foe = o; });
      if(foe) useItem(r);
    }
    else if(k === 'redbean'){
      var near = racers.some(function(o){ return o!==r && Math.hypot(o.x-r.x, o.z-r.z) < 28; });
      if(near) useItem(r);
    }
    else useItem(r);
  }
  if(Math.random() < dt*.12) r.aiOffset = Math.random()*9 - 4.5;
  return {steer:steer, gas:gas, brake:false, drift:drift};
}
function playerInput(){
  var steer = ((keys['arrowright']||keys['d']||touch.right)?1:0) - ((keys['arrowleft']||keys['a']||touch.left)?1:0);
  return {
    steer: steer,
    gas: !!(keys['arrowup']||keys['w']||touch.gas),
    brake: !!(keys['arrowdown']||keys['s']||touch.brake),
    drift: !!(keys['shift']||touch.drift)
  };
}
var lastFinishCount = 0, resultsT = 0;
function renderResults(){
  var p = racers[0];
  var rank = rankings();
  var myPos = rank.indexOf(p) + 1;
  document.getElementById('finalPos').innerHTML = '第 <span class="hl">' + myPos + '</span> 名 / ' + racers.length;
  document.getElementById('finalTime').textContent = '你嘅總時間：' + fmtTime(p.finishTime) +
    (myPos===1 ? ' — 冠軍！全港最快！🏆' : myPos<=3 ? ' — 上到頒獎台，好勁！' : ' — 再接再厲，下次攞返前列！');
  var rows = document.getElementById('resultRows'); rows.innerHTML = '';
  rank.forEach(function(r, i){
    var tr = document.createElement('tr'); if(r.isPlayer) tr.className = 'me';
    var status = r.finished ? fmtTime(r.finishTime)
      : '比賽中…（第 ' + Math.min(TOTAL_LAPS, Math.max(1, r.lap+1)) + ' 圈）';
    tr.innerHTML = '<td class="medal">' + (i+1) + '</td><td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + r.col + ';margin-right:7px"></span>' + r.name + '（' + r.def.title + '）</td><td>' + status + '</td>';
    rows.appendChild(tr);
  });
}
function finishRace(){
  var p = racers[0];
  if(!p.finished){ p.finished = true; p.finishTime = raceClock; }
  state = 'finished';
  lastFinishCount = 0; resultsT = 0;
  racers.forEach(function(r){ if(r.finished) lastFinishCount++; });
  renderResults();
  document.getElementById('endScr').classList.add('on');
  document.getElementById('touch').classList.remove('on');
  setMsg('','');
  setKbFocus(document.getElementById('btnAgain'), false);
  if(rankings().indexOf(p) + 1 <= 3) sfx.win();
}

function stepCollisions(){
  for(var i=0;i<racers.length;i++) for(var j=i+1;j<racers.length;j++){
    var a = racers[i], b = racers[j];
    var dx = b.x-a.x, dz = b.z-a.z, d = Math.hypot(dx,dz);
    if(d > 0 && d < 3.1){
      var push = (3.1-d)/2*.55, ux = dx/d, uz = dz/d;
      a.x -= ux*push; a.z -= uz*push; b.x += ux*push; b.z += uz*push;
      if(a.starT > 0 && b.spinT <= 0 && b.starT <= 0) hitRacer(b);
      if(b.starT > 0 && a.spinT <= 0 && a.starT <= 0) hitRacer(a);
      var avg = (a.speed+b.speed)/2; a.speed += (avg-a.speed)*.4; b.speed += (avg-b.speed)*.4;
    }
  }
}
function stepProjectiles(dt){
  for(var pi2=projectiles.length-1; pi2>=0; pi2--){
    var pr = projectiles[pi2];
    pr.t -= dt; pr.x += pr.vx*dt; pr.z += pr.vz*dt;
    var best = null, bd = 26;
    racers.forEach(function(o){
      if(o === pr.owner || o.finished) return;
      var dd = Math.hypot(o.x-pr.x, o.z-pr.z);
      if(dd < bd){ bd = dd; best = o; }
    });
    if(best){
      var want = Math.atan2(best.z-pr.z, best.x-pr.x);
      var diff = want - pr.ang;
      while(diff > Math.PI) diff -= Math.PI*2;
      while(diff < -Math.PI) diff += Math.PI*2;
      pr.ang += Math.max(-3.4*dt, Math.min(3.4*dt, diff));
      pr.vx = Math.cos(pr.ang)*46; pr.vz = Math.sin(pr.ang)*46;
      if(bd < 2.4){ hitRacer(best); scene.remove(pr.mesh); projectiles.splice(pi2,1); continue; }
    }
    pr.mesh.position.set(pr.x, 1.1, pr.z);
    pr.mesh.rotation.y = -pr.ang;
    if(pr.t <= 0){ scene.remove(pr.mesh); projectiles.splice(pi2,1); }
  }
  for(var t2=traps.length-1; t2>=0; t2--){ traps[t2].t -= dt; if(traps[t2].t <= 0){ scene.remove(traps[t2].mesh); traps.splice(t2,1); } }
}
var demoTarget = 0, demoT = 0;
function setupDemo(){
  racers.forEach(function(r){ scene.remove(r.mesh); });
  projectiles.forEach(function(p){ scene.remove(p.mesh); });
  traps.forEach(function(t){ scene.remove(t.mesh); });
  projectiles = []; traps = []; particles = [];
  itemBoxes.forEach(function(b){ b.active = true; b.respawn = 0; b.grp.visible = true; });
  racers = CHARS.map(function(d, i){ return makeRacer(Object.assign({}, d), i); });
  demoTarget = 0; demoT = 0; raceClock = 0;
  var p = racers[0];
  camPos.set(p.x - Math.cos(p.ang)*12, 5.5, p.z - Math.sin(p.ang)*12);
}
/* ---------------- Per-frame update ---------------- */
var mm2 = document.getElementById('minimap');
var mmx = mm2.getContext('2d');
function drawMinimap(rank){
  mmx.clearRect(0,0,296,224);
  mmx.fillStyle = 'rgba(16,24,48,.9)'; mmx.fillRect(0,0,296,224);
  mmx.fillStyle = 'rgba(38,90,140,.8)'; mmx.fillRect(0,196,296,28);
  var sx = 296/500, sy = 224/450, ox = 148, oy = 112;
  mmx.beginPath();
  PATH.forEach(function(p, i){ var x = ox + p.x*sx, y = oy + p.z*sy; i ? mmx.lineTo(x,y) : mmx.moveTo(x,y); });
  mmx.closePath();
  mmx.strokeStyle = '#8fa3cc'; mmx.lineWidth = 6; mmx.lineJoin = 'round'; mmx.stroke();
  mmx.strokeStyle = '#39466e'; mmx.lineWidth = 1.2; mmx.stroke();
  for(var i=rank.length-1; i>=0; i--){
    var r = rank[i];
    mmx.beginPath(); mmx.arc(ox + r.x*sx, oy + r.z*sy, r.isPlayer ? 6 : 4.5, 0, 7);
    mmx.fillStyle = r.col; mmx.fill(); mmx.strokeStyle = '#fff'; mmx.lineWidth = r.isPlayer ? 2 : 1; mmx.stroke();
  }
}
function update(dt){
  simT += dt;
  animateScenery(simT);
  // item boxes idle motion / respawn
  itemBoxes.forEach(function(b){
    if(!b.active){ b.respawn -= dt; if(b.respawn <= 0){ b.active = true; b.grp.visible = true; } return; }
    b.bob += dt*2.4;
    b.grp.position.y = 1.5 + Math.sin(b.bob)*.25;
    b.grp.rotation.y += dt*1.4;
    b.inner.rotation.x += dt*2; b.inner.rotation.z += dt*1.3;
  });
  if(state === 'count'){
    var prev = Math.ceil(countT);
    countT -= dt;
    var now = Math.ceil(countT);
    if(now !== prev && now > 0){ setMsg(String(now), '準備…握實軚盤！'); sfx.count(); }
    if(countT <= 0){
      state = 'race'; setMsg('GO!', '衝呀！'); sfx.go();
      setTimeout(function(){ if(state==='race') setMsg('',''); }, 800);
    }
    racers.forEach(function(r){ r.idx = nearestIdx(r.x, r.z, r.idx, 10); r.prevIdx = r.idx; r.mesh.rotation.y = -r.ang; });
    updateCamera(dt, true);
    drawMinimap(rankings());
    return;
  }
  if(state === 'menu' || state === 'select' || state === 'options'){
    raceClock += dt;
    demoT += dt;
    if(demoT > 9){ demoT = 0; demoTarget = (demoTarget + 1) % Math.max(1, racers.length); }
    racers.forEach(function(r){
      stepRacer(r, dt, aiInput(r, dt));
      if(r.finished){ r.finished = false; r.lap = 0; }
    });
    stepCollisions();
    stepProjectiles(dt);
    stepParticles(dt);
    updateCamera(dt, false);
    return;
  }
  if(state === 'finished'){
    // The race is NOT over for the AI when the player crosses the line:
    // keep simulating behind the results screen so every racer actually
    // finishes, and refresh the results table live as they come in —
    // nobody stays stuck on 比賽中… forever.
    raceClock += dt;
    racers.forEach(function(r){
      if(r.finished){
        r.speed = Math.max(0, r.speed - 20*dt);
        r.x += Math.cos(r.ang)*r.speed*dt; r.z += Math.sin(r.ang)*r.speed*dt;
        r.mesh.position.set(r.x, 0, r.z);
      } else {
        stepRacer(r, dt, aiInput(r, dt));
      }
    });
    stepCollisions();
    stepProjectiles(dt);
    stepParticles(dt);
    if(shake > 0) shake -= dt*22;
    updateCamera(dt, false);
    resultsT -= dt;
    var fc = 0;
    racers.forEach(function(r){ if(r.finished) fc++; });
    if(fc !== lastFinishCount || resultsT <= 0){ lastFinishCount = fc; resultsT = .5; renderResults(); }
    return;
  }
  if(state !== 'race'){ updateCamera(dt, false); return; }
  raceClock += dt;
  racers.forEach(function(r){
    if(r.finished){
      r.speed = Math.max(0, r.speed - 20*dt);
      r.x += Math.cos(r.ang)*r.speed*dt; r.z += Math.sin(r.ang)*r.speed*dt;
      r.mesh.position.set(r.x, 0, r.z);
      return;
    }
    stepRacer(r, dt, r.isPlayer ? playerInput() : aiInput(r, dt));
  });
  stepCollisions();
  stepProjectiles(dt);
  stepParticles(dt);
  if(shake > 0) shake -= dt*22;
  updateCamera(dt, false);
  // HUD (throttled standings)
  var p = racers[0], rank = rankings();
  document.getElementById('posNum').innerHTML = (rank.indexOf(p)+1) + '<span style="font-size:16px;color:var(--muted)">/' + racers.length + '</span>';
  document.getElementById('lapNum').textContent = Math.min(TOTAL_LAPS, Math.max(1, p.lap+1));
  document.getElementById('timeBox').textContent = fmtTime(raceClock);
  document.getElementById('speedVal').textContent = Math.round(Math.abs(p.speed)*3.1);
  hudT -= dt;
  if(hudT <= 0){
    hudT = .15;
    document.getElementById('standings').innerHTML = rank.map(function(r, i){
      return '<div class="row' + (r.isPlayer?' me':'') + '"><span><span class="dot" style="background:' + r.col + '"></span>' + (i+1) + '. ' + r.name + '</span><span>' + (r.finished ? '完成' : '第' + Math.min(TOTAL_LAPS, Math.max(1, r.lap+1)) + '圈') + '</span></div>';
    }).join('');
    drawMinimap(rank);
  }
}
var camTarget = new THREE.Vector3(), camLook = new THREE.Vector3();
function updateCamera(dt, orbit){
  var p = racers[0];
  if(!p){
    var a0 = simT * .05;
    camTarget.set(Math.cos(a0)*190, 95, Math.sin(a0)*190);
    camera.position.lerp(camTarget, Math.min(1, dt*2));
    camera.lookAt(0, 0, 40);
    return;
  }
  if(state === 'menu' || state === 'select' || state === 'options'){
    var dp = racers[demoTarget % racers.length] || p;
    var dfx = Math.cos(dp.ang), dfz = Math.sin(dp.ang);
    var sway = Math.sin(simT * .35) * 2.4;
    camTarget.set(dp.x - dfx*12.5 + (-dfz)*sway, 5.6 + Math.sin(simT*.22)*1.1, dp.z - dfz*12.5 + dfx*sway);
    camPos.lerp(camTarget, 1 - Math.exp(-dt*2.6));
    camera.position.copy(camPos);
    camLook.set(dp.x + dfx*8, 1.3, dp.z + dfz*8);
    camera.lookAt(camLook);
    return;
  }
  if(orbit && state === 'count'){
    var oa = -p.ang + Math.PI + Math.sin(simT*.8)*.5;
    camTarget.set(p.x + Math.cos(oa)*10, 4.2, p.z + Math.sin(oa)*10);
    camera.position.lerp(camTarget, Math.min(1, dt*3.5));
    camLook.set(p.x, 1.2, p.z);
    camera.lookAt(camLook);
    return;
  }
  var fx = Math.cos(p.ang), fz = Math.sin(p.ang);
  camTarget.set(p.x - fx*11, 5.2, p.z - fz*11);
  var k = 1 - Math.exp(-dt*5.5);
  camPos.lerp(camTarget, k);
  camera.position.copy(camPos);
  if(shake > 0 && !REDUCED){
    camera.position.x += (Math.random()-.5)*shake*.12;
    camera.position.y += (Math.random()-.5)*shake*.08;
  }
  camLook.set(p.x + fx*7, 1.4, p.z + fz*7);
  camera.lookAt(camLook);
}

/* ---------------- Main loop (fixed-step, clamped) ---------------- */
resizeGL();
setupDemo();
setKbFocus(document.getElementById('btnToChar'), false);
var lastTs = 0, acc = 0;
function frame(ts){
  requestAnimationFrame(frame);
  try{
    if(!lastTs) lastTs = ts;
    var dt = Math.min(.05, (ts - lastTs)/1000 || 0);
    lastTs = ts;
    if(state === 'paused'){ renderer.render(scene, camera); return; }
    acc += dt;
    var step = 1/60, n = 0;
    while(acc >= step && n < 4){ update(step); acc -= step; n++; }
    if(n === 4) acc = 0;
    if(state === 'menu'){ animateScenery(performance.now()/1000); stepParticles(0); }
    renderer.render(scene, camera);
  }catch(err){
    errBox.style.display = 'block';
    errBox.textContent = '出咗問題：' + err.message;
  }
}
requestAnimationFrame(frame);





