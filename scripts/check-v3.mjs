import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {v3Example,v3ScaleExample} from '../examples/v3-example.mjs';
import {v2Example} from '../examples/v2-example.mjs';
import {sizeVariants,dimensions} from '../kit/sizing.mjs';
import {composeScene} from '../kit/compose.mjs';
import {composeLocal} from '../kit/compose-local.mjs';
import {packPlots} from '../kit/compose-variable.mjs';
import {validate,actorPath,actorAt} from '../kit/model.mjs';
import {renderMap} from '../kit/render.mjs';
import {drawing} from '../kit/assets.mjs';

const overlap=(a,b)=>a.x<b.x+b.w && b.x<a.x+a.w && a.y<b.y+b.d && b.y<a.y+a.d;
const original=v2Example(),bundle=v3Example();
for(const [id,view] of Object.entries(bundle.views)) {
  const expected=structuredClone(original.views[id].issue);
  if(view.layout?.rows)for(const s of expected.scenarios)if(s.actor?.kind==='person')s.actor.identity=original.views[id].scene.scenarioLayouts.find(l=>l.scenario===s.id).actor.identity;
  assert.deepEqual(view.issue,expected,'V3 preserves the story and explicitly carries over the same people');
}
assert.throws(()=>dimensions({asset:'car',size:'compact'}),/Unsupported/);
assert.throws(()=>dimensions({asset:'office',emphasis:'largest'}),/Invalid emphasis/);
assert.throws(()=>dimensions({asset:'office',size:'expanded',height:120}),/size or/);
assert.throws(()=>dimensions({asset:'desk',height:90}),/office height/);
const old=original.views.city.scene.instances.find(a=>a.entity==='van'),vehicle=bundle.views.city.scene.instances.find(a=>a.entity==='van');
assert.deepEqual([vehicle.w,vehicle.d,vehicle.h],[old.w,old.d,old.h],'A low-priority vehicle keeps its physical size');
const widths=()=>packPlots([{entity:'a',asset:'workshop',size:'expanded'},{entity:'b',asset:'terminal',size:'compact'},{entity:'c',asset:'van'}]);
const packed=widths();assert.deepEqual(widths(),packed,'Stable packing');
const packedItems=packed.rows.flatMap(r=>r.items);
assert(new Set(packedItems.map(a=>a.plotWidth)).size>1,'Small parcels share a readability minimum, not the biggest width');
assert(packedItems.find(a=>a.entity==='b').plotWidth<packedItems.find(a=>a.entity==='a').plotWidth/2,'A small parcel does not inherit the biggest width');

for(const fixture of [bundle,v3ScaleExample()])for(const [id,{issue,scene,layout}] of Object.entries(fixture.views)) {
  assert.equal(validate(issue,scene),true);
  if(!layout)continue;
  const recreated=layout.rows?composeLocal(issue,layout):composeScene(issue,layout);
  assert.deepEqual(recreated.instances,scene.instances,'Saved geometry is reproducible');
  for(const a of scene.instances)for(const b of scene.instances)if(a!==b)assert(!overlap(a,b),`${id}: no object overlap`);
  for(const r of scene.routes)for(let i=1;i<r.points.length;i++)for(let t=.02;t<1;t+=.02) {
    const p=r.points[i].map((v,j)=>r.points[i-1][j]+t*(v-r.points[i-1][j]));
    for(const a of scene.instances)assert(!(p[0]>a.x-2 && p[0]<a.x+a.w+2 && p[1]>a.y-2 && p[1]<a.y+a.d+2 && p[2]<a.h+7),`${id}/${r.relation}: travel clears ${a.entity}`);
    if(id==='city' && p[2]<10)assert(scene.ground.some(g=>g.type==='box' && ['#adb2a7','#ddd8c2'].includes(g.material) && p[0]>=g.x-1 && p[0]<=g.x+g.w+1 && p[1]>=g.y-1 && p[1]<=g.y+g.d+1),'Ground routes stay on roads or footpaths');
  }
  for(const s of issue.scenarios.filter(s=>s.actor)) {
    const l=scene.scenarioLayouts.find(l=>l.scenario===s.id);
    s.steps.forEach((step,i)=>{
      const path=actorPath(s,l,i,scene),kind=actorAt(s,i).kind;
      assert.deepEqual(path,scene.routes.find(r=>r.relation===step.state.via).points);
      if(id==='city' && ['person','bicycle','car','van'].includes(kind))for(let j=1;j<path.length;j++)for(let t=0;t<=1;t+=.05) {
        const p=path[j].map((v,k)=>path[j-1][k]+t*(v-path[j-1][k]));
        const material=['car','van'].includes(kind)?'#adb2a7':'#ddd8c2';
        assert(scene.ground.some(g=>g.type==='box' && g.material===material && p[0]>=g.x-1 && p[0]<=g.x+g.w+1 && p[1]>=g.y-1 && p[1]<=g.y+g.d+1),`${kind} stays on its own road or shared foot/cycle path`);
      }
    });
  }
  if(id==='city') {
    const roads=scene.ground.filter(g=>g.type==='box' && g.material==='#adb2a7' && !(g.w===90 && g.d===60));
    const connected=new Set([roads[0]]);
    for(let n=0;n<roads.length;n++)for(const a of roads)if([...connected].some(b=>overlap(a,b)))connected.add(a);
    assert.equal(connected.size,roads.length,'All streets and driveways share one connected road network; aircraft aprons use air access');
    const flight=scene.routes.find(r=>r.relation==='air').points;
    assert(flight.some(p=>p[2]===120),'The scale city keeps its flight corridor, not a flight along streets');
  }
  const svg=renderMap(issue,scene);assert.equal(svg,renderMap(issue,scene));
  assert(!svg.includes('NaN'));
}
for(const [asset,variants] of Object.entries(sizeVariants)) {
  const nodes=[];
  for(const [size,[w,d,h]] of Object.entries(variants)) {
    const a={id:'sample',entity:'sample',asset,size,x:0,y:0,w,d,h,material:'#b1bca4'};
    const svg=drawing({origin:[0,0],scale:1,azimuth:45,elevation:34},1).asset(a);
    assert(!/NaN|undefined/.test(svg),'Sized parts have finite geometry');nodes.push((svg.match(/<path/g)||[]).length);
  }
  if(['workshop','park','shelf','queue','tester'].includes(asset))assert(nodes[2]>nodes[0],'Larger recipes have additional purposeful parts');
}
const bad=structuredClone(bundle.views.workshop.scene);bad.instances[0].w++;
assert.throws(()=>validate(bundle.views.workshop.issue,bad),/declared asset size/);
const changed=structuredClone(bundle.views.workshop.layout);changed.rows[0][1].size='compact';
const compact=composeLocal(bundle.views.workshop.issue,changed);
assert.notDeepEqual(compact.routes,bundle.views.workshop.scene.routes,'Resizing recalculates paths and endpoints');
assert.notDeepEqual(compact.scenarioLayouts,bundle.views.workshop.scene.scenarioLayouts,'Resizing recalculates story markers');

const temp=await mkdtemp(join(tmpdir(),'city-v3-'));
try {
  const view=bundle.views.workshop;
  await writeFile(join(temp,'issue.json'),JSON.stringify(view.issue));await writeFile(join(temp,'layout.json'),JSON.stringify(view.layout));
  const script=fileURLToPath(new URL('./compose.mjs',import.meta.url)),output=join(temp,'scene.json');
  const run=()=>spawnSync(process.execPath,[script,temp,output],{encoding:'utf8'});
  assert.equal(run().status,0);const saved=await readFile(output,'utf8');
  assert.deepEqual(JSON.parse(saved),view.scene,'Local composition CLI uses the same validated geometry');
  const invalid=structuredClone(view.layout);invalid.rows[0][0].size='giant';
  await writeFile(join(temp,'layout.json'),JSON.stringify(invalid));assert.notEqual(run().status,0);
  assert.equal(await readFile(output,'utf8'),saved,'Invalid sizes preserve the previous scene');
} finally {await rm(temp,{recursive:true,force:true});}
console.log('Passed: V3 variable parcels, supported sizes, purposeful parts, 30-place packing, road/footpath clearance, rebuilt endpoints, stable vehicle scale, local CLI and old-story preservation.');
