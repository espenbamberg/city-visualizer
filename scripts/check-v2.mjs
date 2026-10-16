import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,symlink,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {v2Example} from '../examples/v2-example.mjs';
import {validateViews,loadViews,renderV2} from '../kit/v2.mjs';
import {actorAt,actorPath} from '../kit/model.mjs';
import {transport} from '../kit/transport.mjs';

const bundle=v2Example();
assert.equal(validateViews(bundle),true);
const bad=(change,pattern)=>{const b=structuredClone(bundle);change(b);assert.throws(()=>validateViews(b),pattern);};
bad(b=>b.views.city.issue.entities[1].detailView='missing',/Unknown detail/);
bad(b=>b.views.city.issue.entities[0].detailView='workshop',/one owner/);
bad(b=>b.views.workshop.issue.entities[0].detailView='city',/Root/);
bad(b=>delete b.views.city.issue.entities[1].detailView,/Unreachable/);
bad(b=>b.views.workshop.issue.scenarios.push(...Array.from({length:5},(_,i)=>({...b.views.workshop.issue.scenarios[0],id:`extra-${i}`,actor:undefined,steps:[{title:'Extra',text:'Extra',relations:['inspect']}]}))),/1–5/);
bad(b=>b.views.workshop.boundaries[0].entity='unknown',/boundary entity/);
bad(b=>b.views.workshop.boundaries[0].direction='out',/direction/);
bad(b=>b.views.workshop.boundaries[0].relation='cycle',/involve its owner/);
bad(b=>b.views.van.issue.relationships[0].kind='information',/matching flow/);
bad(b=>delete b.views.diagnostics.issue.scenarios[0].steps[1].handoff,/explicit handoff/);
bad(b=>b.views.city.issue.scenarios[1].actor.entity='absent',/actor entity/);
const kinds=new Set();
for(const view of Object.values(bundle.views))for(const scenario of view.issue.scenarios.filter(s=>s.actor)) {
  const layout=view.scene.scenarioLayouts.find(l=>l.scenario===scenario.id);
  scenario.steps.forEach((s,i)=>{
    kinds.add(actorAt(scenario,i).kind);
    assert.deepEqual(actorPath(scenario,layout,i,view.scene),view.scene.routes.find(r=>r.relation===s.state.via).points,'Every actor follows its visible route');
  });
}
assert.deepEqual([...kinds].sort(),['bicycle','data','electricity','person','plane','van']);
const p={origin:[100,100],scale:1,azimuth:45,elevation:35};
for(const kind of ['car','van','bicycle','plane','data','electricity']) {
  assert(transport(p,kind).includes('<path'));
  assert.notEqual(transport(p,kind,'#b58b58',0),transport(p,kind,'#b58b58',Math.PI/2),'Headings change projected geometry');
}
const injected=structuredClone(bundle);injected.views.workshop.issue.summary="</script><img src=x onerror=alert(1)> $& $' $`";
const html=renderV2(injected,'','');
assert(!html.includes('<img src=x'));
assert(html.includes('Inne i valideringen') && html.includes('view-data'));
assert.equal(JSON.parse(html.match(/id="view-data">([\s\S]*?)<\/script>/)[1]).views.workshop.issue.summary,injected.views.workshop.issue.summary);

const temp=await mkdtemp(join(tmpdir(),'city-v2-'));
try {
  const input=join(temp,'input'),output=join(temp,'output');await mkdir(input);await mkdir(output);
  await writeFile(join(output,'index.html'),'KEEP');
  await writeFile(join(temp,'outside.json'),'{}');
  await symlink(join(temp,'outside.json'),join(input,'escape.json'));
  for(const path of ['../outside.json','escape.json','/etc/passwd']) {
    await writeFile(join(input,'map-v2.json'),JSON.stringify({version:2,root:'city',views:{city:{issue:path,scene:path}}}));
    await assert.rejects(loadViews(input),/escapes|relative/);
  }
  const cli=spawnSync(process.execPath,[fileURLToPath(new URL('./build-v2.mjs',import.meta.url)),input,output],{encoding:'utf8'});
  assert.notEqual(cli.status,0);assert.equal(await readFile(join(output,'index.html'),'utf8'),'KEEP');
} finally {await rm(temp,{recursive:true,force:true});}
console.log('Passed: V2 ownership, depth, boundaries, local process counts, actor handoffs, shared routes, rotated transport, escaping, confined file loading and failed-build preservation.');
