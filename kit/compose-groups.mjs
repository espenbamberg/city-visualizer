import assert from 'node:assert/strict';
import {dimensions,nameplate} from './sizing.mjs';
import {compileNetwork,obstructed,sceneryObstacles} from './network.mjs';
import {validate,actorAt} from './model.mjs';
import {scenarioLayouts} from './compose-helpers.mjs';

export function composeGroups(issue,layout) {
  assert(layout.environment===undefined||['city','campus'].includes(layout.environment),'Groups require city or campus');
  assert(Number.isSafeInteger(layout.seed)&&layout.seed>=0,'Invalid group seed');
  assert(Array.isArray(layout.groups)&&layout.groups.length,'Missing activity groups');
  const instances=[],ground=[],scenery=[],seen=new Set();
  for(const group of layout.groups) {
    assert(['street','court','green'].includes(group.pattern),'Unknown group pattern');
    assert(Array.isArray(group.at)&&group.at.length===2&&group.at.every(Number.isFinite),'Invalid group position');
    assert(typeof group.label==='string'&&group.label.trim()&&Array.isArray(group.plots)&&group.plots.length,'Invalid activity group');
    const plots=group.plots.map(p=>({...p,...dimensions(p)})),placed=[];
    let cursor=0;
    for(const [i,p] of plots.entries()) {
      const entity=issue.entities.find(e=>e.id===p.entity);assert(entity&&!seen.has(p.entity),'Unknown or repeated group entity');seen.add(p.entity);
      const at=p.at??[cursor,group.pattern==='court'&&i>0?70:group.pattern==='green'&&i%2?50:0];
      assert(Array.isArray(at)&&at.length===2&&at.every(Number.isFinite),'Invalid plot position');
      const a={id:p.entity,entity:p.entity,asset:p.asset,x:group.at[0]+at[0],y:group.at[1]+at[1],w:p.w,d:p.d,h:p.h,
        material:p.material??(p.asset==='park'?'#b2c09a':'#bcc6b1'),sign:p.sign??entity.label,
        ...(p.size?{size:p.size}:{}),emphasis:p.emphasis??'supporting',detailLevels:true,...(p.process?{process:p.process}:{})};
      a.anchor=[a.x+a.w/2,a.y+a.d+36,3];a.label=[a.x+a.w/2,a.y+a.d+7,3];a.labelStyle=nameplate(entity.label,a.w);
      instances.push(a);placed.push(a);cursor=at[0]+a.w+90;
    }
    const x=Math.min(...placed.map(a=>a.x))-18,y=Math.min(...placed.map(a=>a.y))-18;
    const w=Math.max(...placed.map(a=>a.x+a.w))-x+24,d=Math.max(...placed.map(a=>a.y+a.d))-y+90;
    ground.push({type:'box',x,y,z:0,w,d,h:2,material:group.pattern==='green'?'#c2ccad':'#dedbc9',r:5},
      {type:'text',at:[x+8,y+8,3],text:group.label.toUpperCase(),size:10,color:'#68745e',tracking:.7});
    if(group.pattern==='court')for(let dx=20;dx<w;dx+=30)ground.push({type:'line',points:[[x+dx,y+20,2.1],[x+dx,y+d-10,2.1]],color:'#d0cebc',width:.35});
    for(const a of placed)scenery.push({type:'tree',x:a.x+12,y:a.y+a.d+62,h:43,seed:instances.indexOf(a),owner:a.entity},
      {type:'person',id:`visitor-${a.entity}`,x:a.x+30,y:a.y+a.d+48,z:3,owner:a.entity});
  }
  assert(seen.size===issue.entities.length,'Every entity needs an activity group');
  const terrain=ground.filter(g=>g.type==='box'),left=Math.min(...terrain.map(g=>g.x))-12,back=Math.min(...terrain.map(g=>g.y))-12;
  ground.unshift({type:'box',x:left,y:back,z:-3,w:Math.max(...terrain.map(g=>g.x+g.w))-left+12,d:Math.max(...terrain.map(g=>g.y+g.d))-back+12,h:3,material:layout.environment==='campus'?'#c4cdae':'#e5e1ce',r:5});
  for(const a of instances)for(const b of instances)if(a!==b)assert(!(a.x<b.x+b.w+8&&b.x<a.x+a.w+8&&a.y<b.y+b.d+8&&b.y<a.y+a.d+8),`Overlapping activity plots: ${a.entity}/${b.entity}`);
  const scene={width:1600,height:1100,seed:layout.seed,adaptiveDetail:true,camera:{azimuth:45,elevation:34},
    bounds:[[0,0,0],[Math.max(...instances.map(a=>a.x+a.w))+100,Math.max(...instances.map(a=>a.y+a.d))+110,0]],ground,scenery:[],instances,
    network:structuredClone(layout.network),routes:structuredClone(layout.routes)};
  compileNetwork(issue,scene);
  for(const item of scenery) {
    const a=instances.find(a=>a.entity===item.owner);
    for(const [x,y] of [[item.x,item.y],[a.x-22,a.y+a.d+26],[a.x+a.w+24,a.y+24],[a.x+18,a.y-24]]) {
      const candidate={...item,x,y};delete candidate.owner;
      const box=sceneryObstacles([candidate])[0]??{x:x-4,y:y-4,w:8,d:8,h:28};
      if(instances.some(b=>box.x<b.x+b.w+4&&box.x+box.w>b.x-4&&box.y<b.y+b.d+4&&box.y+box.d>b.y-4))continue;
      const blocked=scene.network.edges.some(e=>{
        if(e.surface==='cable'||(item.type==='person'&&!e.modes.some(m=>['car','van','plane'].includes(m))))return false;
        const points=e.points??[scene.network.nodes.find(n=>n.id===e.from).at,scene.network.nodes.find(n=>n.id===e.to).at];
        return points.slice(1).some((p,i)=>obstructed(points[i],p,box,e.width/2));
      });
      if(!blocked){scene.scenery.push(candidate);break;}
    }
  }
  for(const a of instances) {
    const p=scene.network.ports.find(p=>p.entity===a.entity);if(p)a.anchor=scene.network.nodes.find(n=>n.id===p.node).at;
  }
  scene.scenarioLayouts=issue.scenarios.map(s=>({scenario:s.id,...(s.actor?{actor:{identity:s.actor.identity??s.id,at:scene.routes.find(r=>r.relation===s.steps[0].state.via)?.points[0]??instances.find(a=>a.entity===s.actor.start).anchor,material:'#b58b58'}}:{}),steps:s.steps.map((step,i)=>{
    const r=issue.relationships.find(r=>r.id===(step.state?.via??step.relations[0])),a=instances.find(a=>a.entity===(step.state?.at??r.to));
    return {at:[a.x+a.w/2,a.y+a.d/2,a.h+36],links:[],...(s.actor&&(!step.state.via||actorAt(s,i).kind==='document')?{path:step.state.via?scene.routes.find(r=>r.relation===step.state.via).points:[a.anchor]}:{})};
  })}));
  if(layout.environment){scene.environment=layout.environment;scene.scenarioLayouts=scenarioLayouts(issue,scene);}
  validate(issue,scene);return scene;
}
