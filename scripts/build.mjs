import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage } from '../kit/render.mjs';
import { drawing, escape } from '../kit/assets.mjs';
import * as k from '../kit/anatomy/iso-kit.mjs';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length !== 0 && args.length !== 2) {
  console.error('Usage: node build.mjs [input-directory output-directory]');
  process.exit(1);
}
const example = args.length ? resolve(args[0]) : resolve(skill, 'examples/repair-service');
const output = args.length ? resolve(args[1]) : resolve('preview');
const [issue, scene, css, runtime] = await Promise.all([
  readFile(resolve(example,'issue.json'),'utf8').then(JSON.parse),
  readFile(resolve(example,'scene.json'),'utf8').then(JSON.parse),
  readFile(resolve(skill,'kit/style.css'),'utf8'),
  readFile(resolve(skill,'kit/viewer.js'),'utf8')
]);
const html = renderPage(issue,scene,css,runtime).replace('<head>', '<head><link rel="icon" href="data:,">');
const samples = scene.instances.filter((a,index,list) => list.findIndex(b => b.asset===a.asset && b.size===a.size && b.w===a.w && b.d===a.d && b.h===a.h)===index);
let cards = samples.map(sample => {
  const a = {...sample,x:0,y:0,label:[sample.label[0]-sample.x,sample.label[1]-sample.y,sample.label[2]]};
  const entity = issue.entities.find(e=>e.id===a.entity);
  const P = k.fitProjection(k.boxCorners({x:-20,y:-20,w:a.w+50,d:a.d+70},0,a.h+46),470,350,{...scene.camera,pad:35});
  const D = drawing(P,scene.seed);
  return `<article><p class="eyebrow">${escape(a.asset.toUpperCase())}${a.size?` · ${escape(a.size)}`:''}</p><svg viewBox="0 0 470 350" role="img" aria-label="${escape(a.asset)} recipe">${D.box(-20,-8,0,a.w+40,a.d+48,2,'#dddccf')}${D.asset(a)}${D.label(a,entity)}</svg><h3>${escape(entity.label)}</h3></article>`;
}).join('');
const scenerySamples = scene.scenery.filter((a,index,list) => list.findIndex(b => b.type === a.type) === index);
cards += scenerySamples.map(sample => {
  const a = { ...sample, id:sample.id ?? `street:${sample.x}:${sample.y}`, x: 0, y: 0 };
  const P = k.fitProjection(k.boxCorners({x:-30,y:-30,w:110,d:100},0,Math.max(90,(a.h ?? 0)+30,(a.z ?? 0)+30)),470,350,{...scene.camera,pad:35});
  const D = drawing(P,scene.seed);
  return `<article><p class="eyebrow">SCENERY</p><svg viewBox="0 0 470 350" role="img" aria-label="${escape(a.type)} recipe">${D.scenery(a)}</svg><h3>${escape(a.type)}</h3></article>`;
}).join('');
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'index.html'),html);
await writeFile(resolve(output,'assets.html'),`<!doctype html><html lang="en"><head><link rel="icon" href="data:,"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(issue.title)} · Component study</title><style>${css}.asset-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px;padding-bottom:40px}.asset-grid article{border:1px solid var(--line);background:#f0f1e7;border-radius:7px;padding:18px}.asset-grid svg{display:block;width:100%;height:auto}.asset-grid h3{font:normal 20px Georgia,serif}h1{padding:20px 0}.study-intro{padding:35px 0}</style></head><body><main><div class="study-intro"><a href="index.html">← Back to the map</a><h1>A shared visual vocabulary.</h1><p>Components used in ${escape(issue.title)}. Original asset recipes built on Anatomy’s projection.</p></div><div class="asset-grid">${cards}</div></main></body></html>`);
console.log(`Built ${output}/index.html (${(Buffer.byteLength(html)/1024).toFixed(0)} KB)`);
console.log(`Built ${output}/assets.html`);
