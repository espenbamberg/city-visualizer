import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {networkIndex,networkRoute,compileNetwork,validateNetwork,obstructed} from '../kit/network.mjs';
import {composeGroups} from '../kit/compose-groups.mjs';
import {v4Example,v4ScaleExample} from '../examples/v4-example.mjs';
import {validate,actorPath} from '../kit/model.mjs';
import {renderMap} from '../kit/render.mjs';

const instances=[{entity:'a',x:0,y:0,w:20,d:20,h:20},{entity:'b',x:200,y:0,w:20,d:20,h:20}];
const network={nodes:[{id:'a',at:[10,60,3]},{id:'b',at:[210,60,3]},{id:'short',at:[110,60,3]},{id:'long',at:[110,120,3]}],
  ports:['a','b'].map(id=>({id,entity:id,node:id,side:'front',position:.5,offset:40})),
  edges:[['short-a','a','short'],['short-b','short','b'],['long-a','a','long'],['long-b','long','b']].map(([id,from,to])=>({id,from,to,modes:['person'],surface:'path',width:20}))};
const relation={id:'journey',from:'a',to:'b',kind:'movement'},request={from:'a',to:'b',mode:'person'};
const graph=networkIndex(network,instances);
assert.deepEqual(networkRoute(graph,request,relation).edges,['short-a','short-b'],'Length-weighted route uses shared short corridor');
assert.deepEqual(networkRoute(graph,{...request,via:['long']},relation).edges,['long-a','long-b'],'An explicit handoff controls the route');
assert.throws(()=>networkRoute(graph,{...request,mode:'van'},relation),/No van route/);
const directed=structuredClone(network);directed.edges=directed.edges.slice(0,2).map(e=>({...e,oneWay:true}));
assert.throws(()=>networkRoute(networkIndex(directed,instances),{from:'b',to:'a',mode:'person'},{...relation,from:'b',to:'a'}),/No person route/);
const crossing=structuredClone(network);
crossing.nodes.push({id:'unjoined',at:[110,60,3]});
crossing.edges=[crossing.edges[0],{...crossing.edges[1],from:'unjoined'}];
assert.throws(()=>networkRoute(networkIndex(crossing,instances),request,relation),/No person route/,'Geometric contact alone is not a junction');
const narrow=structuredClone(network);narrow.edges[0].modes=['van'];narrow.edges[0].surface='road';
assert.throws(()=>networkIndex(narrow,instances),/Insufficient width/);
narrow.edges[0].width=64;
assert.throws(()=>networkIndex(narrow,[...instances,{entity:'obstacle',x:95,y:78,w:15,d:15,h:20}]),/collides with obstacle/,'Vehicle clearance covers more than its centerline');
assert.throws(()=>networkIndex(network,instances,[{type:'tree',x:110,y:60,h:45}]),/collides with scenery tree/,'Decorative obstacles cannot occupy travel corridors');
assert(!obstructed([0,100,100],[300,100,100],{x:100,y:90,w:20,d:20,h:30},20),'Elevated travel clears a low obstacle');
const wrong=structuredClone(network);wrong.edges[0].surface='air';
assert.throws(()=>networkIndex(wrong,instances),/surface/);

const bundle=v4Example();
for(const fixture of [bundle,v4ScaleExample()])for(const [id,view] of Object.entries(fixture.views)) {
  assert(validate(view.issue,view.scene));
  const svg=renderMap(view.issue,view.scene);assert.equal(svg,renderMap(view.issue,view.scene),'Deterministic V4 SVG');
  assert(!svg.includes('NaN')&&!svg.includes('undefined'),'Finite V4 geometry and attributes');
  if(view.scene.network)for(const s of view.issue.scenarios.filter(s=>s.actor)) {
    const l=view.scene.scenarioLayouts.find(l=>l.scenario===s.id);
    s.steps.forEach((step,i)=>assert.deepEqual(actorPath(s,l,i,view.scene),view.scene.routes.find(r=>r.relation===step.state.via).points));
  }
  if(id==='city')assert.deepEqual(composeGroups(view.issue,view.layout),view.scene,'Saved group geometry and routes recompose exactly');
}
const city=bundle.views.city;
const reused=city.scene.routes.filter(r=>r.edges.includes('yard-walk'));
assert(reused.length>=3,'Different journeys reuse a single physical corridor');
assert(city.scene.network.ports.filter(p=>p.entity==='workshop').length===2,'Public and loading entrances are distinct');
const stale=structuredClone(city.scene);stale.instances[0].x+=1;
assert.throws(()=>validateNetwork(city.issue,stale),/Stale port/);
const moved=structuredClone(city.scene);moved.instances.find(a=>a.entity==='home').x+=5;
compileNetwork(city.issue,moved);assert.notDeepEqual(moved.routes,city.scene.routes,'Port changes rebuild route endpoints');
const invalid=structuredClone(bundle.views.workshop.scene);invalid.scenarioLayouts[0].steps[0].parts[0].part='unknown';
assert.throws(()=>validate(bundle.views.workshop.issue,invalid),/Unknown or repeated process part/);
const conflict=structuredClone(city.issue);conflict.scenarios.find(s=>s.id==='visit').actor.kind='van';
assert.throws(()=>validate(conflict,city.scene),/Conflicting travel mode/);

const temp=await mkdtemp(join(tmpdir(),'city-v4-'));
try {
  const script=fileURLToPath(new URL('./compose.mjs',import.meta.url)),output=join(temp,'scene.json');
  await writeFile(join(temp,'issue.json'),JSON.stringify(city.issue));await writeFile(join(temp,'layout.json'),JSON.stringify(city.layout));
  const run=()=>spawnSync(process.execPath,[script,temp,output],{encoding:'utf8'});
  const result=run();assert.equal(result.status,0,result.stderr);
  const saved=await readFile(output,'utf8');assert.deepEqual(JSON.parse(saved),city.scene);
  const layout=structuredClone(city.layout);layout.network.edges=layout.network.edges.filter(e=>e.from!=='home-entry'&&e.to!=='home-entry');
  await writeFile(join(temp,'layout.json'),JSON.stringify(layout));assert.notEqual(run().status,0);
  assert.equal(await readFile(output,'utf8'),saved,'An unreachable route preserves previous output');
} finally {await rm(temp,{recursive:true,force:true});}
console.log('Passed: V4 shared shortest routes, ports, modes, one-way edges, unjoined crossings, swept clearance, regrouping, process references, scale fixture and safe composition CLI.');
