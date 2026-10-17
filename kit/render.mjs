import * as k from './anatomy/iso-kit.mjs';
import { drawing, escape } from './assets.mjs';
import { validate, routePoints, relationshipKinds, resolvedScene, actorAt } from './model.mjs';
import { transport } from './transport.mjs';
import { spring, pointAlong, entranceProgress } from './motion.mjs';
import {drawNetwork} from './network.mjs';
import {roomWalls} from './rooms.mjs';
import {objectBounds,placedFootprint} from './object-geometry.mjs';
import {isOutdoor} from './outdoor-assets.mjs';

export function renderMap(issue, scene) {
  validate(issue, scene);
  scene = resolvedScene(issue,scene);
  const bounds = [...scene.bounds];
  const walls=roomWalls(scene.rooms);
  for(const wall of walls)bounds.push(...k.boxCorners(wall,3,wall.h));
  for (const a of scene.instances) { const b=objectBounds(a);bounds.push(...k.boxCorners(b,b.z,b.z+b.h)); }
  for (const a of scene.instances) {
    const width=a.labelStyle?.width ?? issue.entities.find(e=>e.id===a.entity).label.length*7.5+32;
    bounds.push([a.label[0]-width/2,a.label[1],a.label[2]],[a.label[0]+width/2,a.label[1]+45,a.label[2]]);
  }
  for (const a of scene.ground) {
    if (a.type==='box') bounds.push(...k.boxCorners(a,a.z,a.h));
    else if (a.type==='line') bounds.push(...a.points);
    else bounds.push(a.at);
  }
  for (const a of scene.scenery) { const b=objectBounds(a);bounds.push(...k.boxCorners(b,b.z,b.z+b.h)); }
  for (const r of issue.relationships) bounds.push(...routePoints(r,scene.routes.find(a=>a.relation===r.id),scene));
  if(scene.network)for(const e of scene.network.edges)for(const p of (e.points??[scene.network.nodes.find(n=>n.id===e.from).at,scene.network.nodes.find(n=>n.id===e.to).at]))bounds.push([p[0]-e.width/2,p[1]-e.width/2,p[2]],[p[0]+e.width/2,p[1]+e.width/2,p[2]]);
  for (const layout of scene.scenarioLayouts ?? []) for (const step of layout.steps) if (step.path) bounds.push(...step.path);
  const P = k.fitProjection(bounds, scene.width, scene.height, { ...scene.camera, pad: 58 });
  const D = drawing(P,scene.seed);
  let ground = scene.ground.map(D.ground).join('');
  for (const item of scene.instances) { const a=placedFootprint(item);ground += D.polygon([[a.x + 6, a.y + 6, 2], [a.x + a.w + 12, a.y + 6, 2], [a.x + a.w + 31, a.y + a.d + 20, 2], [a.x + 31, a.y + a.d + 20, 2]], '#586251', 'opacity=".075" stroke="none"'); }
  for (const a of scene.instances) ground += D.walkingFloor(a);
  for (const a of scene.scenery.filter(isOutdoor)) ground += D.walkingFloor(a);
  if(scene.network)ground+=drawNetwork(scene.network,D,scene.instances);

  const objects = scene.instances.map(a => {
    const e = issue.entities.find(e => e.id === a.entity);
    const f=placedFootprint(a),b=objectBounds(a);
    const ring = k.planOutline({ x: f.x - 7, y: f.y - 7, w: f.w + 14, d: f.d + 14, r: 2 }, 2.4, P);
    const port = scene.network ? scene.network.ports.filter(p=>p.entity===a.entity).map(p=>{const at=scene.network.nodes.find(n=>n.id===p.node).at;return D.box(at[0]-3,at[1]-3,1,6,6,1.5,'#a0b38c');}).join('') : D.line([[a.anchor[0], a.y + a.d + 3, 3], a.anchor], '#7e9272', .9) + D.box(a.anchor[0]-3, a.anchor[1]-3, 1, 6, 6, 1.5, '#a0b38c');
    const badge=e.detailView ? D.text([f.x+f.w/2,f.y+f.d/2,f.z+a.h+18],'⊕',20,'#526f50','class="detail-badge" aria-hidden="true"') : '';
    const [hx,hy]=D.project([f.x+f.w/2,f.y+f.d/2,isOutdoor(a)?b.z+b.h/2:a.h/2]);
    const hit=a.emphasis||a.size?`<path class="object-hit" d="M${hx} ${hy}h.01" aria-hidden="true"/>`:'';
    const corners=k.boxCorners(b,b.z,b.z+b.h).map(D.project),xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
    const box=[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];
    const lod=scene.adaptiveDetail?` data-lod-width="${box[2]}" data-full-bounds="${box}"`:'';
    const label=scene.adaptiveDetail?`<g data-lod="${a.emphasis==='primary'?0:1}">${D.label(a,e)}${badge}</g>`:D.label(a,e)+badge;
    return { at: [f.x + f.w / 2, f.y + f.d / 2, f.z], footprint:isOutdoor(a)?{...b,h:b.z+b.h}:a, svg: `<g class="map-object ${e.kind}" data-entity="${e.id}"${lod}${e.detailView?` data-detail="${e.detailView}"`:''} role="button" tabindex="0" aria-label="${e.detailView?'Utforsk':'Inspect'} ${escape(e.label)}" aria-pressed="false"><title>${escape(e.label)}</title><path class="selection-ring" d="${ring}"/>${D.asset({...a,floorInGround:true,detailLevels:scene.adaptiveDetail??a.detailLevels})}<g class="object-fittings">${port}${label}</g>${hit}</g>` };
  });
  for (const a of scene.scenery) { const b=objectBounds(a),f=isOutdoor(a)?placedFootprint(a):null;objects.push({ at: a.sortAt ?? (f?[f.x+f.w/2,f.y+f.d/2,f.z]:[a.x,a.y,0]), footprint:{...b,h:b.z+b.h}, svg: `<g aria-hidden="true">${D.scenery({...a,floorInGround:isOutdoor(a)})}</g>` }); }
  for(const wall of walls)objects.push({at:[wall.x+wall.w/2,wall.y+wall.d/2,0],footprint:wall,svg:`<g data-room-wall="${wall.id}" aria-hidden="true">${D.box(wall.x,wall.y,3,wall.w,wall.d,wall.cutaway?8:wall.h,'#bbc5b2')}${D.box(wall.x,wall.y,wall.cutaway?11:wall.h+3,wall.w,wall.d,1,'#d9deca')}</g>`});
  let riseClips = '';
  const bodies = objects.sort((a,b) => k.depthOf(a.at,P)-k.depthOf(b.at,P)).map((item,i) => {
    const {x,y,w,d,h} = item.footprint;
    const floor = [[x-22,y-22,-5],[x+w+22,y-22,-5],[x+w+22,y+d+22,-5],[x-22,y+d+22,-5]].map(D.project);
    const left = floor.reduce((a,b)=>a[0]<b[0]?a:b), right = floor.reduce((a,b)=>a[0]>b[0]?a:b);
    const front = floor.reduce((a,b)=>a[1]>b[1]?a:b);
    const clip = k.pathOf([[left[0],-scene.height*2],[right[0],-scene.height*2],right,front,left],true);
    riseClips += `<clipPath id="rise-${i}" clipPathUnits="userSpaceOnUse"><path d="${clip}"/></clipPath>`;
    const distance = Math.abs(D.project([0,0,h+80])[1]-D.project([0,0,0])[1]) + Math.max(...floor.map(p=>p[1]))-Math.min(...floor.map(p=>p[1]));
    return `<g class="rise-slot" data-depth="${k.depthOf(item.at,P)}" data-rise="${distance}" data-rise-delay="${i/Math.max(1,objects.length-1)*550}" data-rise-clip="url(#rise-${i})"><g class="rise-part">${item.svg}</g></g>`;
  }).join('');
  const origin = D.project([0,0,0]);
  const axes = [[1,0,0],[0,1,0],[0,0,1]].map(p => [...D.project(p).map((n,i) => n-origin[i]), k.depthOf(p,P)]);
  const actors = issue.scenarios.filter(s => s.actor).map(s => {
    const actor = scene.scenarioLayouts.find(l => l.scenario===s.id).actor, material=actor.material;
    const kinds=[...new Set([s.actor.kind,...s.steps.filter(step=>step.actor).map(step=>step.actor.kind)])];
    const shape=kinds.map(kind=>{
      // shortcut: 16 baked headings; use continuously reprojected geometry for close-up curved driving.
      const directions=['car','van','bicycle','plane'].includes(kind)?Array.from({length:16},(_,i)=>i*Math.PI/8):[0];
      return `<g data-kind="${kind}"${kind!==s.actor.kind?' hidden':''}>${directions.map((angle,i)=>`<g data-heading="${i}"${i?' hidden':''}>${kind==='person' ? D.person(0,0,0,material,false,actor.appearance,actor.identity ?? s.id) : kind==='document' ? D.box(-7,-5,0,14,10,.8,material)+D.line([[-4,-2,1],[4,-2,1]],'#637361',.7) : transport(P,kind,material,angle)}</g>`).join('')}</g>`;
    }).join('');
    return `<g class="story-actor" data-actor="${s.id}" hidden aria-hidden="true">${shape}</g>`;
  }).join('');

  const routes = scene.routes.map(route => {
    const r = issue.relationships.find(r => r.id === route.relation);
    const walkingStory = issue.scenarios.find(s=>s.actor?.kind==='person' && s.steps.some(step=>step.state.via===r.id));
    const legacyPath = walkingStory && !route.points ? scene.scenarioLayouts.find(l=>l.scenario===walkingStory.id).steps[walkingStory.steps.findIndex(step=>step.state.via===r.id)].path : null;
    const points = (legacyPath ?? routePoints(r,route,scene)).map(D.project);
    const path = k.pathOf(points);
    return {walking:(!!route.points || !!walkingStory) && r.kind==='movement',svg:`<g class="route ${r.kind}" data-relation="${r.id}" data-default-path="${path}" aria-hidden="true"><path class="route-under" d="${path}"/><path class="route-line" d="${path}" marker-end="url(#arrow-${r.kind})"/><circle class="route-start" cx="${points[0][0]}" cy="${points[0][1]}" r="2.4"/></g>`};
  });
  const markers = [...relationshipKinds,'story'].map(kind => `<marker id="arrow-${kind}" viewBox="0 0 10 8" refX="8" refY="4" markerWidth="8" markerHeight="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 8 4 0 8" class="${kind}" fill="none" stroke="var(${kind==='story'?'--story-color':'--route-color'})" stroke-width="1.6"/></marker>`).join('');
  const stories = (scene.scenarioLayouts ?? []).map(layout => {
    const scenario = issue.scenarios.find(s => s.id === layout.scenario);
    const steps = layout.steps.map((placement,index) => {
      const step = scenario.steps[index], [x,y] = D.project(placement.at);
      const notes = placement.links.map(link => {
        const r = issue.relationships.find(r => r.id === link.relation);
        const points = (scenario.actor && step.state.via===r.id ? placement.path : routePoints(r,scene.routes.find(route => route.relation === r.id),scene)).map(D.project);
        const a = points[link.segment], b = points[link.segment+1];
        const t = link.position ?? .5;
        return `<g class="connection-note ${r.kind}" data-note-relation="${r.id}" transform="translate(${a[0]+(b[0]-a[0])*t} ${a[1]+(b[1]-a[1])*t})" aria-hidden="true"><circle r="3"/><text text-anchor="middle" y="-10">${escape(r.shortLabel ?? r.label)}</text></g>`;
      }).join('');
      const captionWidth = step.title.length*6.8+16;
      const walking = scenario.actor && step.state.via;
      return `<g class="story-step" data-story-step="${index}"${walking ? ` data-walk-route="${step.state.via}" data-walk-path="${k.pathOf(placement.path.map(D.project))}"` : ''}><g class="connection-notes">${notes}</g><g class="step-marker" data-step="${index}" role="button" tabindex="0" aria-pressed="false" aria-label="Step ${index+1}: ${escape(step.title)}" transform="translate(${x} ${y})"><title>${escape(step.title)}</title><circle class="step-hit" r="12"/><circle class="step-halo" r="17"/><circle class="step-disc" r="12"/><text text-anchor="middle" y="4">${index+1}</text><g class="step-caption" aria-hidden="true"><rect x="${-captionWidth/2}" y="-48" width="${captionWidth}" height="28"/><text text-anchor="middle" y="-30">${escape(step.title)}</text></g></g></g>`;
    }).join('');
    return `<g class="story-layout" data-story="${scenario.id}" hidden>${steps}</g>`;
  }).join('');
  return `<svg id="city" xmlns="http://www.w3.org/2000/svg" data-origin="${origin}" data-projection-scale="${P.scale}" data-axes="${escape(JSON.stringify(axes))}" viewBox="0 0 ${scene.width} ${scene.height}" role="group" aria-label="${escape(issue.title)}. Select an object or choose a scenario." tabindex="0"><defs>${markers}${riseClips}</defs><g id="world"><g id="ground" aria-hidden="true">${ground}</g><g id="routes">${routes.filter(r=>!r.walking).map(r=>r.svg).join('')}</g><g id="walking-routes">${routes.filter(r=>r.walking).map(r=>r.svg).join('')}</g><g id="bodies">${bodies}</g><g id="actor-storage">${actors}</g><g id="story-annotations">${stories}</g></g></svg>`;
}

export function renderView(issue,scene) {
  const legendNames = { movement: 'Movement', information: 'Information', dependency: 'Dependency', technical: 'Technical links', influence: 'Environmental influence', electricity:'Elektrisk strøm', ...issue.legend };
  const legend = relationshipKinds.filter(kind => issue.relationships.some(r => r.kind === kind)).map(kind => `<span><i class="${kind}"></i>${escape(legendNames[kind])}</span>`).join('');
  const entityButtons = issue.entities.map(e => `<button class="entity-button" data-select="${e.id}"${e.detailView?` aria-label="Utforsk ${escape(e.label)}"`:''}><span>${escape(e.number)}</span>${escape(e.label)}<span class="entity-arrow" aria-hidden="true">${e.detailView?'⊕':'↗'}</span></button>`).join('');
  // shortcut: colors repeat after six stories; expand the palette for larger story sets.
  const storyColors = ['#376b78','#a65c37','#706096','#42734e','#9a4767','#806b2e'];
  const scenarios = issue.scenarios.map((s,i) => `<button class="scenario-button" data-scenario="${s.id}" style="--story-color:${storyColors[i%storyColors.length]}" aria-pressed="false"><span class="scenario-number">${escape(s.number)}</span><span><strong>${escape(s.label)}</strong><small>${escape(s.summary)}</small></span><span aria-hidden="true">→</span></button>`).join('');
  return {map:renderMap(issue,scene),legend,entityButtons,scenarios};
}

export function renderPage(issue, scene, css, runtime) {
  runtime = `const cityMotion = { spring: ${spring.toString()}, pointAlong: ${pointAlong.toString()}, entranceProgress: ${entranceProgress.toString()}, actorAt: ${actorAt.toString()} };\n${runtime}`;
  const {map,legend,entityButtons,scenarios}=renderView(issue,scene);
  scene = resolvedScene(issue,scene);
  const copy = {
    eyebrow: 'AN ILLUSTRATED ISSUE MAP', intro: issue.summary,
    storyHeading: 'Follow the connections.',
    caption: 'Explore the issue, from the whole to its parts.', ...issue.presentation
  };
  const textView = `<section id="text-view" class="text-view"><div class="section-heading"><span class="eyebrow">THE ISSUE, IN WORDS</span><h2>${escape(issue.question)}</h2><p>${escape(issue.summary)}</p></div><div class="text-grid">${issue.scenarios.map(s => `<article><span class="eyebrow">SCENARIO ${escape(s.number)}</span><h3>${escape(s.label)}</h3><p><strong>Starting condition.</strong> ${escape(s.condition)}</p><ol>${s.steps.map(step => `<li><strong>${escape(step.title)}</strong><p>${escape(step.text)}</p></li>`).join('')}</ol><p><strong>Outcome.</strong> ${escape(s.outcome)}</p></article>`).join('')}</div><details><summary>All places, services and relationships</summary>${issue.entities.map(e => `<h3>${escape(e.number)} · ${escape(e.label)}</h3><p>${escape(e.role)}. ${escape(e.description)}</p><p>${escape(e.constraint)}</p>`).join('')}<ul>${issue.relationships.map(r => `<li>${escape(issue.entities.find(e=>e.id===r.from).label)} → ${escape(issue.entities.find(e=>e.id===r.to).label)}: ${escape(r.label)} (${escape(r.kind)}).</li>`).join('')}</ul></details><div class="source-note"><h3>Sources</h3><ul>${issue.sources.map(source => `<li>${escape(source.title)} · ${escape(source.locator)}${source.date ? ` · ${escape(source.date)}` : ''}</li>`).join('')}</ul></div></section>`;
  const json = JSON.stringify({issue,scene}).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(issue.title)} · CityVisualizer</title><style>${css}</style><script>if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!location.hash){document.documentElement.classList.add('intro-pending');window.cityIntroFallback=setTimeout(()=>document.documentElement.classList.remove('intro-pending'),4000);}</script></head><body><a class="skip-link" href="#text-view">Skip to the text explanation</a>
<main id="top"><section id="map-workspace" class="workspace" aria-label="Explore ${escape(issue.title)}"><button id="panel-show" class="panel-island" aria-label="Show panel" aria-expanded="false" aria-controls="map-sidebar" hidden><span aria-hidden="true">&lt;&lt;</span></button><div class="map-column">
<div id="map-stage" class="map-stage"><span class="map-credit" aria-hidden="true">Skill created by Espen Bamberg</span><a class="brand" href="#top" aria-label="CityVisualizer top"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 12 16 5 29 12 16 19Z" fill="#a9b797"/><path d="M3 12v9l13 7v-9Z" fill="#74896b"/><path d="M16 19v9l13-7v-9Z" fill="#536a57"/></svg><span>CITY<span class="brand-light">VISUALIZER</span></span></a><div class="map-corner"><h1>${escape(issue.title)}</h1></div><div class="legend" aria-label="Connection types">${legend}</div>${map}<div class="map-controls" aria-label="Map navigation"><button id="zoom-in" aria-label="Zoom in">+</button><span id="zoom-value" aria-live="off">100%</span><button id="zoom-out" aria-label="Zoom out">−</button><span class="control-divider"></span><button id="fullscreen" class="fullscreen-toggle" aria-label="Full screen" aria-expanded="false" title="Full screen">⛶</button><button id="fit" aria-label="Fit entire map">Fit</button></div><div class="map-instruction" id="map-instruction">Ctrl/⌘ to zoom</div></div></div>
<aside id="map-sidebar" class="sidebar" aria-label="Map explanation"><button id="sheet-toggle" aria-expanded="true" aria-controls="sidebar-content"><span class="sheet-grip" aria-hidden="true"></span><span>Stories &amp; places</span><span class="sheet-chevron" aria-hidden="true">⌄</span></button><div id="sidebar-content"><div class="sidebar-tabs"><button id="tab-stories" aria-pressed="true">Follow a story</button><button id="tab-places" aria-pressed="false">Explore the system</button><button id="panel-hide" class="panel-toggle" aria-label="Hide panel" aria-expanded="true" aria-controls="map-sidebar" title="Hide panel"><span aria-hidden="true">&gt;&gt;</span></button></div><div class="map-topbar"><div class="layer-toggles"><label><input id="show-routes" type="checkbox" checked> Connections</label><label><input id="show-labels" type="checkbox" checked> Labels</label></div></div><div id="stories"><div class="sidebar-heading"><h2>${escape(copy.storyHeading)}</h2><p>Follow the visible connections, or choose a story to highlight its handoffs.</p></div><div class="scenario-list">${scenarios}</div></div>
<div id="places" hidden><div class="sidebar-heading"><span class="eyebrow">THE PARTS OF THE WHOLE</span><h2>Every part has a role.</h2><p>Select a place or component. Lines connect named endpoints; crossings are not junctions.</p></div><div class="entity-list">${entityButtons}</div></div><section id="inspector" class="inspector" aria-label="Selected explanation"></section></div></aside></section>
<div class="page-content"><a class="scroll-cue" href="#text-view">Read the issue <span aria-hidden="true">↓</span></a><section class="intro"><div><p class="eyebrow">${escape(copy.eyebrow)}</p><h2>${escape(issue.title)}</h2><p class="intro-copy">${escape(copy.intro)}</p></div><div class="intro-note"><p>${escape(issue.question)}</p></div></section><div class="under-map"><p><span class="number-tag">01</span> ${escape(copy.caption)}</p><a href="#top">Back to the map ↑</a></div><div class="reading-key"><h2>Reading the connections</h2><div class="reading-legend">${legend}</div><p>Lines connect named endpoints. Crossings are not junctions.</p></div>${textView}</div></main><footer class="site-footer"><div class="creator-credit"><span>Skill created by <a href="mailto:espen.bamberg@gmail.com">Espen Bamberg</a>.</span><a class="linkedin-link" href="https://www.linkedin.com/in/espen-bamberg-20b283123/" aria-label="Espen Bamberg on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect width="24" height="24" rx="3" fill="currentColor"/><path fill="#fff" d="M5 9h3v10H5zM6.5 4.5a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5M10 9h3v1.4c.6-1 1.6-1.7 3-1.7 3 0 3.5 2 3.5 4.6V19h-3v-5c0-1.2 0-2.6-1.7-2.6S13 12.7 13 13.9V19h-3z"/></svg></a></div><span class="inspiration-credit">Skill inspired by Bo Meyer, <a href="https://skills.wheresryan.sh/anatomy">Anatomy</a> and <a href="https://opensource.org/license/mit">MIT</a>.</span></footer><script type="application/json" id="map-data">${json}</script><script>${runtime.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
}
