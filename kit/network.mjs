import assert from 'node:assert/strict';
import {roomWalls} from './rooms.mjs';

export const travelRadius={person:5,bicycle:17,car:26,van:26,plane:42,data:2,electricity:2,document:3};
const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const same=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-7);
const length=points=>points.slice(1).reduce((n,p,i)=>n+Math.hypot(...p.map((v,j)=>v-points[i][j])),0);
function index(items,label) {
  assert(Array.isArray(items),`Missing network ${label}`);
  const result=new Map();
  for(const item of items) {
    assert(item&&typeof item.id==='string'&&/^[a-z][a-z0-9-]*$/.test(item.id),`Invalid ${label} ID`);
    assert(!result.has(item.id),`Duplicate ${label}: ${item.id}`);result.set(item.id,item);
  }
  return result;
}
export function portPoint(port,instances) {
  const a=instances.find(a=>a.entity===port.entity);
  assert(a,`Unknown port owner: ${port.id}`);
  assert(['front','right'].includes(port.side)&&Number.isFinite(port.position)&&port.position>=0&&port.position<=1&&Number.isFinite(port.offset)&&port.offset>=0,`Invalid port: ${port.id}`);
  assert(port.z===undefined||(Number.isFinite(port.z)&&port.z>=0),'Invalid port elevation');
  return port.side==='front'?[a.x+a.w*port.position,a.y+a.d+port.offset,port.z??3]:[a.x+a.w+port.offset,a.y+a.d*port.position,port.z??3];
}

// Slab intersection checks the entire segment against a conservative swept actor envelope.
export function obstructed(a,b,box,radius) {
  const min=[box.x-radius,box.y-radius,-1000],max=[box.x+box.w+radius,box.y+box.d+radius,box.h+48];
  let lo=0,hi=1;
  for(let i=0;i<3;i++) {
    const delta=b[i]-a[i];
    if(Math.abs(delta)<1e-9){if(a[i]<=min[i]||a[i]>=max[i])return false;continue;}
    const t1=(min[i]-a[i])/delta,t2=(max[i]-a[i])/delta;
    lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));
    if(lo>=hi)return false;
  }
  return hi>0&&lo<1;
}

export function sceneryObstacles(scenery=[]) {
  return scenery.filter(a=>['tree','lamp','bench','van'].includes(a.type)).map(a=>({entity:`scenery ${a.type}`,x:a.x-(a.type==='tree'?6:2),y:a.y-(a.type==='tree'?6:2),w:a.type==='bench'?32:a.type==='van'?54:a.type==='tree'?12:4,d:a.type==='bench'?15:a.type==='van'?28:a.type==='tree'?12:4,h:a.h??(a.type==='bench'?16:45)}));
}

export function networkIndex(network,instances,scenery=[],walls=[]) {
  assert(network&&typeof network==='object','Invalid network');
  assert(network.setting===undefined||['outdoor','indoor'].includes(network.setting),'Invalid network setting');
  const nodes=index(network.nodes,'node'),ports=index(network.ports,'port'),edges=index(network.edges,'edge');
  for(const n of nodes.values())assert(point(n.at),`Invalid node position: ${n.id}`);
  const occupied=new Set();
  for(const p of ports.values()) {
    assert(nodes.has(p.node)&&!occupied.has(p.node),`Missing or repeated port node: ${p.id}`);occupied.add(p.node);
    assert(same(nodes.get(p.node).at,portPoint(p,instances)),`Stale port position: ${p.id}`);
  }
  const adjacency=new Map([...nodes.keys()].map(id=>[id,[]]));
  for(const e of edges.values()) {
    assert(nodes.has(e.from)&&nodes.has(e.to)&&e.from!==e.to,`Unknown edge endpoints: ${e.id}`);
    assert(['road','path','crossing','air','cable'].includes(e.surface),`Invalid surface: ${e.id}`);
    assert(Array.isArray(e.modes)&&e.modes.length&&new Set(e.modes).size===e.modes.length&&e.modes.every(m=>Object.hasOwn(travelRadius,m)),`Invalid edge modes: ${e.id}`);
    const allowed={road:['person','bicycle','car','van','data','electricity','document'],path:['person','bicycle','data','electricity','document'],crossing:['person','bicycle','data','electricity','document'],air:['plane'],cable:['data','electricity','document']};
    assert(e.modes.every(m=>allowed[e.surface].includes(m)),`Mode does not match surface: ${e.id}`);
    assert(e.oneWay===undefined||typeof e.oneWay==='boolean',`Invalid direction: ${e.id}`);
    assert(Number.isFinite(e.width)&&e.width>=Math.max(...e.modes.map(m=>travelRadius[m]*2+4)),`Insufficient width: ${e.id}`);
    const points=e.points??[nodes.get(e.from).at,nodes.get(e.to).at];
    assert(Array.isArray(points)&&points.length>=2&&points.every(point)&&same(points[0],nodes.get(e.from).at)&&same(points.at(-1),nodes.get(e.to).at),`Discontinuous edge: ${e.id}`);
    assert(length(points)>0,`Zero length edge: ${e.id}`);
    if(e.surface!=='cable')for(let i=1;i<points.length;i++)for(const a of [...instances,...sceneryObstacles(scenery),...walls]) {
      assert(!obstructed(points[i-1],points[i],a,e.width/2),`Network ${e.id} collides with ${a.entity}`);
    }
    adjacency.get(e.from).push({edge:e.id,to:e.to,points,cost:length(points),modes:e.modes});
    if(!e.oneWay)adjacency.get(e.to).push({edge:e.id,to:e.from,points:[...points].reverse(),cost:length(points),modes:e.modes});
  }
  for(const list of adjacency.values())list.sort((a,b)=>a.edge.localeCompare(b.edge));
  return {nodes,ports,edges,adjacency};
}

export function networkRoute(graph,request,relation) {
  assert(relation,'Unknown network relationship');
  const {from,to,mode,via=[]}=request;
  const a=graph.ports.get(from),b=graph.ports.get(to);
  assert(a&&b,`Unknown route ports: ${relation.id} (${from} → ${to})`);
  assert(a.entity===relation.from&&b.entity===relation.to,`Port owner differs from relationship: ${relation.id}`);
  assert(Object.hasOwn(travelRadius,mode),`Unknown route mode: ${relation.id}`);
  assert(mode==='document'?['movement','information'].includes(relation.kind):relation.kind===(mode==='data'?'information':mode==='electricity'?'electricity':'movement'),`Mode does not match relationship: ${relation.id}`);
  assert(Array.isArray(via)&&via.every(id=>graph.nodes.has(id)),`Unknown via node: ${relation.id}`);
  const points=[graph.nodes.get(a.node).at],used=[],stops=[a.node,...via,b.node];
  for(let i=1;i<stops.length;i++) {
    const distance=new Map([[stops[i-1],0]]),previous=new Map(),pending=new Set(graph.nodes.keys());
    while(pending.size) {
      const current=[...pending].sort((a,b)=>(distance.get(a)??Infinity)-(distance.get(b)??Infinity)||a.localeCompare(b))[0];
      if(!distance.has(current)||current===stops[i])break;
      pending.delete(current);
      for(const e of graph.adjacency.get(current))if(pending.has(e.to)&&e.modes.includes(mode)) {
        const cost=distance.get(current)+e.cost;
        if(cost<(distance.get(e.to)??Infinity)){distance.set(e.to,cost);previous.set(e.to,{from:current,...e});}
      }
    }
    assert(distance.has(stops[i]),`No ${mode} route: ${relation.id} (${from} → ${to})`);
    const legs=[];let current=stops[i];
    while(current!==stops[i-1]){const e=previous.get(current);legs.unshift(e);current=e.from;}
    for(const leg of legs){used.push(leg.edge);points.push(...leg.points.slice(1));}
  }
  assert(points.length>1,`Empty network journey: ${relation.id}`);
  return {points,edges:used};
}

export function compileNetwork(issue,scene) {
  for(const p of scene.network.ports) {
    const n=scene.network.nodes.find(n=>n.id===p.node);assert(n,`Missing port node: ${p.id}`);n.at=portPoint(p,scene.instances);
  }
  const graph=networkIndex(scene.network,scene.instances,scene.scenery,roomWalls(scene.rooms));
  scene.routes=scene.routes.map(r=>r.network?{...r,...networkRoute(graph,r.network,issue.relationships.find(rel=>rel.id===r.relation))}:r);
  return scene;
}

export function validateNetwork(issue,scene) {
  const walls=roomWalls(scene.rooms);
  if(walls.length)for(const route of scene.routes) {
    const rel=issue.relationships.find(r=>r.id===route.relation);if(rel?.kind!=='movement')continue;
    const kinds=issue.scenarios.flatMap(s=>{let actor=s.actor;return s.steps.flatMap(step=>{actor=step.actor??actor;return step.state?.via===rel.id&&actor?[actor.kind]:[];});});
    const radius=Math.max(5,...kinds.map(kind=>travelRadius[kind]));
    const points=route.points??[scene.instances.find(a=>a.entity===rel.from).anchor,...route.via,scene.instances.find(a=>a.entity===rel.to).anchor];
    for(let i=1;i<points.length;i++)for(const wall of walls)assert(!obstructed(points[i-1],points[i],wall,radius),`Route ${rel.id} collides with ${wall.entity}`);
  }
  if(!scene.network){assert(!scene.routes.some(r=>r.network),'Network route without network');return;}
  const graph=networkIndex(scene.network,scene.instances,scene.scenery,walls);
  for(const route of scene.routes)if(route.network) {
    const result=networkRoute(graph,route.network,issue.relationships.find(r=>r.id===route.relation));
    assert.deepEqual(route.points,result.points,`Stale network route: ${route.relation}`);
    assert.deepEqual(route.edges,result.edges,`Stale route edges: ${route.relation}`);
  }
  for(const s of issue.scenarios) {
    let actor=s.actor;
    for(const step of s.steps) {
      actor=step.actor??actor;
      const r=scene.routes.find(r=>r.relation===step.state?.via);
      if(r?.network&&actor)assert(actor.kind===r.network.mode,`Conflicting travel mode: ${r.relation}; use separate relationships`);
    }
  }
}

export function drawNetwork(network,D,instances) {
  const nodes=new Map(network.nodes.map(n=>[n.id,n.at]));
  const surfaces=network.edges.map(e=>{
    const points=e.points??[nodes.get(e.from),nodes.get(e.to)];
    if(e.surface==='air')return '';
    if(e.surface==='cable')return D.line(points,'#829a89',2,'class="network-cable"');
    if(network.setting==='indoor'&&e.surface==='path')return `<g data-network-edge="${e.id}" class="network-floor-path"></g>`;
    const color=e.surface==='road'?'#a6afa6':'#d9d4bd',radius=e.width/2;
    let out='';
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!len)continue;
      const x=-(b[1]-a[1])/len*radius,y=(b[0]-a[0])/len*radius;
      out+=D.polygon([[a[0]+x,a[1]+y,a[2]-.5],[b[0]+x,b[1]+y,b[2]-.5],[b[0]-x,b[1]-y,b[2]-.5],[a[0]-x,a[1]-y,a[2]-.5]],color);
      if(e.surface==='crossing')for(let t=8;t<len;t+=7) {
        const cx=a[0]+(b[0]-a[0])*t/len,cy=a[1]+(b[1]-a[1])*t/len;
        out+=D.line([[cx+x*.75,cy+y*.75,3],[cx-x*.75,cy-y*.75,3]],'#f1eedc',2);
      }
    }
    for(const p of points)out=D.polygon(Array.from({length:16},(_,i)=>[p[0]+Math.cos(i*Math.PI/8)*radius,p[1]+Math.sin(i*Math.PI/8)*radius,p[2]-.6]),color)+out;
    return `<g data-network-edge="${e.id}" class="network-${e.surface}">${out}</g>`;
  }).join('');
  const entrances=network.ports.map(p=>{
    if(network.setting==='indoor')return '';
    const a=instances.find(a=>a.entity===p.entity),at=nodes.get(p.node);
    const start=p.side==='front'?[at[0],a.y+a.d+2,3]:[a.x+a.w+2,at[1],3];
    const dx=p.side==='front'?6:0,dy=p.side==='front'?0:6;
    let out=D.polygon([[start[0]-dx,start[1]-dy,2.4],[at[0]-dx,at[1]-dy,2.4],[at[0]+dx,at[1]+dy,2.4],[start[0]+dx,start[1]+dy,2.4]],'#d9d4bd');
    if(network.edges.some(e=>(e.from===p.node||e.to===p.node)&&e.surface==='air'))out+=D.box(at[0]-45,at[1]-32,1,90,64,1,'#b8beb1',4)+D.line([[at[0]-22,at[1],2.4],[at[0]+22,at[1],2.4]],'#ede9d4',1.4);
    return `<g class="network-entrance" data-port="${p.id}">${out}</g>`;
  }).join('');
  return surfaces+entrances;
}
