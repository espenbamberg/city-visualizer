import {v3Example} from './v3-example.mjs';
import {composeGroups} from '../kit/compose-groups.mjs';
import {compileNetwork,portPoint} from '../kit/network.mjs';
import {actorAt,validate} from '../kit/model.mjs';
import {validateViews} from '../kit/v2.mjs';

function cityLayout() {
  const network={nodes:[],ports:[],edges:[]};
  const node=(id,at)=>{network.nodes.push({id,at});return id;};
  const port=(entity,id,offset=32,side='front',position=.5)=>{
    node(id,[0,0,3]);network.ports.push({id,entity,node:id,side,position,offset});
  };
  for(const id of ['home','workshop','park','booking'])port(id,`${id}-entry`);
  port('workshop','workshop-loading',60,'right',160/190);
  port('van','van-loading',42);port('depot','depot-loading',42);
  port('plane','plane-apron',55);port('airport','airport-apron',55);
  for(const [id,at] of Object.entries({
    'home-path':[660,160,3],'cross-north':[660,168,3],'cross-center':[660,200,3],'cross-south':[660,232,3],
    'yard-east':[460,262,3],'yard-path':[460,330,3],'neighbour-path':[660,330,3],'park-path':[460,602,3],
    'road-west':[720,200,3],'road-turn':[720,214,3],'road-cross':[720,330,3],'road-south':[720,390,3],
    'loading-bay':[525,390,3],'depot-turn':[1071.5,214,3],
    'cross-west':[688,330,3],'cross-east':[752,330,3],
    'air-departure':[650,650,190],'air-approach':[680,230,190]
  }))node(id,at);
  const edge=(id,from,to,surface='path',modes=['person','bicycle','data'])=>network.edges.push({id,from,to,surface,modes,width:surface==='road'?64:surface==='air'?90:40});
  edge('home-access','home-entry','home-path');edge('home-walk','home-path','cross-north');
  edge('north-crossing','cross-north','cross-center','crossing');edge('south-crossing','cross-center','cross-south','crossing');
  edge('neighbour-walk','cross-south','neighbour-path');edge('yard-walk','neighbour-path','yard-path');
  edge('workshop-access','workshop-entry','yard-east');edge('yard-entrance','yard-east','yard-path');
  edge('park-walk','yard-path','park-path');edge('park-access','park-path','park-entry');
  edge('van-foot-access','yard-path','van-loading');
  edge('east-walk','neighbour-path','cross-west');edge('west-crossing','cross-west','road-cross','crossing');
  edge('east-crossing','road-cross','cross-east','crossing');edge('booking-access','cross-east','booking-entry');
  for(const [id,from,to] of [
    ['workshop-drive','workshop-loading','cross-center'],['yard-road','cross-center','road-west'],['north-road','road-west','road-turn'],
    ['shared-road','road-turn','road-cross'],['south-road','road-cross','road-south'],['bay-road','road-south','loading-bay'],
    ['van-access','loading-bay','van-loading'],['delivery-road','road-turn','depot-turn'],['depot-access','depot-turn','depot-loading']
  ])edge(id,from,to,'road',['car','van']);
  for(const [id,from,to] of [['takeoff','plane-apron','air-departure'],['flight','air-departure','air-approach'],['arrival','air-approach','airport-apron']])edge(id,from,to,'air',['plane']);
  // Paint crossings over the shared road surface; graph connectivity comes only from named nodes.
  network.edges.sort((a,b)=>(a.surface==='crossing')-(b.surface==='crossing'));
  const route=(relation,from,to,mode)=>({relation,network:{from,to,mode}});
  return {seed:92713,groups:[
    {label:'Verkstedtunet',pattern:'court',at:[50,40],plots:[
      {entity:'workshop',asset:'workshop',emphasis:'primary',at:[0,0]},
      {entity:'home',asset:'house',emphasis:'supporting',at:[450,0]},
      {entity:'van',asset:'van',emphasis:'context',at:[450,210]}]},
    {label:'Park og opphold',pattern:'green',at:[50,390],plots:[{entity:'park',asset:'park',emphasis:'primary'}]},
    {label:'Levering og bestilling',pattern:'street',at:[760,40],plots:[
      {entity:'airport',asset:'warehouse',emphasis:'supporting',at:[0,0]},
      {entity:'depot',asset:'depot',emphasis:'supporting',at:[250,0]},
      {entity:'booking',asset:'cabinet',emphasis:'context',at:[250,250]},
      {entity:'plane',asset:'plane',emphasis:'context',at:[0,400]}]}
  ],network,routes:[route('visit','home-entry','workshop-entry','person'),route('rest','workshop-entry','park-entry','person'),route('cycle','park-entry','home-entry','bicycle'),
    route('load','workshop-entry','van-loading','person'),route('deliver','van-loading','depot-loading','van'),route('request','home-entry','booking-entry','data'),
    route('order','booking-entry','workshop-entry','data'),route('air','plane-apron','airport-apron','plane')]};
}

function localNetwork(issue,scene) {
  const nodes=[],edges=[],ports=[],byPoint=new Map();
  const node=point=>{const key=JSON.stringify(point);if(!byPoint.has(key)){const id=`junction-${nodes.length}`;byPoint.set(key,id);nodes.push({id,at:point});}return byPoint.get(key);};
  for(const a of scene.instances) {
    const p={id:`${a.entity}-entry`,entity:a.entity,side:'front',position:.25,offset:64};
    a.anchor=portPoint(p,scene.instances);p.node=node(a.anchor);ports.push(p);
  }
  const kind=new Map();
  for(const s of issue.scenarios)if(s.actor)s.steps.forEach((step,i)=>{if(step.state.via)kind.set(step.state.via,actorAt(s,i).kind);});
  for(const route of scene.routes) {
    const relation=issue.relationships.find(r=>r.id===route.relation),mode=kind.get(relation.id)??(relation.kind==='movement'?'person':'data');
    route.points[0]=scene.instances.find(a=>a.entity===relation.from).anchor;
    route.points[route.points.length-1]=scene.instances.find(a=>a.entity===relation.to).anchor;
    route.network={from:`${relation.from}-entry`,to:`${relation.to}-entry`,mode};
    for(let i=1;i<route.points.length;i++) {
      const from=node(route.points[i-1]),to=node(route.points[i]);if(from===to)continue;
      let edge=edges.find(e=>(e.from===from&&e.to===to)||(e.from===to&&e.to===from));
      if(!edge){edge={id:`link-${edges.length}`,from,to,surface:'cable',modes:[],width:20};edges.push(edge);}
      if(!edge.modes.includes(mode))edge.modes.push(mode);
      if(mode==='person'){edge.surface='path';edge.width=20;}
    }
  }
  scene.network={nodes,edges,ports};compileNetwork(issue,scene);
  for(const l of scene.scenarioLayouts) {
    const s=issue.scenarios.find(s=>s.id===l.scenario);
    if(s.actor)l.actor.at=scene.routes.find(r=>r.relation===s.steps[0].state.via).points[0];
    l.steps.forEach((step,i)=>{if(step.path&&s.steps[i].state.via)step.path=scene.routes.find(r=>r.relation===s.steps[i].state.via).points;});
  }
}

export function v4Example() {
  const bundle=v3Example(),city=bundle.views.city;
  city.layout=cityLayout();city.scene=composeGroups(city.issue,city.layout);
  const processes={
    workshop:{intake:'intake',diagnosis:'measurement',parts:'storage',repair:'repair',quality:'measurement'},
    diagnostics:{isolate:'repair',probe:'measurement',read:'readout',compare:'record',report:'dispatch'},
    booking:{receive:'record',validate:'checks',queue:'queue',send:'dispatch'},
    validation:{fields:'checks',capacity:'checks',decision:'checks',accepted:'queue',rejected:'dispatch'}
  };
  const focus={
    workshop:{repair:[[['diagnosis','probes'],['diagnosis','meter']],[['parts','labels'],['parts','stock']],[['repair','component'],['repair','tools']],[['quality','meter']]],missing:[[['diagnosis','meter']],[['intake','record','waiting']]]},
    diagnostics:{measure:[[['probe','component'],['probe','probes']],[['read','input'],['read','display']],[['compare','record']],[['report','output']]]},
    booking:{accepted:[[['validate','fields'],['validate','capacity']],[['queue','tickets','waiting']],[],[['send','output']]],incomplete:[[['validate','fields','blocked']],[['receive','contact','waiting']]]},
    validation:{ok:[[['capacity','capacity','done']],[['decision','fields','done'],['decision','capacity','done'],['decision','decision']],[['accepted','released','done']]],missing:[[['fields','fields','blocked'],['rejected','output']]]}
  };
  for(const [id,view] of Object.entries(bundle.views)) {
    view.scene.adaptiveDetail=true;
    if(!processes[id])continue;
    // The saved scene is the authored V4 interior; the old V3 row layout no longer describes its content.
    delete view.layout;
    for(const a of view.scene.instances)if(processes[id][a.entity])a.process=processes[id][a.entity];
    localNetwork(view.issue,view.scene);
    for(const layout of view.scene.scenarioLayouts) {
      layout.steps.forEach((placement,i)=>{
        placement.parts=focus[id][layout.scenario][i].map(([entity,part,state='active'])=>({entity,part,state}));
      });
    }
    validate(view.issue,view.scene);
  }
  validateViews(bundle);return bundle;
}

export function v4ScaleExample() {
  const bundle=v4Example(),city=bundle.views.city,layout=city.layout;
  const net=layout.network;
  net.nodes.push({id:'regional-spine',at:[1390,390,3]});
  net.edges.push({id:'regional-access',from:'cross-east',to:'regional-spine',surface:'path',modes:['person','bicycle','data'],width:40,
    points:[[752,330,3],[950,390,3],[1390,390,3]]});
  let previous='regional-spine';
  for(let g=0;g<5;g++) {
    const y=800+g*330,group={label:`Serviceområde ${g+1}`,pattern:'street',at:[40,y],plots:[]};
    const junction=`regional-${g}`;net.nodes.push({id:junction,at:[1390,y+230,3]});
    net.edges.push({id:`regional-road-${g}`,from:previous,to:junction,surface:'path',modes:['person','bicycle','data'],width:40});previous=junction;
    let previousWalk=null;
    for(let i=0;i<5;i++) {
      const id=`branch-${g*5+i}`,port=`${id}-entry`,node=`${id}-walk`;
      city.issue.entities.push({...city.issue.entities[0],id,number:String(city.issue.entities.length+1),label:`Servicepunkt ${g*5+i+1}`,description:'Lokalt servicepunkt i skalakontrollen.'});
      city.issue.relationships.push({id:`${id}-order`,from:id,to:'workshop',kind:'information',label:'Send oppdrag',source:'brief',status:'fictional'});
      group.plots.push({entity:id,asset:'office',emphasis:['context','supporting','primary'][i%3],at:[i*250,0]});
      net.nodes.push({id:port,at:[0,0,3]},{id:node,at:[40+i*250+210,y+230,3]});
      net.ports.push({id:port,node:port,entity:id,side:'front',position:.5,offset:40});
      net.edges.push({id:`${id}-access`,from:port,to:node,surface:'path',modes:['person','bicycle','data'],width:40});
      if(previousWalk)net.edges.push({id:`${id}-shared`,from:previousWalk,to:node,surface:'path',modes:['person','bicycle','data'],width:40});
      previousWalk=node;
      layout.routes.push({relation:`${id}-order`,network:{from:port,to:'workshop-entry',mode:'data'}});
    }
    net.edges.push({id:`regional-entry-${g}`,from:previousWalk,to:junction,surface:'path',modes:['person','bicycle','data'],width:40});
    layout.groups.push(group);
  }
  city.scene=composeGroups(city.issue,layout);validateViews(bundle);return bundle;
}
