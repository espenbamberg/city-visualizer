import { assetNames, sceneryNames } from './assets.mjs';
import {validateSize} from './sizing.mjs';
import {validateNetwork} from './network.mjs';
import {processParts} from './process-assets.mjs';
import {validateEnvironment} from './environments.mjs';
import {validateRoomContents} from './rooms.mjs';
import {isOutdoor,validateOutdoor} from './outdoor-assets.mjs';
import {validateClearances} from './object-geometry.mjs';
import {validateTransform} from './spatial.mjs';

export const relationshipKinds = ['movement', 'information', 'dependency', 'technical', 'influence', 'electricity'];
export const actorKinds = ['person','document','car','van','bicycle','plane','data','electricity'];
export const physicalActors = ['person','car','van','bicycle','plane'];

export function validate(issue, scene) {
  const require = (condition, message) => { if (!condition) throw new Error(message); };
  const ids = (items, name, key = 'id') => {
    require(Array.isArray(items) && items.length > 0, `Missing ${name}`);
    const set = new Set();
    for (const item of items) {
      require(typeof item[key] === 'string' && /^[a-z][a-z0-9-]*$/.test(item[key]), `Invalid ${name} ID`);
      require(!set.has(item[key]), `Duplicate ${name}: ${item[key]}`);
      set.add(item[key]);
    }
    return set;
  };
  const point = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
  const color = value => typeof value === 'string' && /^#[a-fA-F0-9]{6}$/.test(value);
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const appearance = value => {
    if (value === undefined) return;
    require(value && typeof value==='object' && !Array.isArray(value), 'Invalid person appearance');
    for (const [key,v] of Object.entries(value)) {
      require(['gender','skin','hair','hairstyle','coat','trousers','build'].includes(key), 'Unknown appearance field');
      require(key==='gender' ? ['woman','man','nonbinary'].includes(v) : key==='hairstyle' ? ['short','long','bun','curly','bald'].includes(v) : key==='build' ? Number.isFinite(v) && v>=.85 && v<=1.2 : color(v), `Invalid appearance ${key}`);
    }
  };
  require(scene.seed===undefined || (Number.isSafeInteger(scene.seed) && scene.seed>=0), 'Invalid scene seed');
  require(scene.adaptiveDetail===undefined || typeof scene.adaptiveDetail==='boolean','Invalid adaptive detail');
  validateEnvironment(scene.environment);
  const sources = ids(issue.sources, 'source');
  const entities = ids(issue.entities, 'entity');
  const relations = ids(issue.relationships, 'relationship');
  ids(issue.scenarios, 'scenario');
  const statuses = ['sourced', 'user-provided', 'inferred', 'assumed', 'disputed', 'fictional'];
  require(statuses.includes(issue.status), 'Unknown issue status');
  for (const source of issue.sources) {
    require(text(source.title) && text(source.locator), `Missing source title or locator: ${source.id}`);
    require(source.date === undefined || text(source.date), `Invalid source date: ${source.id}`);
  }
  if (issue.presentation !== undefined) {
    require(issue.presentation && typeof issue.presentation === 'object' && !Array.isArray(issue.presentation), 'Invalid presentation');
    for (const [key, value] of Object.entries(issue.presentation)) {
      require(['eyebrow', 'intro', 'mapHeading', 'storyHeading', 'caption', 'evidenceNote', 'layoutNote'].includes(key) && text(value), `Invalid presentation field: ${key}`);
    }
  }
  if (issue.legend !== undefined) {
    require(issue.legend && typeof issue.legend === 'object' && !Array.isArray(issue.legend), 'Invalid legend');
    for (const [key, value] of Object.entries(issue.legend)) require(relationshipKinds.includes(key) && text(value), `Invalid legend entry: ${key}`);
  }
  for (const field of ['title', 'question', 'summary']) require(typeof issue[field] === 'string' && issue[field].trim(), `Missing ${field}`);
  for (const item of [...issue.entities, ...issue.relationships]) {
    require(typeof item.label === 'string' && item.label.trim(), `Missing label: ${item.id}`);
    require(sources.has(item.source), `Unknown source: ${item.id}`);
    require(statuses.includes(item.status), `Unknown evidence status: ${item.id}`);
  }
  for (const entity of issue.entities) {
    require(['place', 'system', 'infrastructure', 'vehicle', 'station'].includes(entity.kind), `Unknown entity kind: ${entity.id}`);
    require(entity.detailView===undefined || /^[a-z][a-z0-9-]*$/.test(entity.detailView), 'Invalid detail view');
    for (const field of ['number', 'role', 'description', 'constraint']) require(typeof entity[field] === 'string', `Missing ${field}: ${entity.id}`);
  }
  for (const relation of issue.relationships) {
    require(entities.has(relation.from) && entities.has(relation.to), `Unknown endpoint: ${relation.id}`);
    require(relationshipKinds.includes(relation.kind), `Unknown relationship kind: ${relation.id}`);
    require(relation.shortLabel === undefined || text(relation.shortLabel), `Invalid short label: ${relation.id}`);
  }
  for (const scenario of issue.scenarios) {
    for (const field of ['number', 'label', 'summary', 'condition', 'outcome']) require(typeof scenario[field] === 'string' && scenario[field].trim(), `Missing ${field}: ${scenario.id}`);
    require(Array.isArray(scenario.steps) && scenario.steps.length > 0, `Empty scenario: ${scenario.id}`);
    if (scenario.actor !== undefined) {
      require(scenario.actor && actorKinds.includes(scenario.actor.kind) && text(scenario.actor.label) && entities.has(scenario.actor.start), `Invalid scenario actor: ${scenario.id}`);
      require(scenario.actor.entity===undefined || entities.has(scenario.actor.entity),'Unknown actor entity');
    }
    for (const step of scenario.steps) {
      require(typeof step.title === 'string' && typeof step.text === 'string', `Invalid step: ${scenario.id}`);
      require(Array.isArray(step.relations) && step.relations.length > 0, `Missing step relationships: ${scenario.id}`);
      require(step.relations.every(id => relations.has(id)), `Unknown step relationship: ${scenario.id}`);
      if (scenario.actor) {
        require(step.actor===undefined || (actorKinds.includes(step.actor.kind) && text(step.actor.label) && text(step.handoff)), 'Actor change requires an explicit handoff');
        require(step.actor?.entity===undefined || entities.has(step.actor.entity),'Unknown actor entity');
        require(step.state && entities.has(step.state.at) && text(step.state.caption), `Missing actor state: ${scenario.id}`);
        require(step.relations.some(id => { const r=issue.relationships.find(r=>r.id===id); return r.from===step.state.at || r.to===step.state.at; }), 'Actor location is not involved in this step');
        if (step.state.via !== undefined) {
          const r = issue.relationships.find(r => r.id === step.state.via);
          const previous = scenario.steps.indexOf(step)-1;
          require(r && step.relations.includes(r.id) && ['movement','information','electricity'].includes(r.kind) && r.from === (previous<0 ? scenario.actor.start : scenario.steps[previous].state?.at) && r.to === step.state.at && text(step.state.moving), `Invalid actor transfer: ${scenario.id}`);
          const kind = actorAt(scenario,previous+1).kind;
          require(!physicalActors.includes(kind) || r.kind==='movement', 'People and vehicles require a movement relationship');
          require(!['data','electricity'].includes(kind) || r.kind===(kind==='data'?'information':'electricity'), 'Actor requires a matching flow relationship');
        }
        if (step.state.access !== undefined) require(step.state.access && entities.has(step.state.access.entity) && ['open','closed'].includes(step.state.access.value), 'Invalid access state');
      } else require(step.state === undefined && step.actor===undefined, 'State without scenario actor');
    }
  }
  require(Number.isFinite(scene.width) && scene.width > 0 && Number.isFinite(scene.height) && scene.height > 0, 'Invalid canvas size');
  require(Number.isFinite(scene.camera?.azimuth) && scene.camera.azimuth > 0 && scene.camera.azimuth < 90, 'Invalid camera azimuth');
  require(Number.isFinite(scene.camera?.elevation) && scene.camera.elevation > 0 && scene.camera.elevation < 90, 'Invalid camera elevation');
  require(Array.isArray(scene.bounds) && scene.bounds.length >= 2 && scene.bounds.every(point), 'Invalid scene bounds');
  require(Array.isArray(scene.ground), 'Missing ground array');
  for (const a of scene.ground) {
    require(a && ['box', 'line', 'text'].includes(a.type), 'Unknown ground type');
    if (a.type === 'box') {
      require(['x', 'y', 'z', 'w', 'd', 'h'].every(key => Number.isFinite(a[key])) && a.w > 0 && a.d > 0 && a.h > 0, 'Invalid ground box');
      require(color(a.material), 'Invalid ground material');
      require(a.r === undefined || (Number.isFinite(a.r) && a.r >= 0 && a.r <= Math.min(a.w, a.d) / 2), 'Invalid ground radius');
    } else if (a.type === 'line') {
      require(Array.isArray(a.points) && a.points.length >= 2 && a.points.every(point), 'Invalid ground line');
      require(color(a.color) && Number.isFinite(a.width) && a.width > 0, 'Invalid ground stroke');
      require(a.dash === undefined || (Array.isArray(a.dash) && a.dash.length > 0 && a.dash.every(n => Number.isFinite(n) && n > 0)), 'Invalid ground dash');
    } else {
      require(point(a.at) && text(a.text) && color(a.color) && Number.isFinite(a.size) && a.size > 0, 'Invalid ground text');
      require(a.tracking === undefined || Number.isFinite(a.tracking), 'Invalid ground tracking');
    }
  }
  require(Array.isArray(scene.scenery), 'Missing scenery array');
  for (const a of scene.scenery) {
    require(a && sceneryNames.includes(a.type), 'Unknown scenery type');
    require(a.asset===undefined,'Scenery uses type, not asset');
    if(isOutdoor(a))validateOutdoor(a);
    else require(a.rotation===undefined&&a.options===undefined,'Rotation/options require a spatial recipe');
    require(Number.isFinite(a.x) && Number.isFinite(a.y), 'Invalid scenery position');
    require(a.sortAt === undefined || point(a.sortAt), 'Invalid scenery depth anchor');
    require(a.material === undefined || color(a.material), 'Invalid scenery material');
    require(a.z === undefined || Number.isFinite(a.z), 'Invalid scenery elevation');
    require(a.h === undefined || (Number.isFinite(a.h) && a.h > 5), 'Invalid scenery height');
    require(a.seed === undefined || (Number.isSafeInteger(a.seed) && a.seed >= 0), 'Invalid scenery seed');
    require(a.sign === undefined || typeof a.sign === 'string', 'Invalid scenery sign');
    appearance(a.appearance);
  }
  ids(scene.instances, 'instance');
  const placed = new Set();
  for (const item of scene.instances) {
    require(entities.has(item.entity), `Unknown scene entity: ${item.entity}`);
    // shortcut: one visual instance per entity in the proof; add named instance endpoints for repeated entities.
    require(!placed.has(item.entity), `Multiple instances: ${item.entity}`);
    placed.add(item.entity);
    require(assetNames.includes(item.asset), `Unknown asset: ${item.asset}`);
    validateTransform(item);
    if(isOutdoor(item))validateOutdoor(item);
    else require((item.rotation??0)===0&&(item.z??0)===0&&item.options===undefined,'Rotation/elevation/options require a spatial recipe');
    validateSize(item);
    require(item.detailLevels===undefined || typeof item.detailLevels==='boolean','Invalid object detail levels');
    require(item.process===undefined || (Object.hasOwn(processParts,item.process)&&(['storage','queue'].includes(item.process)?['shelf','queue'].includes(item.asset)&&item.w>=48&&item.d>=32:['desk','workbench','tester','terminal'].includes(item.asset)&&item.w>=52&&item.d>=40)),'Unsupported process recipe');
    require(['x', 'y', 'w', 'd', 'h'].every(key => Number.isFinite(item[key])), `Invalid geometry: ${item.id}`);
    require(item.w > 0 && item.d > 0 && item.h > 0, `Non-positive geometry: ${item.id}`);
    require(point(item.anchor) && point(item.label), `Missing anchor or label: ${item.id}`);
    require(color(item.material), `Invalid material: ${item.id}`);
    require(item.sign === undefined || typeof item.sign === 'string', `Invalid sign: ${item.id}`);
    if (item.people!==undefined) { require(Array.isArray(item.people),'Invalid interior people'); item.people.forEach(appearance); }
    if (item.labelStyle !== undefined) {
      const s = item.labelStyle;
      require(s && typeof s === 'object' && !Array.isArray(s), `Invalid label style: ${item.id}`);
      require(s.plane === undefined || ['top', 'front'].includes(s.plane), `Invalid label plane: ${item.id}`);
      require(s.width === undefined || (Number.isFinite(s.width) && s.width > 10), `Invalid label width: ${item.id}`);
      require(s.size === undefined || (Number.isFinite(s.size) && s.size > 0), `Invalid label size: ${item.id}`);
      require((s.width ?? issue.entities.find(e => e.id === item.entity).label.length * 7.5 + 32) > (s.plane === 'front' ? 10 : (s.size ?? 14) * 2 + 5), `Label too narrow: ${item.id}`);
      require(s.lines === undefined || (Array.isArray(s.lines) && s.lines.length > 0 && s.lines.every(text) && s.lines.join(' ') === issue.entities.find(e => e.id === item.entity).label), `Invalid label lines: ${item.id}`);
    }
  }
  require(issue.entities.every(e => placed.has(e.id)), 'Unplaced entity');
  validateClearances(scene);
  validateRoomContents(scene);
  const routes = ids(scene.routes, 'route', 'relation');
  for (const route of scene.routes) {
    require(relations.has(route.relation), `Unknown route relationship: ${route.relation}`);
    require(route.points===undefined || (Array.isArray(route.points) && route.points.length>=2 && route.points.every(point)), `Invalid route points: ${route.relation}`);
    require(route.points ? route.via===undefined : Array.isArray(route.via) && route.via.every(point), `Invalid waypoints: ${route.relation}`);
  }
  require(issue.relationships.every(r => routes.has(r.id)), 'Relationship without a route');
  validateNetwork(issue,scene);
  if (scene.scenarioLayouts !== undefined) {
    require(Array.isArray(scene.scenarioLayouts), 'Invalid scenario layouts');
    const seen = new Set();
    for (const layout of scene.scenarioLayouts) {
      const scenario = issue.scenarios.find(s => s.id === layout?.scenario);
      require(scenario && !seen.has(layout.scenario), 'Unknown or duplicate scenario layout');
      seen.add(layout.scenario);
      require(Array.isArray(layout.steps) && layout.steps.length === scenario.steps.length, `Scenario layout step count: ${layout.scenario}`);
      if (scenario.actor) require(layout.actor && point(layout.actor.at) && color(layout.actor.material), 'Missing actor placement');
      else require(layout.actor === undefined, 'Placement without actor');
      if (layout.actor) {
        appearance(layout.actor.appearance);
        require(layout.actor.identity===undefined || text(layout.actor.identity),'Invalid actor identity');
      }
      for (const [i, step] of layout.steps.entries()) {
        require(step && point(step.at), 'Invalid scenario marker');
        if(step.parts!==undefined) {
          require(Array.isArray(step.parts),'Invalid process parts');
          const seenParts=new Set();
          for(const p of step.parts) {
            const owner=scene.instances.find(a=>a.entity===p.entity),key=`${p.entity}/${p.part}`;
            require(owner&&processParts[owner.process]?.includes(p.part)&&!seenParts.has(key),'Unknown or repeated process part');
            require(['active','done','waiting','blocked'].includes(p.state),'Invalid process part state');seenParts.add(key);
          }
        }
        if (scenario.actor) {
          const state = scenario.steps[i].state;
          const route = scene.routes.find(r=>r.relation===state.via);
          if (actorAt(scenario,i).kind!=='document' && state.via) {
            require(route?.points || Array.isArray(step.path), 'Walking requires shared route points');
            require(step.routeEnd===undefined || (route.points && Number.isInteger(step.routeEnd) && step.routeEnd>0 && step.routeEnd<route.points.length), 'Invalid walking route end');
          } else require(step.routeEnd===undefined, 'Route end without walking transfer');
          const path = actorPath(scenario,layout,i,scene);
          require(Array.isArray(path) && path.length > 0 && path.every(point), 'Invalid actor path');
          if (actorAt(scenario,i).kind!=='document' && route?.points && step.path!==undefined) require(JSON.stringify(step.path)===JSON.stringify(path), 'Actor path differs from visible route');
          if (path.length>1) {
            require(state.via, 'Moving actor requires transfer');
            const previous = i===0 ? layout.actor.at : actorPath(scenario,layout,i-1,scene)?.at(-1);
            require(point(previous) && path[0].every((n,j) => n===previous[j]), 'Discontinuous actor path');
          } else require(state.via === undefined, 'Transfer without movement path');
          if (state.access) require(scene.instances.some(a => a.entity===state.access.entity && a.asset==='cool-room'), 'Access state requires a cool-room entrance');
        } else require(step.path === undefined, 'Path without actor');
        require(Array.isArray(step.links), 'Invalid scenario connection labels');
        const labeled = new Set();
        for (const link of step.links) {
          require(link && scenario.steps[i].relations.includes(link.relation) && !labeled.has(link.relation), 'Unknown or duplicate step connection');
          labeled.add(link.relation);
          const route = scene.routes.find(r => r.relation === link.relation);
          const points = scenario.actor && scenario.steps[i].state.via===link.relation ? actorPath(scenario,layout,i,scene) : routePoints(issue.relationships.find(r=>r.id===link.relation),route,scene);
          require(Number.isInteger(link.segment) && link.segment >= 0 && link.segment < points.length-1, 'Invalid connection label segment');
          require(link.position === undefined || (Number.isFinite(link.position) && link.position >= 0 && link.position <= 1), 'Invalid connection label position');
        }
      }
    }
  }
  for (const scenario of issue.scenarios) if (scenario.actor) require(scene.scenarioLayouts?.some(s => s.scenario===scenario.id), 'Actor without scenario layout');
  return true;
}

export function routePoints(relation, route, scene) {
  if (route.points) return route.points;
  const anchor = id => scene.instances.find(item => item.entity === id).anchor;
  return [anchor(relation.from), ...route.via, anchor(relation.to)];
}

export function actorPath(scenario, layout, index, scene) {
  const step = layout.steps[index], state = scenario.steps[index].state;
  if (actorAt(scenario,index).kind!=='document' && state.via) {
    const points = scene.routes.find(r=>r.relation===state.via)?.points;
    return points ? points.slice(0,step.routeEnd===undefined ? points.length : step.routeEnd+1) : step.path;
  }
  return step.path;
}

export function actorAt(scenario, index) {
  let actor=scenario.actor;
  for (let i=0;i<=index;i++) if (scenario.steps[i].actor) actor=scenario.steps[i].actor;
  return actor;
}

export function resolvedScene(issue, scene) {
  return {...scene, scenarioLayouts:scene.scenarioLayouts?.map(layout=>{
    const scenario = issue.scenarios.find(s=>s.id===layout.scenario);
    return {...layout,steps:layout.steps.map((step,i)=>scenario.actor ? {...step,path:actorPath(scenario,layout,i,scene)} : step)};
  })};
}
