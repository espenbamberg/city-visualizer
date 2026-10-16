import assert from 'node:assert/strict';
import {dimensions,nameplate} from './sizing.mjs';
import {compileNetwork} from './network.mjs';
import {roomWalls} from './rooms.mjs';
import {scenarioLayouts,relationshipMode} from './compose-helpers.mjs';
import {validate} from './model.mjs';

// shortcut: one front door per room and one floor; extend openings when a real journey needs another topology.
export function composeBuilding(issue,layout) {
  assert(layout.environment===undefined||layout.environment==='building','Rooms require the building environment');
  assert(Number.isSafeInteger(layout.seed)&&layout.seed>=0,'Invalid building seed');
  assert(Array.isArray(layout.rooms)&&layout.rooms.length,'Missing rooms');
  const rooms=[],instances=[],seen=new Set();let cursor=10;
  for(const room of layout.rooms) {
    const at=room.at??[cursor,10];assert(Array.isArray(at)&&at.length===2&&at.every(Number.isFinite),'Invalid room position');
    const r={id:room.id,label:room.label,x:at[0],y:at[1],w:room.w,d:room.d,h:room.h??64,door:structuredClone(room.door)};
    rooms.push(r);cursor=r.x+r.w+5;
    assert(Array.isArray(room.plots)&&room.plots.length,'Empty room');let x=16;
    for(const p of room.plots) {
      const e=issue.entities.find(e=>e.id===p.entity);assert(e&&!seen.has(e.id),'Unknown or repeated room entity');seen.add(e.id);
      const at=p.at??[x,26];assert(Array.isArray(at)&&at.length===2&&at.every(Number.isFinite),'Invalid station position');
      const a={id:e.id,entity:e.id,room:r.id,asset:p.asset,...dimensions(p),x:r.x+at[0],y:r.y+at[1],material:p.material??'#b9c7b1',sign:p.sign??e.label,...(p.process?{process:p.process}:{})};
      a.anchor=[a.x+a.w*.25,a.y+a.d+48,4];a.label=[a.x+a.w/2,a.y+a.d+9,4];a.labelStyle=nameplate(e.label,a.w);
      assert(a.anchor[1]<=r.y+r.d-26,`Room has no circulation space: ${e.id}`);
      instances.push(a);x=at[0]+a.w+60;
    }
  }
  assert(seen.size===issue.entities.length,'Every entity needs a room');roomWalls(rooms);
  for(const a of instances)for(const b of instances)if(a!==b)assert(!(a.x<b.x+b.w+8&&a.x+a.w+8>b.x&&a.y<b.y+b.d+8&&a.y+a.d+8>b.y),`Overlapping stations: ${a.entity}/${b.entity}`);
  const left=Math.min(...rooms.map(r=>r.x))-10,back=Math.min(...rooms.map(r=>r.y))-10;
  const right=Math.max(...rooms.map(r=>r.x+r.w))+10,corridor=Math.max(...rooms.map(r=>r.y+r.d))+40,front=corridor+32;
  const ground=[{type:'box',x:left,y:back,z:0,w:right-left,d:front-back,h:3,material:'#dedbca',r:4}];
  for(const r of rooms) {
    ground.push({type:'box',x:r.x,y:r.y,z:3,w:r.w,d:r.d,h:.3,material:'#e7e3d3'},
      {type:'text',at:[r.x+12,r.y+r.d-14,3.4],text:r.label.toUpperCase(),size:8,color:'#63745f',tracking:.5});
    for(let x=r.x+40;x<r.x+r.w;x+=40)ground.push({type:'line',points:[[x,r.y,3.5],[x,r.y+r.d,3.5]],color:'#d2d1bf',width:.35});
    ground.push({type:'line',points:[[r.x+r.door.offset,r.y+r.d+2,3.5],[r.x+r.door.offset+r.door.width,r.y+r.d+2,3.5]],color:'#a5b393',width:2});
  }
  const network={setting:'indoor',nodes:[],ports:[],edges:[]},junctions=new Map(),exits=[];
  const node=(point)=>{const key=point.join(',');if(!junctions.has(key)){const id=`junction-${junctions.size}`;junctions.set(key,id);network.nodes.push({id,at:point});}return junctions.get(key);};
  const edge=(from,to)=>{if(from!==to&&!network.edges.some(e=>(e.from===from&&e.to===to)||(e.from===to&&e.to===from)))network.edges.push({id:`aisle-${network.edges.length}`,from,to,surface:'path',width:20,modes:['person','document','data','electricity']});};
  for(const r of rooms) {
    const doorX=r.x+r.door.offset+r.door.width/2,lobbyY=r.y+r.d-26;
    const lane=[{x:doorX,id:node([doorX,lobbyY,4])}];
    for(const a of instances.filter(a=>a.room===r.id)) {
      const id=node(a.anchor);network.ports.push({id:`${a.entity}-entry`,node:id,entity:a.entity,side:'front',position:.25,offset:48,z:4});
      const laneId=node([a.anchor[0],lobbyY,4]);edge(id,laneId);lane.push({x:a.anchor[0],id:laneId});
    }
    lane.sort((a,b)=>a.x-b.x);for(let i=1;i<lane.length;i++)edge(lane[i-1].id,lane[i].id);
    const id=node([doorX,corridor,4]);edge(node([doorX,lobbyY,4]),id);exits.push({x:doorX,id});
  }
  exits.sort((a,b)=>a.x-b.x);for(let i=1;i<exits.length;i++)edge(exits[i-1].id,exits[i].id);
  const routes=issue.relationships.map(r=>{
    const mode=relationshipMode(issue,r);return mode?{relation:r.id,network:{from:`${r.from}-entry`,to:`${r.to}-entry`,mode}}:{relation:r.id,points:[instances.find(a=>a.entity===r.from).anchor,instances.find(a=>a.entity===r.to).anchor]};
  });
  const scene={width:1500,height:1050,seed:layout.seed,environment:'building',adaptiveDetail:true,camera:{azimuth:45,elevation:38},bounds:[[left,back,0],[right,front,0]],ground,scenery:[],rooms,instances,network,routes};
  compileNetwork(issue,scene);scene.scenarioLayouts=scenarioLayouts(issue,scene);validate(issue,scene);return scene;
}
