import {dimensions,nameplate} from './sizing.mjs';
import {validate,actorAt} from './model.mjs';

// Shelf rows reserve each footprint, rather than charging every plot for the largest building.
export function packPlots(plots) {
  const items=plots.map((plot,index)=>({...plot,...dimensions(plot),index}));
  for(const a of items) {a.plotWidth=Math.max(a.w+84,145);a.plotDepth=a.d+116;}
  items.sort((a,b)=>b.w*b.d-a.w*a.d || a.index-b.index);
  const target=Math.max(...items.map(a=>a.plotWidth),Math.sqrt(items.reduce((n,a)=>n+a.plotWidth*a.plotDepth,0))*1.3);
  const rows=[];
  for(const item of items) {
    let row=rows.find(r=>r.width+item.plotWidth<=target);
    if(!row){row={items:[],width:0,depth:0};rows.push(row);}
    row.items.push({...item,localX:row.width});row.width+=item.plotWidth;row.depth=Math.max(row.depth,item.plotDepth);
  }
  let y=0;
  for(const row of rows){row.y=y;y+=row.depth+60;}
  return {rows,width:Math.max(...rows.map(r=>r.width))+70,depth:y+40};
}

export function composeVariable(issue,layout) {
  // shortcut: orthogonal neighbourhood corridors; author routes/surfaces for rail, water or irregular geography.
  const travel=new Map();
  for(const s of issue.scenarios)if(s.actor)s.steps.forEach((step,i)=>{
    const kind=actorAt(s,i).kind;
    if(step.state.via && ['car','van','plane'].includes(kind))travel.set(step.state.via,kind==='plane'?'air':'road');
  });
  const vehicleAccess=new Set(),airAccess=new Set();
  for(const r of issue.relationships) {
    if(travel.get(r.id)==='road')for(const id of [r.from,r.to])vehicleAccess.add(id);
    if(travel.get(r.id)==='air')for(const id of [r.from,r.to])airAccess.add(id);
  }
  const districts=layout.districts.map(d=>({...d,...packPlots(d.plots)}));
  const across=Math.ceil(Math.sqrt(districts.length));
  let totalWidth=0,totalDepth=0;
  for(let i=0;i<districts.length;i+=across) {
    const band=districts.slice(i,i+across);let x=0;
    const height=Math.max(...band.map(d=>d.depth));
    for(const d of band){d.x=x;d.y=totalDepth;d.boulevard=totalDepth+height+30;x+=d.width+70;}
    totalWidth=Math.max(totalWidth,x);totalDepth+=height+70;
  }
  const ground=[{type:'box',x:0,y:0,z:-3,w:totalWidth,d:totalDepth,h:4,material:'#e4e0cf',r:6}];
  const instances=[],scenery=[],locations=new Map(),markings=[];
  const road=(x,y,w,d)=>ground.push({type:'box',x,y,z:1,w,d,h:1,material:'#adb2a7'});
  const footpath=(x,y,w,d)=>ground.push({type:'box',x,y,z:2,w,d,h:.5,material:'#ddd8c2'});
  const crossing=(x,y,vertical)=>{
    for(let i=-18;i<=18;i+=6)markings.push({type:'box',x:x+(vertical?-7:i),y:y+(vertical?i:-7),z:2.6,w:vertical?14:3,d:vertical?3:14,h:.2,material:'#edead9'});
  };
  const joined=districts.length>1,crossBand=districts.length>across,trunk=totalWidth-26;
  // Shared side streets join a district spine. Only multi-district maps need a boulevard.
  for(const [di,district] of districts.entries()) {
    const spine=district.x+district.width-30,boulevard=district.boulevard;
    const rowY=row=>district.y+40+row.y+row.depth+24;
    const first=rowY(district.rows[0]),last=rowY(district.rows.at(-1)),end=joined?boulevard:last;
    if(district.rows.length>1 || joined) {
      road(spine-22,first-22,44,end-first+44);
      footpath(spine-42,first-42,16,end-first+16);
    }
    ground.push({type:'text',at:[district.x+20,district.y+20,3],text:district.label.toUpperCase(),size:13,color:'#65745e',tracking:1.2});
    for(const row of district.rows) {
      const roadY=rowY(row),start=district.x+row.items[0].localX+row.items[0].w+42;
      road(start-28,roadY-22,spine-start+50,44);
      footpath(start-8,roadY-42,spine-start-18,16);
      if(district.rows.length>1 || joined)crossing(spine-34,roadY,true);
      markings.push({type:'line',points:[[start,roadY,2.6],[spine-24,roadY,2.6]],color:'#edead9',width:1,dash:[12,18]});
      // A marked end bay terminates the branch, rather than leaving an unexplained road tail.
      markings.push({type:'line',points:[[start-22,roadY-16,2.6],[start-22,roadY+16,2.6]],color:'#edead9',width:1});
      scenery.push({type:'lamp',x:spine+34,y:roadY+32});
      for(const plot of row.items) {
        const x=district.x+plot.localX+20,y=district.y+row.y+40,{w,d,h,size,emphasis}=plot;
        const entity=issue.entities.find(e=>e.id===plot.entity),anchor=[x+w+22,y+d+76,3];
        const material=plot.material ?? ['#c6b59b','#b7c9bb','#bac1b3','#b9b6c2'][di%4];
        const labelStyle=nameplate(entity.label,w);
        instances.push({id:entity.id,entity:entity.id,asset:plot.asset,x,y,w,d,h,material,sign:plot.sign ?? entity.label,anchor,label:[x+w/2,y+d+12,3],labelStyle,...(size?{size}:{}),...(emphasis?{emphasis}:{})});
        ground.push({type:'box',x:x-10,y:y-10,z:1,w:plot.plotWidth-20,d:plot.plotDepth-8,h:1,material:entity.kind==='place'?'#c4c9af':'#d7d9d0',r:3});
        if(airAccess.has(entity.id)) {
          road(anchor[0]-45,anchor[1]-30,90,60);
          markings.push({type:'line',points:[[anchor[0]-25,anchor[1],2.6],[anchor[0]+25,anchor[1],2.6]],color:'#edead9',width:1,dash:[5,5]});
        } else if(vehicleAccess.has(entity.id)) {
          road(anchor[0]-28,anchor[1]-28,56,roadY-anchor[1]+28);
          crossing(anchor[0],roadY-34,false);
        }
        footpath(anchor[0]-8,y+d+50,16,roadY-y-d-76);
        const entry=x+({house:58,office:58,depot:40,warehouse:99}[plot.asset] ?? (plot.asset==='park'?w*.44+12:w/2));
        footpath(entry-6,y+d,12,58);
        footpath(entry-6,y+d+50,anchor[0]-entry+14,12);
        scenery.push({type:'tree',x:x+8,y:y+d+75,h:46,seed:di+plot.index},{type:'person',id:`visitor-${entity.id}`,x:x+35,y:y+d+80,z:3});
        locations.set(entity.id,{anchor,roadY,spine,boulevard});
      }
    }
  }
  if(joined)for(let i=0;i<districts.length;i+=across) {
    const band=districts.slice(i,i+across),start=band[0].x+band[0].width-30,end=crossBand?trunk:band.at(-1).x+band.at(-1).width-30,y=band[0].boulevard;
    road(start-22,y-22,end-start+44,44);
    footpath(start-42,y-42,end-start+16,16);
    for(const d of band)crossing(d.x+d.width-30,y-34,false);
    if(crossBand)crossing(trunk-34,y,true);
  }
  if(crossBand) {
    const first=districts[0].boulevard,last=districts.at(-1).boulevard;
    road(trunk-22,first-22,44,last-first+44);
    footpath(trunk-42,first-42,16,last-first+16);
  }
  ground.push(...markings);
  const routes=issue.relationships.map((r,i)=>{
    const a=locations.get(r.from),b=locations.get(r.to);
    if(!a || !b)throw Error('Unknown relationship endpoint');
    const mode=travel.get(r.id),lane=mode==='road'?0:-34+(r.kind==='movement'?0:(i%3-1)*2);
    let points;
    if(mode==='air')points=[a.anchor,[a.anchor[0],a.anchor[1]+90,120],[b.anchor[0],b.anchor[1]+90,120],b.anchor];
    else if(a.roadY===b.roadY && a.spine===b.spine)points=[a.anchor,[a.anchor[0],a.roadY+lane,3],[b.anchor[0],b.roadY+lane,3],b.anchor];
    else if(a.spine===b.spine)points=[a.anchor,[a.anchor[0],a.roadY+lane,3],[a.spine+lane,a.roadY+lane,3],[a.spine+lane,b.roadY+lane,3],[b.anchor[0],b.roadY+lane,3],b.anchor];
    else points=[a.anchor,[a.anchor[0],a.roadY+lane,3],[a.spine+lane,a.roadY+lane,3],[a.spine+lane,a.boulevard+lane,3],...(a.boulevard===b.boulevard?[]:[[trunk+lane,a.boulevard+lane,3],[trunk+lane,b.boulevard+lane,3]]),[b.spine+lane,b.boulevard+lane,3],[b.spine+lane,b.roadY+lane,3],[b.anchor[0],b.roadY+lane,3],b.anchor];
    return {relation:r.id,points:points.filter((p,i,list)=>!i||p.some((v,j)=>v!==list[i-1][j]))};
  });
  const scene={width:1600,height:1100,seed:layout.seed,camera:{azimuth:45,elevation:34},bounds:[[0,0,0],[totalWidth,totalDepth,0]],ground,scenery,instances,routes};
  scene.scenarioLayouts=issue.scenarios.map(s=>({scenario:s.id,...(s.actor?{actor:{identity:s.actor.identity ?? s.id,at:locations.get(s.actor.start).anchor,material:'#b58b58'}}:{}),steps:s.steps.map((step,i)=>{
    const relation=issue.relationships.find(r=>r.id===(step.state?.via ?? step.relations[0]));
    const a=instances.find(a=>a.entity===(step.state?.at ?? relation.to));
    return {at:[a.x+a.w/2,a.y+a.d/2,a.h+40],links:[],...(s.actor && (!step.state.via || actorAt(s,i).kind==='document')?{path:step.state.via?routes.find(r=>r.relation===step.state.via).points:[a.anchor]}:{})};
  })}));
  validate(issue,scene);return scene;
}
