import assert from 'node:assert/strict';
import {actorAt,actorPath,physicalActors} from './model.mjs';
import {placedFootprint} from './object-geometry.mjs';

export function relationshipMode(issue,relation) {
  const modes=new Set();
  for(const s of issue.scenarios)if(s.actor)s.steps.forEach((step,i)=>{if(step.state?.via===relation.id)modes.add(actorAt(s,i).kind);});
  assert(modes.size<=1,`Conflicting travel modes: ${relation.id}; use separate relationships`);
  return [...modes][0]??({movement:'person',information:'data',electricity:'electricity'}[relation.kind]);
}

export function scenarioLayouts(issue,scene) {
  return issue.scenarios.map(s=>{
    const seen=new Map();
    return keepStationaryActors(s,{scenario:s.id,...(s.actor?{actor:{identity:s.actor.identity??s.id,at:scene.routes.find(r=>r.relation===s.steps[0].state.via)?.points?.[0]??scene.instances.find(a=>a.entity===s.actor.start).anchor,material:'#aa8557'}}:{}),steps:s.steps.map((step,i)=>{
      const r=issue.relationships.find(r=>r.id===(step.state?.via??step.relations[0]));
      const a=scene.instances.find(a=>a.entity===(step.state?.at??r.to)),slot=seen.get(a.entity)??0;seen.set(a.entity,slot+1);
      const f=placedFootprint(a);
      return {at:[f.x+f.w/2+slot*30,f.y+f.d/2,f.z+a.h+32],links:[],...(s.actor&&(!step.state.via||actorAt(s,i).kind==='document')?{path:step.state.via?scene.routes.find(r=>r.relation===step.state.via).points:[a.anchor]}:{})};
    })},scene);
  });
}

export function keepStationaryActors(s,layout,scene) {
  if(s.actor)s.steps.forEach((step,i)=>{
    if(!step.state.via&&!step.actor&&physicalActors.includes(actorAt(s,i).kind)&&step.state.at===(i?s.steps[i-1].state.at:s.actor.start)) {
      layout.steps[i].path=[i?actorPath(s,layout,i-1,scene).at(-1):layout.actor.at];
    }
  });
  return layout;
}
