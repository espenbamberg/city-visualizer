import {v2Example} from './v2-example.mjs';
import {composeScene} from '../kit/compose.mjs';
import {composeLocal} from '../kit/compose-local.mjs';
import {validateViews} from '../kit/v2.mjs';

export function v3Example() {
  const bundle=v2Example(),city=bundle.views.city;
  const plot=(entity,asset,emphasis)=>({entity,asset,emphasis});
  city.layout={seed:92713,districts:[
    {label:'Verksted og nabolag',plots:[plot('workshop','workshop','primary'),plot('park','park','primary'),plot('home','house','context'),plot('van','van','context')]},
    {label:'Levering og bestilling',plots:[plot('booking','cabinet','context'),plot('depot','depot','supporting'),plot('plane','plane','context'),plot('airport','warehouse','supporting')]}
  ]};
  city.scene=composeScene(city.issue,city.layout);
  const layouts={
    workshop:{theme:'room',rows:[[plot('intake','desk','context'),plot('diagnosis','tester','primary'),plot('parts','shelf','context')],[plot('quality','tester','supporting'),plot('repair','workbench','primary')]]},
    diagnostics:{theme:'room',rows:[[plot('isolate','workbench','context'),plot('probe','tester','primary')],[plot('read','terminal','supporting'),plot('compare','desk','supporting'),plot('report','terminal','context')]]},
    booking:{theme:'digital',rows:[[plot('receive','terminal','context'),plot('validate','terminal','primary'),plot('queue','queue','context')],[plot('store','database','supporting'),plot('send','terminal','context')]]},
    validation:{theme:'digital',rows:[[plot('fields','terminal','primary'),plot('capacity','terminal','supporting')],[plot('decision','terminal','primary'),plot('accepted','queue','context'),plot('rejected','terminal','context')]]}
  };
  for(const [id,layout] of Object.entries(layouts)) {
    const view=bundle.views[id];
    for(const s of view.issue.scenarios)if(s.actor?.kind==='person')s.actor.identity=view.scene.scenarioLayouts.find(l=>l.scenario===s.id).actor.identity;
    view.layout={seed:92713,...layout};view.scene=composeLocal(view.issue,view.layout);
  }
  validateViews(bundle);return bundle;
}

// Scale fixture uses the same stories and details, with extra named service points in the root.
export function v3ScaleExample() {
  const bundle=v3Example(),city=bundle.views.city;
  for(let i=0;i<25;i++) {
    const id=`branch-${i}`;
    city.issue.entities.push({...city.issue.entities[0],id,number:String(9+i),label:`Servicepunkt ${i+1}`,description:'Lokalt servicepunkt i skalakontrollen.'});
    city.issue.relationships.push({id:`link-${i}`,from:id,to:'workshop',kind:'information',label:'Send oppdrag',source:'brief',status:'fictional'});
    if(i%5===0)city.layout.districts.push({label:`Område ${Math.floor(i/5)+1}`,plots:[]});
    city.layout.districts.at(-1).plots.push({entity:id,asset:'office',emphasis:['context','supporting','primary'][i%3]});
  }
  city.scene=composeScene(city.issue,city.layout);
  validateViews(bundle);return bundle;
}
