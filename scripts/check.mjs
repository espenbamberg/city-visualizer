import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validate, routePoints } from '../kit/model.mjs';
import { renderPage, renderMap } from '../kit/render.mjs';
import { escape } from '../kit/assets.mjs';

const fixture = new URL('../examples/repair-service/',import.meta.url);
const issue = JSON.parse(await readFile(new URL('issue.json',fixture),'utf8'));
const scene = JSON.parse(await readFile(new URL('scene.json',fixture),'utf8'));
assert.equal(validate(issue,scene),true);

const badIssue = (mutate,pattern) => { const copy=structuredClone(issue); mutate(copy); assert.throws(()=>validate(copy,scene),pattern); };
const badScene = (mutate,pattern) => { const copy=structuredClone(scene); mutate(copy); assert.throws(()=>validate(issue,copy),pattern); };
badIssue(i=>i.entities.push(i.entities[0]),/Duplicate entity/);
badIssue(i=>i.relationships[0].to='absent',/Unknown endpoint/);
badIssue(i=>i.entities[0].source='unsupported',/Unknown source/);
badIssue(i=>i.entities[0].status='proven',/Unknown evidence/);
badIssue(i=>i.scenarios[0].steps[0].relations.push('absent'),/Unknown step relationship/);
badIssue(i=>i.scenarios[0].steps=[],/Empty scenario/);
badScene(s=>s.instances[0].anchor=null,/Missing anchor/);
badScene(s=>s.instances[0].x=Infinity,/Invalid geometry/);
badScene(s=>s.instances[0].w=-2,/Non-positive/);
badScene(s=>s.instances[0].asset='rocket',/Unknown asset/);
badScene(s=>s.instances[0].material='red;display:none',/Invalid material/);
badScene(s=>s.routes.pop(),/without a route/);
badScene(s=>s.routes[0].via=[[0,NaN,3]],/Invalid waypoints/);
badScene(s=>s.camera.elevation=0,/Invalid camera/);
badScene(s=>s.scenarioLayouts[0].steps.pop(),/step count/);
badScene(s=>s.scenarioLayouts[0].scenario='unknown',/scenario layout/);
badScene(s=>s.scenarioLayouts.push(s.scenarioLayouts[0]),/duplicate scenario/);
badScene(s=>s.scenarioLayouts[0].steps[0].at=[NaN,0,0],/scenario marker/);
badScene(s=>s.scenarioLayouts[0].steps[0].links[0].relation='persist',/step connection/);
badScene(s=>s.scenarioLayouts[0].steps[0].links[0].segment=99,/label segment/);
badScene(s=>s.scenarioLayouts[0].steps[0].links[0].segment=.5,/label segment/);
badScene(s=>s.scenarioLayouts[0].steps[0].links[0].position=1.5,/label position/);
badIssue(i=>i.relationships[0].shortLabel={},/short label/);
const booking = issue.scenarios.find(s=>s.id==='booking');
assert.deepEqual(booking.steps.flatMap(s=>s.relations),['request','booking-record','booking-host','persist']);
const bookingChain = booking.steps.map(s=>issue.relationships.find(r=>r.id===s.relations[0]));
assert.deepEqual(bookingChain.map(r=>r.from).concat(bookingChain.at(-1).to),['home','desk','booking','servers','database']);
assert(bookingChain.every((r,i)=>i===0||bookingChain[i-1].to===r.from),'The booking explanation must follow connected endpoints');
for (const r of issue.relationships) {
  const route = scene.routes.find(p=>p.relation===r.id);
  const points = routePoints(r,route,scene);
  assert.deepEqual(points[0],scene.instances.find(a=>a.entity===r.from).anchor);
  assert.deepEqual(points.at(-1),scene.instances.find(a=>a.entity===r.to).anchor);
  assert(points.length>=2 && points.every(p=>p.every(Number.isFinite)));
}

const svg = renderMap(issue,scene);
assert.equal(svg,renderMap(issue,scene),'Rendering must be deterministic');
assert.equal((svg.match(/class="map-object /g)||[]).length,issue.entities.length);
assert.equal((svg.match(/data-relation=/g)||[]).length,issue.relationships.length);
assert.equal(issue.entities.filter(e => e.kind === 'infrastructure').length,3);
for (const service of issue.entities.filter(e => e.kind === 'system')) {
  assert(issue.relationships.some(r => r.from === service.id && r.kind === 'technical'), `${service.id} must connect to its technical foundation`);
}
assert(!/\b(?:NaN|Infinity|undefined)\b/.test(svg));
assert.equal(escape('<a title="x">&'), '&lt;a title=&quot;x&quot;&gt;&amp;');
const injected = structuredClone(issue);
injected.title = '</script><img src=x onerror=alert(1)>';
injected.entities[0].label = '<svg onload="alert(1)">';
injected.scenarios[0].steps[0].title = '<img src=x onerror=alert(1)>';
injected.relationships[0].shortLabel = '<img src=x onerror=alert(1)>';
const html = renderPage(injected,scene,'','');
assert(!html.includes('<img src=x'));
assert(!html.includes('<svg onload'));
const embedded = html.match(/<script type="application\/json" id="map-data">([\s\S]*?)<\/script>/)[1];
assert.equal(JSON.parse(embedded).issue.title,injected.title,'Escaped JSON must round-trip');
console.log(`Passed: model integrity, 23 malformed-input cases, all ${issue.relationships.length} route endpoints, the connected booking story, deterministic SVG, and safe text/JSON/annotation rendering.`);
await import('./check-data.mjs');
await import('./check-heat.mjs');
await import('./check-motion.mjs');
await import('./check-city.mjs');
await import('./check-v2.mjs');
await import('./check-v3.mjs');
await import('./check-v4.mjs');
await import('./check-v5.mjs');
