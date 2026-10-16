import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spring,pointAlong,entranceProgress} from '../kit/motion.mjs';
import {validate,resolvedScene} from '../kit/model.mjs';
import {renderPage} from '../kit/render.mjs';

// Equal elapsed time gives the same motion across refresh rates.
assert.equal(entranceProgress(1999,2000,600),0,'Sidebar waits for two seconds');
assert.equal(entranceProgress(2300,2000,600),.5);
assert.equal(entranceProgress(2600,2000,600),1);
assert.equal(entranceProgress(-1,0,1250),0);
assert.equal(entranceProgress(5000,550,1250),1);
for(let t=1;t<2600;t++) assert(entranceProgress(t,2000,600)>=entranceProgress(t-1,2000,600),'Entrance progresses without reversing');
const evolve = (hz) => { const s={x:1,v:0}; for(let i=0;i<hz/4;i++) spring(s,2,1/hz); return s; };
assert(Math.abs(evolve(60).x-evolve(120).x)<1e-10);
const s={x:1,v:0};
for(let i=0;i<8;i++) spring(s,2,1/60);
const before={...s};
spring(s,1,0);
assert.deepEqual(s,before,'Changing the target preserves position and velocity');
spring(s,1,1/240);
assert(s.x>before.x && s.v<before.v,'A reversal brakes existing velocity rather than snapping direction');
for(let i=0;i<240;i++) spring(s,1,1/60);
assert.deepEqual(s,{x:1,v:0});
spring(s,2,-1); assert.deepEqual(s,{x:1,v:0});
spring(s,2,100); assert(s.x>1 && s.x<2 && Number.isFinite(s.v),'A resumed tab has a bounded integration step');
assert.deepEqual(pointAlong([[0,0,0],[3,0,0],[3,4,0]],3/7),[3,0,0]);
assert.deepEqual(pointAlong([[1,2,3]],.5),[1,2,3]);
assert.deepEqual(pointAlong([[0,0,0],[0,0,0],[2,0,0]],.5),[1,0,0]);
assert.deepEqual(pointAlong([[0,0,0],[2,0,0]],2),[2,0,0]);

const root=new URL('../examples/heat-exposure/',import.meta.url);
const issue=JSON.parse(await readFile(new URL('issue.json',root),'utf8'));
const scene=JSON.parse(await readFile(new URL('scene.json',root),'utf8'));
const bad=(change,pattern) => {const i=structuredClone(issue),s=structuredClone(scene);change(i,s);assert.throws(()=>validate(i,s),pattern);};
bad(i=>i.scenarios[0].actor.kind='script',/actor/);
bad(i=>i.scenarios[0].steps[0].state.at='missing',/actor state/);
bad(i=>i.scenarios[0].steps[0].state.at='park',/not involved/);
bad(i=>i.scenarios[0].steps[0].state.via='family-notice',/transfer/);
bad(i=>i.scenarios[0].steps[0].state.access.value='locked-maybe',/access/);
bad((i,s)=>s.routes.find(r=>r.relation==='meet-square').points[0][0]++,/Discontinuous/);
bad((i,s)=>s.routes[0].points[0][0]=Infinity,/route points/);
bad((i,s)=>s.scenarioLayouts[0].actor.material='url(x)',/actor placement/);
bad((i,s)=>s.scenarioLayouts=[],/without scenario layout/);
bad((i,s)=>s.scenarioLayouts[0].steps[0].path=[[0,0,0]],/differs from visible route/);
bad(i=>delete i.scenarios[0].actor,/State without/);
bad(i=>i.scenarios[0].steps[0].state.access.entity='home',/requires a cool-room/);
assert(issue.scenarios[1].steps.every(s=>s.state.access.value==='closed'),'Exception is closed before discovery');
for(const layout of resolvedScene(issue,scene).scenarioLayouts) for(const step of layout.steps) {
  // The authored person must never cross the footprint of a closed building.
  for(let t=0;t<=1;t+=.005) {
    const [x,y]=pointAlong(step.path,t);
    for(const building of scene.instances.filter(a=>['house','school'].includes(a.asset))) assert(!(x>building.x && x<building.x+building.w && y>building.y && y<building.y+building.d),'Walking through a building');
    if(layout.scenario==='closed-door') assert(!(x>610 && x<760 && y>45 && y<160),'Entering the closed room');
  }
}
const escaped=structuredClone(issue);
escaped.scenarios[0].actor.label='</script><script>bad()</script>';
assert(!renderPage(escaped,scene,'','').includes('</script><script>bad()'),'Actor text stays data');
console.log('Passed: time-independent spring, velocity-preserving reversal, bounded resumption, path interpolation, 12 invalid actor cases, closed-room chronology and sampled walking clearances.');
