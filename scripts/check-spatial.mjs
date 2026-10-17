import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {mobilityHub} from '../examples/mobility-hub.mjs';
import {validate,actorPath} from '../kit/model.mjs';
import {renderMap} from '../kit/render.mjs';
import {composeGroups} from '../kit/compose-groups.mjs';
import {keepStationaryActors} from '../kit/compose-helpers.mjs';
import {portPoint,networkIndex,obstructed,compileNetwork} from '../kit/network.mjs';
import {outdoorDimensions,outdoorGeometry,validateOutdoor} from '../kit/outdoor-assets.mjs';
import {objectBounds,validateClearances} from '../kit/object-geometry.mjs';
import {relativePosition,placeScenery} from '../kit/spatial-layout.mjs';
import {worldPoint,worldBox} from '../kit/spatial.mjs';
import {drawing} from '../kit/assets.mjs';
import * as k from '../kit/anatomy/iso-kit.mjs';

const {issue,layout,scene}=mobilityHub();
assert(validate(issue,scene));
assert.deepEqual(composeGroups(issue,layout),scene,'Composition is deterministic');
assert.equal(renderMap(issue,scene),renderMap(issue,scene));
for(const story of issue.scenarios) {
  const placements=scene.scenarioLayouts.find(l=>l.scenario===story.id);
  assert.deepEqual(placements.actor.at,scene.routes.find(r=>r.relation===story.steps[0].state.via).points[0],'Each story starts at its own named port');
  story.steps.forEach((step,i)=>assert.deepEqual(actorPath(story,placements,i,scene),step.state.via?scene.routes.find(r=>r.relation===step.state.via).points:[actorPath(story,placements,i-1,scene).at(-1)]));
}
const stop=scene.instances.find(a=>a.entity==='stop');
const namedIssue=structuredClone(issue),namedLayout=structuredClone(layout);
for(const id of ['racks','stop','shop']) {
  namedIssue.entities.find(e=>e.id===id).label=`Neighbourhood ${id} with a descriptive name`;
  const plot=namedLayout.groups[0].plots.find(p=>p.entity===id);delete plot.sign;delete plot.labelStyle;
}
let namedScene=composeGroups(namedIssue,namedLayout);
for(const id of ['racks','stop','shop']) {
  const instance=namedScene.instances.find(a=>a.entity===id);
  assert.equal(instance.sign,undefined,'Entity labels do not become physical signs');
  assert.equal(instance.labelStyle.lines.join(' '),namedIssue.entities.find(e=>e.id===id).label);
}
namedLayout.groups[0].plots[0].sign='LOCAL & <SHOP>';
namedScene=composeGroups(namedIssue,namedLayout);
assert(renderMap(namedIssue,namedScene).includes('LOCAL &amp; &lt;SHOP&gt;'),'Explicit shop signs are escaped independently');
namedLayout.groups[0].plots[0].sign='x'.repeat(25);
assert.throws(()=>composeGroups(namedIssue,namedLayout),/sign must be at most 24/);
assert.deepEqual(portPoint({id:'wait',entity:'stop',socket:'waiting'},[stop]),[455.75,125,3]);
assert.deepEqual(worldPoint({x:10,y:20,w:100,d:40,rotation:90,z:8},[20,10,3]),[40,40,11]);
assert.deepEqual(worldBox({x:10,y:20,w:100,d:40,rotation:90},{x:20,y:10,z:3,w:30,d:8,h:5}),{x:32,y:40,z:3,w:8,d:30,h:5});
const plain={entity:'test',x:10,y:20,w:100,d:40,h:20};
for(const [side,expected] of [['front',[60,70,3]],['right',[120,40,3]],['back',[60,10,3]],['left',[0,40,3]]])assert.deepEqual(portPoint({id:'door',entity:'test',side,position:.5,offset:10},[plain]),expected);

const P=k.fitProjection([[0,0,0],[400,400,200]],500,400,{pad:20});
for(const [asset,[w,d,h]] of Object.entries(outdoorDimensions))for(const rotation of [0,90,180,270]) {
  const a={id:'sample',entity:'sample',asset,x:40,y:50,w,d,h,rotation,material:'#91a67e'};
  validateOutdoor(a);
  const geometry=outdoorGeometry(a),b=objectBounds(a);
  assert(geometry.obstacles.every(o=>[o.x,o.y,o.z,o.w,o.d,o.h].every(Number.isFinite)));
  const D=drawing(P,3),svg=D.asset(a),scenery=D.scenery({...a,asset:undefined,type:asset});
  assert(svg&&!/NaN|Infinity|undefined/.test(svg));
  assert.equal(svg,scenery,'Entity and scenery share one recipe');
  assert(b.w>0&&b.d>0&&b.h>0);
  for(const name of Object.keys(geometry.ports))assert(portPoint({id:'port',entity:'sample',socket:name},[a]).every(Number.isFinite));
}

const fixture=(asset,extra={})=>({id:asset,entity:asset,asset,x:0,y:0,...Object.fromEntries(['w','d','h'].map((key,i)=>[key,outdoorDimensions[asset][i]])),material:'#91a67e',...extra});
const pathNetwork=(from,to,width=16)=>({nodes:[{id:'a',at:from},{id:'b',at:to}],ports:[],edges:[{id:'walk',from:'a',to:'b',width,surface:'path',modes:['person']}]});
const shelter=fixture('bus-shelter');
for(const rotation of [0,90,180,270]) {
  const rotated={...shelter,rotation};
  assert.doesNotThrow(()=>networkIndex(pathNetwork(worldPoint(rotated,[55,85,3]),worldPoint(rotated,[55,35,3])),[rotated]),`Shelter access rotates with its geometry: ${rotation}`);
  assert.throws(()=>networkIndex(pathNetwork(worldPoint(rotated,[55,85,3]),worldPoint(rotated,[55,15,3])),[rotated]),/collides/,`Bench clearance rotates too: ${rotation}`);
}
assert.doesNotThrow(()=>networkIndex(pathNetwork([55,85,3],[55,35,3]),[shelter]),'A person enters beneath the roof');
assert.throws(()=>networkIndex(pathNetwork([55,85,3],[55,15,3]),[shelter]),/collides/,'The bench remains solid');
assert.throws(()=>networkIndex(pathNetwork([55,85,30],[55,35,30]),[shelter]),/collides/,'Actor height must clear the roof');
const tree=fixture('canopy-tree');
assert.doesNotThrow(()=>networkIndex(pathNetwork([48,0,3],[48,58,3]),[tree]),'Walk beneath the canopy edge');
assert.throws(()=>networkIndex(pathNetwork([29,0,3],[29,58,3]),[tree]),/collides/,'The trunk blocks the corridor');
const fence=fixture('fence',{options:{gate:{segment:0,offset:65,width:40}}});
assert.doesNotThrow(()=>networkIndex(pathNetwork([85,-20,3],[85,28,3]),[fence]),'The gate is a real opening');
assert.throws(()=>networkIndex(pathNetwork([40,-20,3],[40,28,3]),[fence]),/collides/,'The rails block passage');
assert.throws(()=>networkIndex(pathNetwork([85,-20,3],[85,28,3],44),[fence]),/collides/,'A wide corridor cannot fit through a narrow gate');
const charger=fixture('charging-bay');
assert.throws(()=>validateClearances({instances:[charger,fixture('canopy-tree',{x:0,y:35})],scenery:[]}),/Reserved access/,'Decorations cannot occupy a vehicle bay');
assert(!obstructed([0,0,3],[30,0,3],{x:10,y:-5,z:40,w:10,d:10,h:5},5,25));
assert(obstructed([0,0,3],[30,0,3],{x:10,y:-5,z:24,w:10,d:10,h:5},5,25));

assert.deepEqual(relativePosition({...fixture('bike-rack'),x:undefined,y:undefined,rotation:90,beside:{entity:'charging-bay',side:'right',gap:12,align:'start'}},[charger]),[76,0]);
const repeated=placeScenery([{type:'bike-rack',x:10,y:20,repeat:{count:3,step:[90,0]}}],[]);
assert.deepEqual(repeated.map(a=>a.x),[10,100,190]);
assert.throws(()=>placeScenery([{type:'bike-rack',x:10,y:20,repeat:{count:3,step:[0,0]}}],[]),/spacing/);
for(const bad of [{rotation:45},{z:NaN},{w:3},{h:1000},{options:{unknown:true}},{sign:'x'.repeat(25)}])assert.throws(()=>validateOutdoor({...fixture('corner-shop'),...bad}));
assert.throws(()=>outdoorGeometry(fixture('corner-shop',{w:Infinity})),/Invalid outdoor geometry/,'Direct geometry callers validate before recipe loops');
for(const options of [{bays:0},{bays:5},{bays:2.5}])assert.throws(()=>validateOutdoor(fixture('bike-rack',{options})));
for(const options of [{path:[[0,0],[10,10]]},{path:[[0,0],[0,0]]},{gate:{segment:3,offset:10,width:30}},{gate:{segment:0,offset:170,width:30}}])assert.throws(()=>validateOutdoor(fixture('fence',{options})));
assert.throws(()=>portPoint({id:'missing',entity:'stop',socket:'missing'},[stop]),/Unknown socket/);
const injected=drawing(P).asset(fixture('corner-shop',{sign:'<svg onload="x">'}));assert(!injected.includes('<svg onload'));
const stale=structuredClone(scene);stale.instances.find(a=>a.entity==='shade').x+=2;
assert.throws(()=>validate(issue,stale),/Stale port/);compileNetwork(issue,stale);
assert.notDeepEqual(stale.routes,scene.routes);

for(const environment of ['campus',undefined])for(const boardingFirst of [true,false]) {
  const input=structuredClone({issue,layout}),story=input.issue.scenarios[0];
  story.steps=story.steps.slice(0,1);
  input.layout.environment=environment;
  const boarding=input.layout.network.ports.find(p=>p.socket==='boarding');
  input.layout.network.ports=input.layout.network.ports.filter(p=>p!==boarding);
  input.layout.network.ports[boardingFirst?'unshift':'push'](boarding);
  const wait={title:'Wait',text:'Keep waiting under cover.',relations:['walk-stop'],state:{at:'stop',caption:'Still waiting.'}};
  story.steps.push(structuredClone(wait),structuredClone(wait));
  input.issue.relationships.push({...input.issue.relationships[0],id:'return-shop',from:'stop',to:'shop'});
  input.layout.routes.push({relation:'return-shop',network:{from:'stop-entry',to:'shop-entry',mode:'person'}});
  story.steps.push({title:'Return',text:'Walk back.',relations:['return-shop'],state:{at:'shop',via:'return-shop',moving:'Walking back',caption:'Back at the shop.'}});
  const composed=composeGroups(input.issue,input.layout),placements=composed.scenarioLayouts[0];
  const arrival=actorPath(story,placements,0,composed).at(-1);
  for(const i of [1,2])assert.deepEqual(placements.steps[i].path,[arrival],'Waiting keeps the arrival port regardless of port order or environment');
  assert.deepEqual(actorPath(story,placements,3,composed)[0],arrival,'Departure continues from the waiting position');
  const partial=structuredClone(placements);
  partial.steps[0].routeEnd=1;
  keepStationaryActors(story,partial,composed);
  assert.deepEqual(partial.steps[2].path,[actorPath(story,partial,0,composed).at(-1)],'Waiting respects truncated arrivals');
  story.steps[1].actor={kind:'person',label:'Another neighbour'};story.steps[1].handoff='Another person takes over.';
  partial.steps[1].path=[[10,20,3]];keepStationaryActors(story,partial,composed);
  assert.deepEqual(partial.steps[1].path,[[10,20,3]],'Explicit handoff keeps its authored position');
  story.steps[1].actor={kind:'document',label:'A message'};
  partial.steps[2].path=[[40,50,3]];keepStationaryActors(story,partial,composed);
  assert.deepEqual(partial.steps[2].path,[[40,50,3]],'Symbolic appearances retain their authored positions');
}
const larger=structuredClone(layout);Object.assign(larger.groups[0].plots.find(p=>p.entity==='racks'),{w:84,options:{bays:4}});
assert(validate(issue,composeGroups(issue,larger)),'Valid larger recipes still compose');

for(const name of ['heat-exposure','repair-service']) {
  const input=new URL(`../examples/${name}/`,import.meta.url);
  const issue=JSON.parse(await readFile(new URL('issue.json',input))),scene=JSON.parse(await readFile(new URL('scene.json',input)));
  assert(validate(issue,scene));
  scene.scenery.push({type:'canopy-tree',x:10000,y:10000});
  assert(validate(issue,scene),'Distant spatial scenery preserves legacy validation');
  if(name==='heat-exposure') {
    const route=scene.routes.find(r=>r.relation==='walk-school'),points=route.points;
    for(const s of issue.scenarios)if(s.actor) {
      const l=scene.scenarioLayouts.find(l=>l.scenario===s.id);
      s.steps.forEach((step,i)=>{if(step.state.via===route.relation){l.steps[i].path=actorPath(s,l,i,scene);delete l.steps[i].routeEnd;}});
    }
    delete route.points;route.via=[[10029,10029,3]];
    assert(validate(issue,scene),'Legacy actors follow their authored paths, not the relationship line');
    Object.assign(scene.scenery.at(-1),{x:(points[1][0]+points[2][0])/2-29,y:points[1][1]-29});
    assert.throws(()=>validate(issue,scene),/Route walk-school collides with scenery canopy-tree/,'New trunks still block actual walking paths');
  }
}

const temp=await mkdtemp(join(tmpdir(),'city-spatial-'));
try {
  for(const [name,value] of Object.entries({issue,layout,scene}))await writeFile(join(temp,`${name}.json`),JSON.stringify(value));
  const build=fileURLToPath(new URL('./build.mjs',import.meta.url));
  const run=()=>spawnSync(process.execPath,[build,temp,join(temp,'output')],{encoding:'utf8'});
  let result=run();assert.equal(result.status,0,result.stderr);
  const html=await readFile(join(temp,'output/index.html'),'utf8');
  const compose=fileURLToPath(new URL('./compose.mjs',import.meta.url)),saved=await readFile(join(temp,'scene.json'),'utf8');
  for(const [entity,change,message] of [
    ['shop',{w:Infinity},/Invalid outdoor geometry/],
    ['shop',{d:Infinity},/Invalid outdoor geometry/],
    ['shop',{rotation:45},/quarter turn/],
    ['shop',{z:-1},/elevation/],
    ['racks',{options:{bays:Infinity}},/Rack bays/]
  ]) {
    const bad=structuredClone(layout);Object.assign(bad.groups[0].plots.find(p=>p.entity===entity),change);
    if(change.d===Infinity)bad.groups[0].pattern='green';
    await writeFile(join(temp,'layout.json'),JSON.stringify(bad,(_,v)=>v===Infinity?'NONFINITE':v).replaceAll('"NONFINITE"','1e309'));
    const result=spawnSync(process.execPath,['--max-old-space-size=128',compose,temp,join(temp,'scene.json')],{encoding:'utf8',timeout:5000});
    assert.equal(result.error,undefined,result.stderr);assert.equal(result.signal,null,result.stderr);
    assert.equal(result.status,1,result.stderr);assert.match(result.stderr,message);
    assert.equal(await readFile(join(temp,'scene.json'),'utf8'),saved,'Invalid layout preserves the previous scene');
  }
  const bad=structuredClone(scene);bad.instances[0].rotation=45;await writeFile(join(temp,'scene.json'),JSON.stringify(bad));
  result=run();assert.notEqual(result.status,0);
  assert.equal(await readFile(join(temp,'output/index.html'),'utf8'),html,'Invalid spatial data preserves the previous build');
} finally {await rm(temp,{recursive:true,force:true});}
console.log('Passed: spatial rotations/ports/clearances, placement, long labels and escaped signs, legacy path compatibility, stationary multi-port continuity, bounded malformed-input rejection and safe offline builds.');
