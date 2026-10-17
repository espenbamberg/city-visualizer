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
  story.steps.forEach((step,i)=>assert.deepEqual(actorPath(story,placements,i,scene),scene.routes.find(r=>r.relation===step.state.via).points));
}
const stop=scene.instances.find(a=>a.entity==='stop');
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
for(const options of [{bays:0},{bays:5},{bays:2.5}])assert.throws(()=>validateOutdoor(fixture('bike-rack',{options})));
for(const options of [{path:[[0,0],[10,10]]},{path:[[0,0],[0,0]]},{gate:{segment:3,offset:10,width:30}},{gate:{segment:0,offset:170,width:30}}])assert.throws(()=>validateOutdoor(fixture('fence',{options})));
assert.throws(()=>portPoint({id:'missing',entity:'stop',socket:'missing'},[stop]),/Unknown socket/);
const injected=drawing(P).asset(fixture('corner-shop',{sign:'<svg onload="x">'}));assert(!injected.includes('<svg onload'));
const stale=structuredClone(scene);stale.instances.find(a=>a.entity==='shade').x+=2;
assert.throws(()=>validate(issue,stale),/Stale port/);compileNetwork(issue,stale);
assert.notDeepEqual(stale.routes,scene.routes);

const temp=await mkdtemp(join(tmpdir(),'city-spatial-'));
try {
  for(const [name,value] of Object.entries({issue,layout,scene}))await writeFile(join(temp,`${name}.json`),JSON.stringify(value));
  const build=fileURLToPath(new URL('./build.mjs',import.meta.url));
  const run=()=>spawnSync(process.execPath,[build,temp,join(temp,'output')],{encoding:'utf8'});
  let result=run();assert.equal(result.status,0,result.stderr);
  const html=await readFile(join(temp,'output/index.html'),'utf8');
  const bad=structuredClone(scene);bad.instances[0].rotation=45;await writeFile(join(temp,'scene.json'),JSON.stringify(bad));
  result=run();assert.notEqual(result.status,0);
  assert.equal(await readFile(join(temp,'output/index.html'),'utf8'),html,'Invalid spatial data preserves the previous build');
} finally {await rm(temp,{recursive:true,force:true});}
console.log('Passed: spatial recipes at four orientations, named/four-sided ports, canopy/roof height clearance, gate widths, reserved bays, relative/repeated placement, shared scenery, per-port actor starts and safe offline builds.');
