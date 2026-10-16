import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {smallExample,largeExample} from '../examples/city-examples.mjs';
import {composeScene} from '../kit/compose.mjs';
import {personProfile} from '../kit/people.mjs';
import {actorPath,resolvedScene,validate} from '../kit/model.mjs';
import {renderMap} from '../kit/render.mjs';

const people=Array.from({length:60},(_,i)=>personProfile(`cast:${i}`));
assert.equal(new Set(people.map(p=>p.gender)).size,3);
assert.equal(new Set(people.map(p=>p.skin)).size,5);
assert.equal(new Set(people.map(p=>p.hairstyle)).size,5);
assert.deepEqual(personProfile('reader'),personProfile('reader'));
assert.notDeepEqual(personProfile('reader'),personProfile('other-reader'));
assert.equal(personProfile('reader',{gender:'woman',hairstyle:'bun'}).hairstyle,'bun');

for (const example of [smallExample(),largeExample()]) {
  const start=performance.now(),scene=composeScene(example.issue,example.layout);
  assert.equal(validate(example.issue,scene),true);
  assert.deepEqual(composeScene(example.issue,example.layout),scene,'Composition is reproducible from saved seed');
  assert.equal(scene.instances.length,example.id==='reading-day'?5:38);
  assert.equal(example.issue.entities.filter(e=>e.kind==='place').length,example.id==='reading-day'?5:30);
  assert.equal(example.issue.entities.filter(e=>e.kind!=='place').length,example.id==='reading-day'?0:8);
  for (const a of scene.instances) for (const b of scene.instances) if(a!==b) assert(a.x+a.w<=b.x || b.x+b.w<=a.x || a.y+a.d<=b.y || b.y+b.d<=a.y,'Plots never overlap');
  for (const scenario of example.issue.scenarios.filter(s=>s.actor)) {
    const layout=scene.scenarioLayouts.find(l=>l.scenario===scenario.id);
    scenario.steps.forEach((step,i)=>assert.deepEqual(actorPath(scenario,layout,i,scene),scene.routes.find(r=>r.relation===step.state.via).points,'Walking uses the route itself'));
  }
  const svg=renderMap(example.issue,scene);
  assert.equal(svg,renderMap(example.issue,scene),'Geometry and people stay deterministic');
  assert(Number(svg.match(/data-projection-scale="([^"]+)/)[1])>0);
  const bad=structuredClone(example.layout);bad.districts[0].plots[0].entity='missing';
  assert.throws(()=>composeScene(example.issue,bad),/Unknown/);
  const badPerson=structuredClone(scene);badPerson.scenery.find(s=>s.type==='person').appearance={gender:'<script>'};
  assert.throws(()=>validate(example.issue,badPerson),/appearance gender/);
  console.log(`${example.id}: ${scene.instances.length} objects, ${scene.routes.length} routes, ${(svg.length/1024).toFixed(0)} KB SVG, ${(performance.now()-start).toFixed(0)} ms composition and two renders`);
}

const root=new URL('../examples/heat-exposure/',import.meta.url);
const issue=JSON.parse(await readFile(new URL('issue.json',root),'utf8')),scene=JSON.parse(await readFile(new URL('scene.json',root),'utf8'));
const resolved=resolvedScene(issue,scene);
assert.deepEqual(resolved.scenarioLayouts[1].steps[0].path,scene.routes.find(r=>r.relation==='reach-room').points.slice(0,7),'Closed-room travel ends outside on the shared route');
const conflict=structuredClone(scene);conflict.scenarioLayouts[0].steps[0].path=[[0,0,0],[1,1,1]];
assert.throws(()=>validate(issue,conflict),/differs from visible route/);
const legacy=structuredClone(resolved);
legacy.scenarioLayouts[1].steps[0].routeEnd=undefined;
legacy.routes=legacy.routes.map(r=>r.points?{relation:r.relation,via:[]}:r);
assert.equal(validate(issue,legacy),true,'Existing independent walking inputs still load');
assert(renderMap(issue,legacy).includes('data-walk-path='),'Legacy active line is compiled from the actual walking path');

const temp=await mkdtemp(join(tmpdir(),'city-compose-'));
try {
  const example=smallExample();delete example.layout.seed;
  await writeFile(join(temp,'issue.json'),JSON.stringify(example.issue));
  await writeFile(join(temp,'layout.json'),JSON.stringify(example.layout));
  const output=join(temp,'scene.json'), script=fileURLToPath(new URL('./compose.mjs',import.meta.url));
  const run=()=>spawnSync(process.execPath,[script,temp,output],{encoding:'utf8'});
  assert.equal(run().status,0);
  const first=await readFile(output,'utf8');
  assert(Number.isInteger(JSON.parse(first).seed),'CLI saves its random seed in generated scene data');
  example.layout.districts[0].plots[0].asset='raw-svg';
  await writeFile(join(temp,'layout.json'),JSON.stringify(example.layout));
  assert.notEqual(run().status,0);
  assert.equal(await readFile(output,'utf8'),first,'Bad layout never overwrites an existing scene');
} finally {await rm(temp,{recursive:true,force:true});}
console.log('Passed: shared walking geometry, legacy inputs, deterministic varied people, 5/30-place composition, separate technical scope and safe compose CLI.');
