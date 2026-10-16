import assert from 'node:assert/strict';
import {assetDimensions} from './assets.mjs';
import {routePoints,validate} from './model.mjs';
import {composeVariable} from './compose-variable.mjs';

// District plots provide editable starting geometry; their meaning and size come from the brief.
export function composeScene(issue, layout) {
  assert(Array.isArray(issue.entities) && issue.entities.length,'Missing entities');
  assert(Array.isArray(layout.districts) && layout.districts.length,'Missing districts');
  assert(Number.isSafeInteger(layout.seed) && layout.seed>=0,'Provide a nonnegative scene seed');
  const entities = new Map(issue.entities.map(e=>[e.id,e])), seen=new Set();
  for (const district of layout.districts) {
    assert(typeof district.label==='string' && district.label.trim(),'Missing district name');
    assert(Array.isArray(district.plots) && district.plots.length,'Empty district');
    for (const plot of district.plots) {
      assert(entities.has(plot.entity) && !seen.has(plot.entity),'Unknown or repeated district entity');
      assert(Object.hasOwn(assetDimensions,plot.asset),'Unknown district asset');
      assert(plot.height===undefined || (plot.asset==='office' && Number.isFinite(plot.height) && plot.height>=65 && plot.height<=240),'Office height must be between 65 and 240');
      seen.add(plot.entity);
    }
  }
  assert(seen.size===entities.size,'Every entity needs a district plot');
  if(layout.districts.some(d=>d.plots.some(p=>p.emphasis!==undefined || p.size!==undefined)))return composeVariable(issue,layout);
  const plots=layout.districts.flatMap(d=>d.plots);
  const pitchX=Math.max(...plots.map(p=>assetDimensions[p.asset][0]))+120;
  const pitchY=Math.max(...plots.map(p=>assetDimensions[p.asset][1]))+230;
  const localCols=Math.ceil(Math.sqrt(Math.max(...layout.districts.map(d=>d.plots.length))));
  const districtCols=Math.ceil(Math.sqrt(layout.districts.length));
  const cols=districtCols*localCols, placements=[];
  let rows=0;
  for (let start=0;start<layout.districts.length;start+=districtCols) {
    const band=layout.districts.slice(start,start+districtCols);
    const columns=Math.floor(cols/band.length), height=Math.max(...band.map(d=>Math.ceil(d.plots.length/columns)));
    band.forEach((district,i)=>placements.push({column:i*columns,row:rows,columns,rows:height}));
    rows+=height;
  }
  const width=cols*pitchX, depth=rows*pitchY;
  const ground=[{type:'box',x:0,y:0,z:-3,w:width,d:depth,h:4,material:'#e4e0cf',r:6}];
  for (let row=0;row<rows;row++) {
    const y=(row+1)*pitchY-36;
    ground.push({type:'box',x:0,y:y-22,z:1,w:width,d:44,h:1,material:'#adb2a7'},
      {type:'line',points:[[0,y,2],[width,y,2]],color:'#edead9',width:1,dash:[12,18]});
  }
  for (let col=0;col<cols;col++) {
    const x=(col+1)*pitchX-32;
    ground.push({type:'box',x:x-20,y:0,z:1,w:40,d:depth,h:1,material:'#adb2a7'},
      {type:'line',points:[[x,0,2],[x,depth,2]],color:'#edead9',width:1,dash:[12,18]});
  }
  const instances=[], scenery=[], locations=new Map();
  const materials=['#c6b59b','#b7c9bb','#c5b99c','#bac1b3','#b9b6c2','#c8b6a3'];
  layout.districts.forEach((district,di)=>{
    const {column,row,columns,rows:districtRows}=placements[di];
    ground.push({type:'text',at:[column*pitchX+30,row*pitchY+22,3],text:district.label.toUpperCase(),size:13,color:'#65745e',tracking:1.2});
    district.plots.forEach((plot,pi)=>{
      const col=column+pi%columns, r=row+Math.floor(pi/columns), x=col*pitchX+40,y=r*pitchY+58;
      const [w,d,h]=assetDimensions[plot.asset], entity=entities.get(plot.entity), roadY=(r+1)*pitchY-36;
      const anchor=[x+w+20,y+d+70,3], lines=[];
      for (const word of entity.label.split(' ')) {
        if (!lines.length || (lines.at(-1)+' '+word).length>18) lines.push(word);
        else lines[lines.length-1]+=' '+word;
      }
      instances.push({id:entity.id,entity:entity.id,asset:plot.asset,x,y,w,d,h:plot.height ?? h,material:plot.material ?? materials[di%materials.length],sign:plot.sign ?? entity.label,anchor,label:[x+w/2,y+d+12,3],labelStyle:{width:Math.max(w,125),size:10,lines}});
      ground.push({type:'box',x:x-12,y:y-12,z:1,w:w+52,d:d+110,h:1,material:entity.kind==='place'?'#c4c9af':'#d7d9d0',r:3},
        {type:'box',x:anchor[0]-7,y:y+d+60,z:2,w:14,d:roadY-(y+d+60),h:.5,material:'#ddd8c2'});
      scenery.push({type:'tree',x:x-8,y:y+d+78,h:48+(pi%3)*6,seed:di+pi},
        {type:'person',id:`visitor-${entity.id}`,x:x+12,y:y+d+85,z:3},
        {type:'lamp',x:x+w+39,y:roadY-28});
      locations.set(entity.id,{col,roadY,anchor});
    });
    for (let slot=district.plots.length;slot<columns*districtRows;slot++) {
      const x=(column+slot%columns)*pitchX+24, y=(row+Math.floor(slot/columns))*pitchY+48;
      ground.push({type:'box',x,y,z:1,w:pitchX-88,d:pitchY-120,h:2,material:'#bbc6a5',r:5},
        {type:'box',x:x+20,y:y+80,z:3,w:pitchX-128,d:22,h:.5,material:'#d8d4bd'});
      for (const [dx,dy] of [[20,25],[75,28],[120,130]]) scenery.push({type:'tree',x:x+dx,y:y+dy,h:48+slot%3*5,seed:slot});
      scenery.push({type:'bench',x:x+25,y:y+105},{type:'person',id:`garden-${di}-${slot}`,x:x+105,y:y+91,z:4});
    }
  });
  const routes=issue.relationships.map((r,i)=>{
    const from=locations.get(r.from),to=locations.get(r.to);
    assert(from && to,'Unknown relationship endpoint');
    const lane=r.kind==='movement' ? 0 : (i%5-2)*2;
    const trunk=(Math.min(from.col,to.col)+1)*pitchX-32+lane;
    const points=[from.anchor,[from.anchor[0],from.roadY+lane,3],[trunk,from.roadY+lane,3],[trunk,to.roadY+lane,3],[to.anchor[0],to.roadY+lane,3],to.anchor]
      .filter((p,i,a)=>!i || p.some((v,j)=>v!==a[i-1][j]));
    return {relation:r.id,points};
  });
  const scene={width:1600,height:1100,seed:layout.seed,camera:{azimuth:45,elevation:34},bounds:[[0,0,0],[width,depth,0]],ground,scenery,instances,routes};
  scene.scenarioLayouts=issue.scenarios.map(s=>{
    const actor=s.actor ? {identity:s.actor.identity ?? s.id,at:locations.get(s.actor.start).anchor,material:'#b58b58'} : undefined;
    return {scenario:s.id,...(actor ? {actor} : {}),steps:s.steps.map(step=>{
      const relation=issue.relationships.find(r=>r.id===(step.state?.via ?? step.relations[0]));
      assert(relation,'Unknown story relationship');
      const a=instances.find(a=>a.entity===(step.state?.at ?? relation.to));
      const path=step.state?.via ? routePoints(relation,routes.find(r=>r.relation===relation.id),scene) : [a.anchor];
      return {at:[a.x+a.w/2,a.y+a.d/2,a.h+50],links:[],...(actor && (s.actor.kind==='document' || !step.state.via) ? {path} : {})};
    })};
  });
  validate(issue,scene);
  return scene;
}
