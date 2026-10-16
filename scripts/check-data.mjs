import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { renderMap, renderPage } from '../kit/render.mjs';
import { validate, routePoints } from '../kit/model.mjs';

// Deliberately different IDs, coordinates, evidence status, source count and scenario count.
const issue = {
  id: 'independent-fixture', title: 'Independent map', question: 'Where does the handoff go?',
  summary: 'A small renderer test fixture.', status: 'user-provided',
  sources: [
    { id: 'first', title: 'First fixture source', locator: 'Section one' },
    { id: 'second', title: 'Second fixture source', locator: 'Section two', date: '2026-10-12' }
  ],
  entities: ['origin', 'destination'].map((id, i) => ({ id, number: String(i + 1), label: id,
    kind: 'place', role: 'Participant', description: 'Test participant.', constraint: 'Test only.',
    status: 'user-provided', source: i ? 'second' : 'first' })),
  relationships: [{ id: 'handoff', from: 'origin', to: 'destination', kind: 'information', label: 'Send a request', status: 'user-provided', source: 'second' }],
  scenarios: [{ id: 'single', number: '1', label: 'One handoff', summary: 'A single exchange.', condition: 'A request exists.', outcome: 'It reaches the destination.',
    steps: [{ title: 'Send it', text: 'The origin contacts the destination.', relations: ['handoff'] }] }]
};
const scene = {
  width: 900, height: 650, camera: { azimuth: 40, elevation: 30 },
  bounds: [[1260, -940, 0], [1620, -750, 150]],
  ground: [
    { type: 'box', x: 1260, y: -940, z: 0, w: 360, d: 190, h: 2, material: '#e3e1d5' },
    { type: 'line', points: [[1260, -800, 3], [1620, -800, 3]], color: '#777777', width: 1, dash: [3, 2] },
    { type: 'text', at: [1330, -750, 3], text: 'Independent ground', size: 10, color: '#555555' }
  ],
  scenery: [{ type: 'person', x: 1415, y: -845, material: '#778899' }],
  instances: [
    { id: 'first-place', entity: 'origin', asset: 'house', x: 1280, y: -920, w: 112, d: 88, h: 72, material: '#c7bba8', anchor: [1336, -820, 3], label: [1336, -790, 3] },
    { id: 'second-place', entity: 'destination', asset: 'office', sign: 'CIVIC HALL', x: 1460, y: -920, w: 122, d: 98, h: 121, material: '#b5beb3', anchor: [1521, -810, 3], label: [1521, -780, 3] }
  ],
  routes: [{ relation: 'handoff', via: [[1336, -805, 3], [1521, -805, 3]] }]
};

assert.equal(validate(issue, scene), true);
const html = renderPage(issue, scene, '', '');
assert(!/Northbank|repair|appliance|fictional|THREE WAYS/i.test(html), 'The independent map must not inherit pilot claims or scenery');
assert.equal([...html.matchAll(/class="scenario-button"/g)].length, 1);
assert(html.includes('First fixture source') && html.includes('Second fixture source'));
assert(html.includes('CIVIC HALL') && html.includes('Independent ground'));
assert(!html.includes('undefined'));
const legend = html.match(/<div class="legend"[^>]*>(.*?)<\/div>/s)[1];
assert(legend.includes('Information') && !legend.includes('Technical links'), 'Only used relationship kinds belong in the legend');

const moved = structuredClone(scene);
moved.instances[0].x += 20;
moved.instances[0].anchor[0] += 20;
moved.instances[0].label[0] += 20;
assert.deepEqual(routePoints(issue.relationships[0], moved.routes[0], moved)[0], moved.instances[0].anchor);
assert.notEqual(renderMap(issue, moved), renderMap(issue, scene), 'Data-only positioning must affect the drawing');
assert.equal(issue.relationships[0].from, 'origin', 'Layout does not change semantic identity');
const bare = { ...scene, ground: [], scenery: [] };
const bareSvg = renderMap(issue, bare);
assert(!bareSvg.includes('Independent ground'));
assert(bareSvg.length < renderMap(issue, scene).length, 'Empty decoration arrays must not restore pilot scenery');

const badScene = (mutate, message) => { const s = structuredClone(scene); mutate(s); assert.throws(() => validate(issue, s), message); };
badScene(s => s.bounds = [[0, NaN, 0]], /bounds/);
badScene(s => s.ground[0].type = 'raw-svg', /ground type/);
badScene(s => s.ground[0].w = -1, /ground box/);
badScene(s => s.ground[0].material = 'red;display:none', /ground material/);
badScene(s => s.ground[0].r = Infinity, /ground radius/);
badScene(s => s.ground[1].points[0][0] = Infinity, /ground line/);
badScene(s => s.ground[1].dash = ['" onload="alert(1)'], /ground dash/);
badScene(s => s.ground[1].width = -1, /ground stroke/);
badScene(s => s.ground[2].tracking = '" onload="alert(1)', /ground tracking/);
badScene(s => s.ground[2].size = 0, /ground text/);
badScene(s => s.scenery[0].type = 'constructor', /scenery type/);
badScene(s => s.scenery[0].x = NaN, /scenery position/);
badScene(s => s.scenery[0].material = 'url(https://example.com)', /scenery material/);
badScene(s => s.scenery[0].sortAt = [0, 0], /depth anchor/);
badScene(s => s.instances[0].sign = {}, /Invalid sign/);
badScene(s => s.instances[0].labelStyle = { plane: 'screen' }, /label plane/);
badScene(s => s.instances[0].labelStyle = { width: NaN }, /label width/);
badScene(s => s.instances[0].labelStyle = { size: '" onload="alert(1)' }, /label size/);
badScene(s => s.instances[0].labelStyle = { width: 12, size: 20 }, /Label too narrow/);
badScene(s => s.instances[0].labelStyle = { lines: ['Misleading name'] }, /label lines/);
const invalidPresentation = { ...issue, presentation: { intro: {} } };
assert.throws(() => validate(invalidPresentation, scene), /presentation field/);
assert.throws(() => validate({ ...issue, legend: { unknown: 'anything' } }, scene), /legend entry/);
assert.throws(() => validate({ ...issue, status: 'verified' }, scene), /issue status/);

const attack = '</script><img src=x onerror=alert(1)>';
const unsafeScene = structuredClone(scene);
unsafeScene.ground[2].text = attack;
unsafeScene.instances[1].sign = attack;
unsafeScene.scenery.push({ type: 'van', x: 1400, y: -750, sign: attack });
const unsafeIssue = { ...issue, presentation: { eyebrow: attack, evidenceNote: attack }, legend: { information: attack } };
const safeHtml = renderPage(unsafeIssue, unsafeScene, '', '');
assert(!safeHtml.includes('<img src=x'));
assert(safeHtml.includes('&lt;img src=x'));
const embedded = JSON.parse(safeHtml.match(/id="map-data">([\s\S]*?)<\/script>/)[1]);
assert.equal(embedded.scene.ground[2].text, attack);
assert.equal(embedded.issue.legend.information, attack);

// The CLI must work with an external input folder, irrespective of its current directory.
const temp = await mkdtemp(join(tmpdir(), 'city-data-check-'));
try {
  const input = join(temp, 'input with spaces'), output = join(temp, 'output with spaces');
  await mkdir(input);
  await writeFile(join(input, 'issue.json'), JSON.stringify(issue));
  await writeFile(join(input, 'scene.json'), JSON.stringify(scene));
  const script = fileURLToPath(new URL('./build.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script, input, output], { cwd: temp, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const built = await readFile(join(output, 'index.html'), 'utf8');
  const study = await readFile(join(output, 'assets.html'), 'utf8');
  assert(built.includes('Independent map') && !/Northbank|repair|fictional/i.test(built));
  assert.equal((study.match(/<article>/g) ?? []).length, 3, 'Study includes exactly the two asset recipes and one scenery recipe supplied');
  assert(!study.includes('STREET LIFE') && !study.includes('NR</text>'));
  const defaultBuild = spawnSync(process.execPath, [script], { cwd: temp, encoding: 'utf8' });
  assert.equal(defaultBuild.status, 0, defaultBuild.stderr);
  assert((await readFile(join(temp, 'preview/index.html'), 'utf8')).includes('Northbank'), 'Default output belongs to the calling project, not the skill installation');
  await writeFile(join(input, 'scene.json'), JSON.stringify({ ...scene, ground: [{ type: 'raw-svg' }] }));
  const invalid = spawnSync(process.execPath, [script, input, output], { cwd: temp, encoding: 'utf8' });
  assert.notEqual(invalid.status, 0);
  assert.equal(await readFile(join(output, 'index.html'), 'utf8'), built, 'Invalid data must not replace an existing preview');
} finally {
  await rm(temp, { recursive: true, force: true });
}
console.log('Passed: independent data-driven map, alternate sources/status/scenario count, data-only layout changes, input validation/escaping, external CLI build and failed-build preservation.');
