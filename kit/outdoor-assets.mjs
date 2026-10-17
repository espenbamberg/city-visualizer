import assert from 'node:assert/strict';
import * as k from './anatomy/iso-kit.mjs';
import {worldPoint,worldBox,footprint,unionBounds,validateTransform} from './spatial.mjs';

const palette={stone:'#d5d2be',metal:'#75877c',glass:'#9eb8b3',wood:'#aa9471',leaf:'#91a67e'};
const escape=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const box=(x,y,z,w,d,h,material,r=.4)=>({kind:'box',x,y,z,w,d,h,material,r});
const cylinder=(x,y,z,r,h,material)=>({kind:'cylinder',x:x-r,y:y-r,z,w:r*2,d:r*2,h,material,r});
const line=(points,material,width=.6)=>({kind:'line',points,material,width,...lineBounds(points,width)});
function lineBounds(points,width) {
  const low=i=>Math.min(...points.map(p=>p[i]))-width/2,high=i=>Math.max(...points.map(p=>p[i]))+width/2;
  return {x:low(0),y:low(1),z:low(2),w:high(0)-low(0),d:high(1)-low(1),h:high(2)-low(2)};
}
const volume=(x,y,z,w,d,h)=>({x,y,z,w,d,h});
const port=(at,out=[0,1,0])=>({at,out});
const sign=(at,text,size=5)=>({kind:'sign',at,text,size,x:at[0],y:at[1],z:at[2]-size,w:text.length*size*.65,d:.2,h:size});

function shop(a) {
  const {w,d,h,material}=a;
  const parts=[box(0,0,0,w,d,3,palette.stone),box(3,3,3,w-6,d-6,h-8,material),box(-2,-2,h-5,w+4,d+4,5,palette.stone)];
  for(let x=9;x<w-35;x+=25) {
    parts.push(box(x,d-2,12,21,1,27,palette.glass),box(x-1,d-1,10,23,2,2,palette.wood));
    for(let i=0;i<3;i++)parts.push(box(x+3+i*5,d-.8,15,3,1,4,'#dbc194'));
  }
  parts.push(box(w-29,d-2,3,19,1,35,palette.metal),box(w-27,d-.8,13,15,.5,22,palette.glass),box(w-13,d,16,1,1,5,palette.stone));
  for(let y=10;y<d-16;y+=22)parts.push(box(w-2,y,18,1,15,23,palette.glass));
  for(let x=0;x<w;x+=12)parts.push(box(x,d-2,42,Math.min(12,w-x),14,3,x%24===0?palette.metal:'#e4ddc6'));
  parts.push(box(4,d-1,48,w-8,2,9,palette.metal),sign([9,d+1.2,54],a.sign??'CORNER SHOP',4.3));
  parts.push(box(14,15,h,25,20,9,'#a5b2a3'));
  for(let y=18;y<32;y+=3)parts.push(line([[17,y,h+9.2],[35,y,h+9.2]],palette.metal));
  return {parts,obstacles:[volume(0,0,0,w,d,h+9),volume(0,d-2,42,w,14,3),volume(-2,-2,h-5,w+4,d+4,5)],clearances:[volume(w-38,d,0,36,30,35)],ports:{public:port([w-20,d,3]),delivery:port([0,d*.4,3],[-1,0,0])}};
}

function shelter(a) {
  const {w,d,h}=a,parts=[{...box(0,0,0,w,d,2,palette.stone),ground:true}],obstacles=[];
  for(const x of [4,w-7])for(const y of [4,d-7]) {
    parts.push(box(x,y,2,3,3,h-5,palette.metal));obstacles.push(volume(x,y,0,3,3,h));
  }
  parts.push(box(5,4,8,w-10,1,h-16,palette.glass),box(4,5,8,1,d-12,h-16,palette.glass));
  obstacles.push(volume(4,4,0,w-8,2,h-5),volume(4,4,0,2,d-8,h-5));
  parts.push(box(-3,-3,h-4,w+6,d+6,4,a.material),box(0,0,h,w,d,1,'#bec9b3'));
  obstacles.push(volume(-3,-3,h-4,w+6,d+6,5));
  for(let x=12;x<w-15;x+=18)parts.push(box(x,10,2,2,10,10,palette.metal));
  for(let y=10;y<23;y+=4)parts.push(box(10,y,12,w-20,3,2,palette.wood));
  obstacles.push(volume(10,10,0,w-20,16,15));
  parts.push(box(w-24,5,22,15,1,19,'#eee9d6'));
  for(let z=25;z<38;z+=3)parts.push(line([[w-22,6.2,z],[w-12,6.2,z]],palette.metal));
  parts.push(box(w-5,d+6,0,2,2,h+7,palette.metal),box(w-12,d+5,h-2,16,3,12,a.material),sign([w-10,d+8.2,h+6],'BUS',4));
  obstacles.push(volume(w-5,d+6,0,2,2,h+7),volume(w-12,d+5,h-2,16,3,12));
  return {parts,obstacles,clearances:[volume(w*.3,d*.5,0,w*.4,d*.5+22,30)],ports:{waiting:port([w/2,d*.65,3]),boarding:port([w/2,d+22,3])},walkable:true};
}

function rack(a) {
  const {w,d}=a,parts=[{...box(0,0,0,w,d,1,palette.stone),ground:true}],obstacles=[];
  const count=a.options?.bays??3,step=w/count;
  for(let i=0;i<count;i++) {
    const x=step*(i+.5);
    parts.push(box(x-1,3,1,2,d-6,1,palette.metal),box(x-1,4,1,2,2,19,a.material),box(x-1,d-6,1,2,2,19,a.material),box(x-1,4,19,2,d-8,2,a.material,1));
    obstacles.push(volume(x-2,3,0,4,d-6,22));
  }
  return {parts,obstacles,clearances:[volume(0,d,0,w,24,28)],ports:{parking:port([w/2,d+15,3])}};
}

function charger(a) {
  const {w,d}=a,parts=[{...box(0,0,0,w,d,1,'#bbc3b5'),ground:true}];
  parts.push(box(4,5,1,17,11,35,a.material,2),box(6,16,22,13,1,10,palette.glass),box(8,17,25,9,.5,1,'#e7efce'),box(8,17,9,9,1,8,palette.metal));
  parts.push(line([[21,11,29],[29,11,24],[29,20,7],[21,23,7],[21,17,20]],'#58665f',1.6));
  for(const x of [4,w-4])parts.push(line([[x,30,1.2],[x,d-5,1.2]],'#eeebd9',1.4));
  parts.push(line([[4,d-5,1.2],[w-4,d-5,1.2]],'#eeebd9',1.4));
  parts.push(line([[w/2+4,42,1.4],[w/2-4,53,1.4],[w/2+3,53,1.4],[w/2-4,64,1.4]],'#e7ead1',2));
  return {parts,obstacles:[volume(3,4,0,28,24,37)],clearances:[volume(0,30,0,w,d-30,34)],ports:{vehicle:port([w/2,d*.7,3]),power:port([12,5,8],[0,-1,0])},walkable:true};
}

function planting(a) {
  const {w,d}=a,parts=[{...box(0,0,0,w,d,4,palette.wood),ground:true},{...box(3,3,4,w-6,d-6,1,'#8b9173'),ground:true}];
  for(let x=12;x<w-6;x+=19)for(let y=12;y<d-6;y+=18) {
    parts.push(cylinder(x,y,5,5,5,a.material),cylinder(x+3,y-2,9,3,4,palette.leaf));
    if((x+y)%3===0)parts.push(cylinder(x,y,14,1.7,1.5,'#d8bb92'));
  }
  return {parts,obstacles:[volume(0,0,0,w,d,16)],clearances:[],ports:{edge:port([w/2,d,3])}};
}

function tree(a) {
  const {w,d,h}=a,cx=w/2,cy=d/2,parts=[cylinder(cx,cy,0,2.5,h*.68,palette.wood)];
  const crown=a.options?.crown??'round';
  for(const [dx,dy,z,r] of [[-w*.16,0,.57,.24],[w*.16,0,.63,.25],[0,-d*.14,.72,.24],[0,d*.12,.78,.23],[0,0,.87,.18]]) {
    parts.push(cylinder(cx+dx,cy+dy,h*z,Math.min(w,d)*r,crown==='column'?h*.16:h*.09,a.material));
  }
  return {parts,obstacles:[volume(cx-2.5,cy-2.5,0,5,5,h*.7),unionBounds(parts.slice(1))],clearances:[],ports:{shade:port([cx+w*.3,cy,3],[1,0,0])},walkable:true};
}

function fence(a) {
  const {w,d,h}=a,points=a.options?.path??[[0,d/2],[w,d/2]],gate=a.options?.gate,parts=[],obstacles=[];
  for(let i=1;i<points.length;i++) {
    const [x,y]=points[i-1],[tx,ty]=points[i],len=Math.abs(tx-x)+Math.abs(ty-y),dx=(tx-x)/len,dy=(ty-y)/len;
    const intervals=gate?.segment===i-1?[[0,gate.offset],[gate.offset+gate.width,len]]:[[0,len]];
    for(const [start,end] of intervals) {
      if(end===start)continue;
      const x0=x+dx*start,y0=y+dy*start,x1=x+dx*end,y1=y+dy*end;
      const b=volume(Math.min(x0,x1)-1.5,Math.min(y0,y1)-1.5,0,Math.abs(x1-x0)+3,Math.abs(y1-y0)+3,h);
      obstacles.push(b);
      for(const z of [h*.35,h*.75])parts.push(box(b.x,b.y,z,b.w,b.d,2,a.material));
      const n=Math.ceil((end-start)/18);
      for(let j=0;j<=n;j++)parts.push(box(x0+(x1-x0)*j/n-1.5,y0+(y1-y0)*j/n-1.5,0,3,3,h,a.material));
    }
  }
  const ports={};
  const clearances=[];
  if(gate) {
    const [x,y]=points[gate.segment],[tx,ty]=points[gate.segment+1],len=Math.abs(tx-x)+Math.abs(ty-y),dx=(tx-x)/len,dy=(ty-y)/len;
    const at=[x+dx*(gate.offset+gate.width/2),y+dy*(gate.offset+gate.width/2),3];
    ports.gate=port(at,[-dy,dx,0]);
    clearances.push(volume(at[0]-(dx?gate.width/2:12),at[1]-(dy?gate.width/2:12),0,dx?gate.width:24,dy?gate.width:24,h));
  }
  return {parts,obstacles,clearances,ports};
}

export const outdoorRecipes={
  'corner-shop':{dimensions:[130,85,65],build:shop},
  'bus-shelter':{dimensions:[110,55,52],build:shelter},
  'bike-rack':{dimensions:[66,28,22],build:rack},
  'charging-bay':{dimensions:[64,110,37],build:charger},
  'planting-bed':{dimensions:[120,70,16],build:planting},
  'canopy-tree':{dimensions:[58,58,75],build:tree},
  fence:{dimensions:[180,8,28],build:fence}
};
export const outdoorDimensions=Object.fromEntries(Object.entries(outdoorRecipes).map(([name,r])=>[name,r.dimensions]));
export const isOutdoor=a=>Object.hasOwn(outdoorRecipes,a.asset??a.type);
export function outdoorInstance(a) {
  const asset=a.asset??a.type,[w,d,h]=outdoorDimensions[asset];
  return {w,d,h,material:palette.metal,...a,asset};
}

export function validateOutdoor(input) {
  const a=outdoorInstance(input);validateTransform(a);
  assert(['x','y','w','d','h'].every(key=>Number.isFinite(a[key])),'Invalid outdoor geometry');
  const defaults=outdoorDimensions[a.asset];
  assert(a.w>=defaults[0]&&a.d>=defaults[1]&&a.h===defaults[2],'Outdoor dimensions must meet the recipe minimum; height is fixed');
  assert(/^#[a-fA-F0-9]{6}$/.test(a.material),'Invalid outdoor material');
  assert(a.sign===undefined || typeof a.sign==='string','Invalid outdoor sign');
  if(a.asset==='corner-shop')assert(a.sign===undefined || a.sign.length<=24,'Outdoor sign must be at most 24 characters');
  const options=a.options??{};
  assert(options&&typeof options==='object'&&!Array.isArray(options),'Invalid outdoor options');
  const allowed=({'bike-rack':['bays'],'canopy-tree':['crown'],fence:['path','gate']})[a.asset]??[];
  assert(Object.keys(options).every(key=>allowed.includes(key)),'Unknown outdoor option');
  if(options.bays!==undefined)assert(Number.isInteger(options.bays)&&options.bays>=1&&options.bays<=Math.floor(a.w/18),'Rack bays must have at least 18 units each');
  if(options.crown!==undefined)assert(['round','column'].includes(options.crown),'Invalid tree crown');
  if(a.asset==='fence') {
    const points=options.path??[[0,a.d/2],[a.w,a.d/2]];
    assert(Array.isArray(points)&&points.length>=2&&points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=a.w&&p[1]>=0&&p[1]<=a.d),'Invalid fence path');
    for(let i=1;i<points.length;i++)assert((points[i][0]===points[i-1][0])!==(points[i][1]===points[i-1][1]),'Fence segments must be nonzero and axis aligned');
    if(options.gate!==undefined) {
      const g=options.gate;
      assert(g&&Number.isInteger(g.segment)&&g.segment>=0&&g.segment<points.length-1,'Invalid gate segment');
      const len=Math.abs(points[g.segment+1][0]-points[g.segment][0])+Math.abs(points[g.segment+1][1]-points[g.segment][1]);
      assert(Number.isFinite(g.offset)&&Number.isFinite(g.width)&&g.offset>=4&&g.width>=20&&g.offset+g.width<=len-4,'Invalid fence gate');
    }
  }
  return a;
}

export function outdoorGeometry(input) {
  const a=validateOutdoor(input),recipe=outdoorRecipes[a.asset].build(a);
  return {a,...recipe,bounds:unionBounds(recipe.parts.map(p=>worldBox(a,p))),obstacles:recipe.obstacles.map(b=>({...worldBox(a,b),entity:a.entity??`scenery ${a.type}`})),clearances:recipe.clearances.map(b=>worldBox(a,b))};
}

export function outdoorParts(input,D,P) {
  const {a,parts,walkable}=outdoorGeometry(input);
  const drawn=parts.map(p=>{
    const b=worldBox(a,p),at=[b.x+b.w/2,b.y+b.d/2,b.z+b.h/2];let svg='';
    if(p.kind==='box')svg=D.box(b.x,b.y,b.z,b.w,b.d,b.h,p.material,p.r);
    if(p.kind==='cylinder')svg=`<g style="--material:${p.material}">${k.solidSvg(k.cylinder(b.x+b.w/2,b.y+b.d/2,b.r,b.z,b.h,P,12),{tone:'mid'})}</g>`;
    if(p.kind==='line')svg=`<path d="${k.pathOf(p.points.map(point=>D.project(worldPoint(a,point))))}" fill="none" stroke="${p.material}" stroke-width="${p.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    if(p.kind==='sign') {
      const origin=worldPoint(a,p.at),edge=worldPoint(a,[p.at[0]+1,p.at[1],p.at[2]]),down=worldPoint(a,[p.at[0],p.at[1],p.at[2]-1]);
      const normal=worldPoint(a,[0,1,0]),zero=worldPoint(a,[0,0,0]),toward=k.towardViewer(P);
      if((normal[0]-zero[0])*toward[0]+(normal[1]-zero[1])*toward[1]>0) {
        const o=D.project(origin),u=D.project(edge).map((n,i)=>n-o[i]),v=D.project(down).map((n,i)=>n-o[i]);
        svg=`<text transform="matrix(${[...u,...v,...o]})" font-size="${p.size}" fill="#f0ecd9">${escape(p.text)}</text>`;
      }
    }
    return {svg,at,bounds:b,ground:p.ground};
  });
  const floor=drawn.filter(p=>p.ground).map(p=>p.svg).join('');
  const contents=paintOrder(drawn.filter(p=>!p.ground),P).map(p=>`<g data-depth="${k.depthOf(p.at,P)}">${p.svg}</g>`).join('');
  const f=footprint(a);
  return {floor,body:walkable?`<g data-interior="${escape(a.entity??a.asset)}" data-region="${[f.x,f.y,f.w,f.d]}">${contents}</g>`:contents};
}

// A roof and its fittings need volume ordering, not just their centre depths.
function paintOrder(parts,P) {
  const before=(a,b)=>a.x+a.w<=b.x||a.y+a.d<=b.y||a.z+a.h<=b.z;
  const pending=[...parts].sort((a,b)=>k.depthOf(a.at,P)-k.depthOf(b.at,P)),result=[];
  const predecessors=new Map(pending.map(a=>[a,new Set(pending.filter(b=>a!==b&&before(b.bounds,a.bounds)&&!before(a.bounds,b.bounds)))]));
  while(pending.length) {
    const index=pending.findIndex(a=>predecessors.get(a).size===0);
    // shortcut: cyclic occlusion falls back to depth; split intersecting solids when adding such recipes.
    const [next]=pending.splice(Math.max(0,index),1);result.push(next);
    for(const remaining of pending)predecessors.get(remaining).delete(next);
  }
  return result;
}
