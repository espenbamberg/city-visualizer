import assert from 'node:assert/strict';
import {dimensions,nameplate} from './sizing.mjs';
import {validate,actorAt} from './model.mjs';
import {compileNetwork} from './network.mjs';
import {relationshipMode,scenarioLayouts} from './compose-helpers.mjs';
import {isOutdoor} from './outdoor-assets.mjs';

// Local rows are authored in workflow order; each station reserves its own working area.
export function composeLocal(issue,layout) {
  assert(layout.environment===undefined||['workspace','technical'].includes(layout.environment),'Rows require workspace or technical');
  if(layout.environment)layout={theme:layout.environment==='technical'?'digital':'room',...layout};
  assert(['room','digital'].includes(layout.theme),'Unknown local theme');
  assert(Number.isSafeInteger(layout.seed) && layout.seed>=0,'Invalid local seed');
  assert(Array.isArray(layout.rows) && layout.rows.length>0,'Missing local rows');
  const seen=new Set(),entities=new Map(issue.entities.map(e=>[e.id,e]));
  const rows=layout.rows.map(plots=>{
    assert(Array.isArray(plots) && plots.length,'Empty local row');
    return plots.map(p=>{
      assert(entities.has(p.entity) && !seen.has(p.entity),'Unknown or repeated local entity');seen.add(p.entity);
      const a={...p,...dimensions(p)};
      a.width=Math.max(a.w,105)+70;a.depth=a.d+100;
      return a;
    });
  });
  assert(seen.size===entities.size,'Missing local entity');
  const width=Math.max(...rows.map(row=>row.reduce((n,a)=>n+a.width,0)))+60;
  const instances=[],locations=new Map();
  let y=36;
  for(const [ri,row] of rows.entries()) {
    const rowWidth=row.reduce((n,a)=>n+a.width,0),gap=row.length>1?(width-60-rowWidth)/(row.length-1):0;
    let x=30;
    const corridor=y+Math.max(...row.map(a=>a.depth))+16;
    for(const plot of row) {
      const {w,d,h,size,emphasis}=plot,entity=entities.get(plot.entity);
      const anchor=[x+w+22,y+d+64,4];
      instances.push({id:entity.id,entity:entity.id,asset:plot.asset,x,y,w,d,h,anchor,label:[x+w/2,y+d+20,4],labelStyle:nameplate(entity.label,w),material:plot.material ?? ['#b3c2ad','#b7c5ba','#c6b594'][ri%3],sign:plot.sign ?? (isOutdoor(plot)?undefined:entity.label.toUpperCase()),...(size?{size}:{}),...(emphasis?{emphasis}:{})});
      if(plot.process)instances.at(-1).process=plot.process;
      locations.set(entity.id,{anchor,corridor});x+=plot.width+gap;
    }
    y=corridor+55;
  }
  const depth=y,ground=[{type:'box',x:0,y:0,z:0,w:width,d:depth,h:3,material:layout.theme==='room'?'#ded9c9':'#c1cfc9',r:5}];
  if(layout.theme==='room') {
    ground.push({type:'box',x:0,y:0,z:3,w:width,d:4,h:62,material:'#c4c6b5'},{type:'box',x:0,y:0,z:3,w:4,d:depth,h:46,material:'#b8c3b4'});
    for(let x=40;x<width;x+=40)ground.push({type:'line',points:[[x,4,3.1],[x,depth,3.1]],color:'#cfcdbe',width:.35});
    for(let y=40;y<depth;y+=40)ground.push({type:'line',points:[[4,y,3.1],[width,y,3.1]],color:'#cfcdbe',width:.35});
  }
  for(const a of instances)ground.push({type:'box',x:a.x-8,y:a.y-8,z:3,w:a.w+16,d:a.d+34,h:.5,material:layout.theme==='room'?'#d4d5c4':'#d3ded5',r:3});
  const spine=width-18;
  const routes=issue.relationships.map(r=>{
    const a=locations.get(r.from),b=locations.get(r.to);assert(a&&b,'Unknown local route endpoint');
    const points=a.corridor===b.corridor?[a.anchor,[a.anchor[0],a.corridor,4],[b.anchor[0],b.corridor,4],b.anchor]:[a.anchor,[a.anchor[0],a.corridor,4],[spine,a.corridor,4],[spine,b.corridor,4],[b.anchor[0],b.corridor,4],b.anchor];
    return {relation:r.id,points:points.filter((p,i,list)=>!i || p.some((v,j)=>v!==list[i-1][j]))};
  });
  const scene={width:1400,height:1000,seed:layout.seed,camera:{azimuth:45,elevation:38},bounds:[[0,0,0],[width,depth,0]],ground,scenery:[],instances,routes};
  scene.scenarioLayouts=issue.scenarios.map(s=>({scenario:s.id,...(s.actor?{actor:{identity:s.actor.identity ?? s.id,at:locations.get(s.actor.start).anchor,material:'#aa8557'}}:{}),steps:s.steps.map((step,i)=>{
    const r=issue.relationships.find(r=>r.id===(step.state?.via ?? step.relations[0]));
    const a=instances.find(a=>a.entity===(step.state?.at ?? r.to));
    return {at:[a.x+a.w/2,a.y+a.d/2,a.h+28],links:[],...(s.actor && (!step.state.via || actorAt(s,i).kind==='document')?{path:step.state.via?routes.find(r=>r.relation===step.state.via).points:[a.anchor]}:{})};
  })}));
  if(layout.environment) {
    scene.environment=layout.environment;scene.adaptiveDetail=true;
    const digital=layout.theme==='digital',network={setting:'indoor',nodes:[],ports:[],edges:[]};
    const modes=digital?['document','data','electricity']:['person','document','data','electricity'];
    const edge=(from,to)=>network.edges.push({id:`aisle-${network.edges.length}`,from,to,surface:digital?'cable':'path',width:20,modes});
    const lanes=new Map();
    for(const a of instances) {
      const y=locations.get(a.entity).corridor;
      a.anchor=[a.x+a.w*.25,a.y+a.d+64,4];
      network.nodes.push({id:`port-${a.entity}`,at:a.anchor},{id:`lane-${a.entity}`,at:[a.anchor[0],y,4]});
      network.ports.push({id:`${a.entity}-entry`,node:`port-${a.entity}`,entity:a.entity,side:'front',position:.25,offset:64,z:4});
      edge(`port-${a.entity}`,`lane-${a.entity}`);
      if(!lanes.has(y))lanes.set(y,[]);lanes.get(y).push(a);
    }
    let previous;
    for(const [y,items] of [...lanes].sort((a,b)=>a[0]-b[0])) {
      const id=`spine-${lanes.size}-${network.nodes.length}`;network.nodes.push({id,at:[spine,y,4]});
      items.sort((a,b)=>a.anchor[0]-b.anchor[0]);
      for(let i=1;i<items.length;i++)edge(`lane-${items[i-1].entity}`,`lane-${items[i].entity}`);
      edge(`lane-${items.at(-1).entity}`,id);if(previous)edge(previous,id);previous=id;
    }
    scene.network=network;
    scene.routes=issue.relationships.map((r,i)=>{const mode=relationshipMode(issue,r);return mode?{relation:r.id,network:{from:`${r.from}-entry`,to:`${r.to}-entry`,mode}}:{...routes[i],points:[instances.find(a=>a.entity===r.from).anchor,...routes[i].points.slice(1,-1),instances.find(a=>a.entity===r.to).anchor]};});
    compileNetwork(issue,scene);scene.scenarioLayouts=scenarioLayouts(issue,scene);
  }
  validate(issue,scene);return scene;
}
