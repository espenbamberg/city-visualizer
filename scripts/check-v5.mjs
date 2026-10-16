import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {landscapeExamples,buildingLayout} from '../examples/landscapes.mjs';
import {composeLandscape} from '../kit/compose-landscape.mjs';
import {roomWalls} from '../kit/rooms.mjs';
import {compileNetwork,obstructed} from '../kit/network.mjs';
import {validate} from '../kit/model.mjs';
import {renderMap} from '../kit/render.mjs';
import {loadViews} from '../kit/v2.mjs';

const examples=landscapeExamples(),building=examples.building.views.building;
for(const [name,b] of Object.entries(examples)) {
  const saved=await loadViews(fileURLToPath(new URL(`../examples/landscapes/${name}/`,import.meta.url)));
  for(const [id,v] of Object.entries(b.views)) {
    assert.deepEqual(saved.views[id].issue,v.issue);assert.deepEqual(saved.views[id].scene,v.scene);
    assert.equal(renderMap(v.issue,v.scene),renderMap(v.issue,v.scene),'Deterministic rendering');
    assert.equal(v.scene.environment,id);
    const recomposed=composeLandscape(v.issue,v.layout);
    assert.deepEqual(recomposed.routes,v.scene.routes,'Editing/building preserves the compiled journeys');
  }
}
const reject=(change,pattern)=>{const v=structuredClone(building);change(v);assert.throws(()=>validate(v.issue,v.scene),pattern);};
reject(v=>v.scene.environment='forest',/Unknown landscape/);
reject(v=>v.scene.rooms[0].door.open=false,/collides/);
reject(v=>v.scene.rooms[0].door.width=8,/collides/);
reject(v=>v.scene.rooms[0].door.offset=-1,/Invalid room door/);
reject(v=>v.scene.rooms[0].id='" onclick="bad',/room ID/);
reject(v=>v.scene.rooms[1].x=v.scene.rooms[0].x,/Overlapping rooms/);
reject(v=>v.scene.instances[0].room='missing',/Unknown instance room/);
reject(v=>v.scene.instances[0].x=-100,/Station exceeds room/);
reject(v=>v.scene.network.ports[0].z=-1,/Invalid port elevation/);
reject(v=>v.scene.network.setting='sea',/Invalid network setting/);
reject(v=>{v.scene.network.edges[0].width=4;},/Insufficient width/);
reject(v=>{const r=v.scene.routes[0];r.points=[r.points[0],r.points.at(-1)];},/collides/);
reject(v=>{const r=v.scene.routes[0];delete r.network;r.points=[r.points[0],r.points.at(-1)];},/collides/);
const walls=roomWalls(building.scene.rooms);
for(const r of building.scene.routes)for(let i=1;i<r.points.length;i++)for(const wall of walls)assert(!obstructed(r.points[i-1],r.points[i],wall,5),'Every actor clears walls');
const blocked=structuredClone(building.scene),edge=blocked.network.edges[0];
edge.points=[blocked.network.nodes.find(n=>n.id===edge.from).at,[blocked.instances[0].x+20,blocked.instances[0].y+20,4],blocked.network.nodes.find(n=>n.id===edge.to).at];
assert.throws(()=>compileNetwork(building.issue,blocked),/collides with intake/,'Equipment also blocks travel');
const svg=renderMap(building.issue,building.scene);
assert(svg.includes('data-room-wall=')&&svg.includes('network-floor-path')&&!svg.includes('network-entrance'),'Indoor paths share the floor');
assert(!renderMap(examples.technical.views.technical.issue,examples.technical.views.technical.scene).includes('network-road'),'Logical flow does not invent streets');
assert.throws(()=>composeLandscape(building.issue,{...building.layout,rows:[]}),/exactly one/);
assert.throws(()=>composeLandscape(building.issue,{...building.layout,environment:'city'}),/Incompatible/);
const closed=buildingLayout();closed.rooms[0].door.open=false;assert.throws(()=>composeLandscape(building.issue,closed),/collides/);
const narrow=buildingLayout();narrow.rooms[0].door.width=12;assert.throws(()=>composeLandscape(building.issue,narrow),/collides/);

// Alternative organizations share issue semantics, IDs and sources without inventing a second factual location.
const workspace=examples.workspace.views.workspace,alternate=composeLandscape(workspace.issue,buildingLayout());
validate(workspace.issue,alternate);
assert.notDeepEqual(alternate.routes,workspace.scene.routes);
assert.deepEqual(JSON.parse(await readFile(new URL('../examples/landscapes/workspace/comparison/scene.json',import.meta.url))),alternate);

// More rooms and a differently sized desk use the same authored corridor contract.
const bigger=structuredClone(building),template=bigger.issue.entities[0];
delete bigger.issue.entities[1].detailView;
for(let i=0;i<4;i++) {
  const id=`extra-${i}`;bigger.issue.entities.push({...template,id,label:`Ekstra ${i}`});
  bigger.layout.rooms.push({id,label:`Rom ${i}`,w:190,d:220,door:{offset:115,width:48},plots:[{entity:id,asset:'desk',size:'expanded'}]});
}
const large=composeLandscape(bigger.issue,bigger.layout);assert.equal(large.rooms.length,7);assert.equal(large.instances.length,7);
const localIssue=structuredClone(bigger.issue);for(const e of localIssue.entities)delete e.detailView;
const local=composeLandscape(localIssue,{environment:'workspace',seed:1,rows:[localIssue.entities.slice(0,4).map(e=>({entity:e.id,asset:'desk',size:'compact'})),localIssue.entities.slice(4).map(e=>({entity:e.id,asset:'desk',size:'expanded'}))]});
assert.equal(local.instances.length,7);

const scratch=await mkdtemp(join(tmpdir(),'city-v5-'));
try {
  await writeFile(join(scratch,'issue.json'),JSON.stringify(building.issue));
  await writeFile(join(scratch,'layout.json'),JSON.stringify(building.layout));
  const cli=fileURLToPath(new URL('./compose.mjs',import.meta.url)),output=join(scratch,'scene.json');
  execFileSync(process.execPath,[cli,scratch,output],{cwd:scratch,stdio:'pipe'});
  assert.deepEqual(JSON.parse(await readFile(output)),composeLandscape(building.issue,building.layout));
  const before=await readFile(output,'utf8');
  await writeFile(join(scratch,'layout.json'),JSON.stringify(narrow));
  assert.throws(()=>execFileSync(process.execPath,[cli,scratch,output],{cwd:scratch,stdio:'pipe'}));
  assert.equal(await readFile(output,'utf8'),before,'Invalid recomposition preserves existing output');
} finally {await rm(scratch,{recursive:true,force:true});}
console.log('Passed: V5 five root profiles, deterministic editable inputs, room doors/walls/equipment clearance, closed and narrow passage rejection, seven-room/two-row scaling, alternative same-issue scenes and safe external composition CLI.');
