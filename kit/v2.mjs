import {readFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {validate,resolvedScene} from './model.mjs';
import {renderPage,renderView} from './render.mjs';
import {escape} from './assets.mjs';

export function validateViews(bundle) {
  const require=(ok,message)=>{if(!ok)throw Error(message);};
  require(bundle.version===2 && /^[a-z][a-z0-9-]*$/.test(bundle.root),'Invalid V2 manifest');
  require(bundle.language===undefined || /^[a-z]{2}(?:-[A-Z]{2})?$/.test(bundle.language),'Invalid document language');
  require(bundle.views && Object.hasOwn(bundle.views,bundle.root),'Missing root view');
  const owners=new Map(),visited=new Set();
  for(const [id,view] of Object.entries(bundle.views)) {
    require(/^[a-z][a-z0-9-]*$/.test(id),'Invalid view ID');
    validate(view.issue,view.scene);
    if(id!==bundle.root) require(view.issue.scenarios.length>=1 && view.issue.scenarios.length<=5,'Detail views need 1–5 processes');
    for(const e of view.issue.entities) if(e.detailView) {
      require(Object.hasOwn(bundle.views,e.detailView),'Unknown detail view');
      require(!owners.has(e.detailView),'Detail view must have one owner');
      owners.set(e.detailView,{view:id,entity:e.id});
    }
  }
  require(!owners.has(bundle.root),'Root cannot have an owner');
  function visit(id,ancestors=new Set()) {
    require(!ancestors.has(id),'Cyclic detail views');
    visited.add(id);
    for(const e of bundle.views[id].issue.entities) if(e.detailView) visit(e.detailView,new Set([...ancestors,id]));
  }
  visit(bundle.root);
  require(visited.size===Object.keys(bundle.views).length,'Unreachable or cyclic detail view');
  for(const [id,view] of Object.entries(bundle.views)) {
    const owner=owners.get(id);
    if(!owner) continue;
    require(Array.isArray(view.boundaries) && view.boundaries.length>0,'Detail view needs input/output boundaries');
    for(const b of view.boundaries) {
      const relation=bundle.views[owner.view].issue.relationships.find(r=>r.id===b.relation);
      require(relation && [relation.from,relation.to].includes(owner.entity),'Boundary must involve its owner');
      require(view.issue.entities.some(e=>e.id===b.entity),'Unknown local boundary entity');
      require(['in','out'].includes(b.direction) && (b.direction==='in'?relation.to:relation.from)===owner.entity,'Boundary direction does not match parent');
    }
  }
  return true;
}

export async function loadViews(directory) {
  const root=await realpath(directory);
  async function json(path) {
    if(typeof path!=='string' || isAbsolute(path)) throw Error('Expected a relative input path');
    const file=await realpath(resolve(root,path)),rel=relative(root,file);
    if(rel.split(sep)[0]==='..' || isAbsolute(rel)) throw Error('View file escapes input directory');
    return JSON.parse(await readFile(file,'utf8'));
  }
  const manifest=await json('map-v2.json');
  if(!manifest.views || typeof manifest.views!=='object' || Array.isArray(manifest.views)) throw Error('Missing views');
  const views=Object.fromEntries(await Promise.all(Object.entries(manifest.views).map(async([id,v])=>[id,{issue:await json(v.issue),scene:await json(v.scene),boundaries:v.boundaries}])));
  const bundle={...manifest,views};
  validateViews(bundle);
  return bundle;
}

export function renderV2(bundle,css,runtime) {
  validateViews(bundle);
  const root=bundle.views[bundle.root];
  const views=Object.fromEntries(Object.entries(bundle.views).map(([id,v])=>[id,{...v,scene:resolvedScene(v.issue,v.scene),html:renderView(v.issue,v.scene)}]));
  const json=JSON.stringify({...bundle,views}).replace(/</g,'\\u003c');
  let html=renderPage(root.issue,root.scene,css,runtime);
  const text=Object.entries(bundle.views).filter(([id])=>id!==bundle.root).map(([id,v])=>{
    const owner=Object.values(bundle.views).flatMap(p=>p.issue.entities).find(e=>e.detailView===id);
    return `<section class="text-view"><h2>${escape(v.issue.title)}</h2><p>Inni ${escape(owner.label)}. ${escape(v.issue.summary)}</p><ul>${v.boundaries.map(b=>`<li>${b.direction==='in'?'Inn':'Ut'}: ${escape(v.issue.entities.find(e=>e.id===b.entity).label)}</li>`).join('')}</ul>${v.issue.scenarios.map(s=>`<article><h3>${escape(s.label)}</h3><p>${escape(s.condition)}</p><ol>${s.steps.map(step=>`<li><strong>${escape(step.title)}</strong><p>${escape(step.handoff ?? '')} ${escape(step.text)}</p></li>`).join('')}</ol><p>${escape(s.outcome)}</p></article>`).join('')}<h3>Kilder</h3><ul>${v.issue.sources.map(s=>`<li>${escape(s.title)} · ${escape(s.locator)}</li>`).join('')}</ul></section>`;
  }).join('');
  html=html.replace('<html lang="en">',`<html lang="${bundle.language ?? 'en'}">`).replace('<body>','<body class="v2">').replace('Follow the visible connections, or choose a story to highlight its handoffs.',()=>escape(root.issue.summary)).replace('<script type="application/json" id="map-data">',()=>`<script type="application/json" id="view-data">${json}</script><script type="application/json" id="map-data">`);
  return html.replace('</main><footer',()=>`<div class="page-content">${text}</div></main><footer`);
}
