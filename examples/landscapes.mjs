import {composeLandscape} from '../kit/compose-landscape.mjs';
import {dimensions} from '../kit/sizing.mjs';
import {validateViews} from '../kit/v2.mjs';

const source={source:'brief',status:'fictional'};
const entity=(id,label,description,constraint,kind='station',i=0)=>({id,label,description,constraint,kind,number:String(i+1).padStart(2,'0'),role:label,...source});
const relation=(id,from,to,label,kind='movement')=>({id,from,to,label,kind,...source});
const step=(title,text,via,at)=>({title,text,relations:[via],state:{at,via,moving:title,caption:title}});
const story=(id,label,condition,outcome,steps,start,kind='person')=>({id,number:id==='complete'?'01':'02',label,summary:condition,condition,outcome,actor:{kind,label:kind==='data'?'Bestillingen':'Medarbeideren',start,identity:kind==='data'?'order':'colleague'},steps});

function serviceIssue(environment) {
  const titles={city:'Et oppdrag gjennom byen',campus:'Utstyr på et felles område',building:'Fra mottak til utlevering',workspace:'Kontroll ved arbeidsbenken'};
  const local=environment==='workspace';
  return {
    title:titles[environment],question:local?'Hvordan blir et apparat kontrollert før det leveres tilbake?':'Hvordan følger medarbeideren et apparat gjennom mottak, kontroll og utlevering?',
    summary:local?'Medarbeideren registrerer apparatet, måler funksjonen og dokumenterer resultatet. En feil må avklares før apparatet kan frigis.':'Apparatet registreres, kontrolleres og leveres ut. Medarbeideren følger det mellom aktivitetene; manglende opplysninger sender arbeidet tilbake til mottaket.',
    status:'fictional',sources:[{id:'brief',title:'Et illustrativt serviceoppdrag',locator:'brief.md',date:'2026-10-13'}],
    presentation:{eyebrow:'CityVisualizer · landskap',layoutNote:{city:'Selvstendige virksomheter langs en delt gate. Plasseringene er forenklet.',campus:'Ett felles område med ganginngang, tun og funksjonsgrupper.',building:'Tre rom på ett plan. Snittveggene viser åpningene mot en felles korridor.',workspace:'Et arbeidsområde med mottaksbord, måleutstyr og dokumentasjon.'}[environment]},
    entities:[
      entity('intake',local?'Registrering':'Mottak','Registrerer apparatnummer, kontakt og beskrivelse av feilen.','Apparatnummer og kontakt må være kjent.','station',0),
      entity('check',local?'Målebenk':'Kontroll','Sammenligner apparatets funksjon med arbeidsordren.','Måleresultatet må godkjennes før utlevering.','station',1),
      entity('release',local?'Resultat':'Utlevering','Registrerer resultatet og bekrefter overleveringen.','Apparatet frigis først når kontrollen er godkjent.','station',2)
    ],
    relationships:[relation('inspect','intake','check','Til kontroll'),relation('deliver','check','release','Til utlevering'),relation('clarify','check','intake','Tilbake for avklaring')],
    scenarios:[
      story('complete',local?'Mål og dokumenter':'Fra mottak til ferdig', 'Apparatet og arbeidsordren er mottatt.','Resultatet er dokumentert og apparatet er klart for overlevering.',[
        step('Kontroller apparatet','Medarbeideren tar apparatet til målebenken og sammenligner funksjonen med feilen som er meldt.','inspect','check'),
        step('Dokumenter og lever ut','Målingen er godkjent. Medarbeideren registrerer resultatet og bekrefter hvem som mottar apparatet.','deliver','release')],'intake'),
      story('missing','Når opplysninger mangler','Arbeidsordren mangler opplysninger om når feilen oppstår.','Mottaket innhenter opplysningene. Utleveringen venter.',[
        step('Oppdag mangelen','Ved kontrollen oppdager medarbeideren at feilen ikke kan gjenskapes med opplysningene som er registrert.','inspect','check'),
        step('Avklar med mottaket','Medarbeideren går tilbake med apparatet. Mottaket kontakter avsenderen før kontrollen fortsetter.','clarify','intake')],'intake')
    ]
  };
}

export function buildingLayout() {
  return {seed:81403,environment:'building',rooms:[
    {id:'reception',label:'Mottaksrom',w:180,d:208,door:{offset:105,width:48},plots:[{entity:'intake',asset:'desk',size:'regular',process:'record'}]},
    {id:'inspection',label:'Kontrollrom',w:252,d:240,door:{offset:178,width:48},plots:[{entity:'check',asset:'tester',size:'expanded',process:'measurement'}]},
    {id:'dispatch',label:'Utleveringsrom',w:180,d:208,door:{offset:105,width:48},plots:[{entity:'release',asset:'desk',size:'regular',process:'dispatch'}]}
  ]};
}

function outdoorLayout(environment) {
  const campus=environment==='campus',positions=campus?[[20,20],[220,140],[600,20]]:[[20,30],[265,30],[690,30]];
  const plots=[{entity:'intake',asset:'office',size:'compact'},{entity:'check',asset:'workshop',size:'expanded'},{entity:'release',asset:'office',size:'compact'}];
  const network={nodes:[],ports:[],edges:[]},laneY=campus?450:330;
  const groups=plots.map((p,i)=>({label:(campus?['Inngang','Felles verksted','Utlevering']:['Mottakskontor','Serviceverksted','Utleveringskontor'])[i],pattern:campus?(i===1?'court':'green'):'street',at:positions[i],plots:[p]}));
  const edge=(id,from,to,surface='path',width=28)=>network.edges.push({id,from,to,surface,width,modes:['person']});
  plots.forEach((p,i)=>{
    const a=dimensions(p),x=positions[i][0]+a.w/2,y=positions[i][1]+a.d+36;
    network.nodes.push({id:`${p.entity}-port`,at:[x,y,3]},{id:`${p.entity}-lane`,at:[x,laneY,3]});
    network.ports.push({id:`${p.entity}-entry`,entity:p.entity,node:`${p.entity}-port`,side:'front',position:.5,offset:36});
    edge(`${p.entity}-access`,`${p.entity}-port`,`${p.entity}-lane`);
    if(i)edge(`shared-${i}`,`${plots[i-1].entity}-lane`,`${p.entity}-lane`);
  });
  if(campus) {
    network.nodes.push({id:'entrance',at:[positions[0][0]+dimensions(plots[0]).w/2,laneY+75,3]});
    edge('common-entrance','entrance','intake-lane');
  } else {
    network.nodes.push({id:'street-west',at:[0,laneY+64,3]},{id:'street-east',at:[840,laneY+64,3]});
    network.edges.push({id:'public-street',from:'street-west',to:'street-east',surface:'road',width:64,modes:['car','van']});
  }
  return {seed:81403,environment,groups,network,routes:[['inspect','intake','check'],['deliver','check','release'],['clarify','check','intake']].map(([relation,from,to])=>({relation,network:{from:`${from}-entry`,to:`${to}-entry`,mode:'person'}}))};
}

function technicalView() {
  const issue={title:'Fra bestilling til kvittering',question:'Når kan en digital bestilling bekreftes?',summary:'Tjenesten kontrollerer obligatoriske felt og ledig kapasitet, lagrer bestillingen og sender kvittering. Manglende felt sendes tilbake til avsenderen.',status:'fictional',sources:[{id:'brief',title:'Illustrativ bestillingsflyt',locator:'brief.md',date:'2026-10-13'}],presentation:{eyebrow:'CityVisualizer · landskap',layoutNote:'Skjematisk dataflyt: arbeidsflater og kort viser logiske funksjoner, ikke faktiske servere eller rom.'},entities:[
    entity('input','Inndata','Tar imot kontakt, valgt tid og bestilling.','Alle obligatoriske felt må følge med.','system',0),
    entity('validate','Validering','Kontrollerer feltene og om tiden fortsatt er ledig.','Begge kontrollene må bestås.','system',1),
    entity('store','Lagring','Lagrer den godkjente bestillingen med et unikt nummer.','Kvittering sendes først når lagringen er bekreftet.','system',2),
    entity('receipt','Kvittering','Returnerer bestillingsnummer og avtalt tid.','Avsenderen må kunne knytte kvitteringen til bestillingen.','system',3)
  ],relationships:[relation('check','input','validate','Kontroller bestillingen','information'),relation('save','validate','store','Lagre godkjent bestilling','information'),relation('confirm','store','receipt','Bekreft lagring','information'),relation('reject','validate','input','Be om manglende felt','information')],scenarios:[
    story('complete','Godkjent bestilling','Alle felt er utfylt og tiden er ledig.','Avsenderen har en kvittering med bestillingsnummer.',[
      step('Kontroller feltene','Valideringen kontrollerer kontaktopplysningene og at valgt tid er ledig.','check','validate'),step('Lagre bestillingen','Den godkjente bestillingen får et unikt nummer og lagres.','save','store'),step('Send kvitteringen','Bekreftet lagring utløser en kvittering med nummer og avtalt tid.','confirm','receipt')],'input','data'),
    story('missing','Manglende felt','Kontaktopplysningene er ufullstendige.','Avsenderen får vite hvilke felt som må fylles ut. Bestillingen er ikke lagret.',[
      step('Finn mangelen','Valideringen oppdager at kontaktopplysningene mangler.','check','validate'),step('Be om retting','Avsenderen får en konkret melding om feltet som må fylles ut før et nytt forsøk.','reject','input')],'input','data')
  ]};
  const layout={environment:'technical',seed:81403,rows:[[{entity:'input',asset:'terminal',size:'regular',process:'record'},{entity:'validate',asset:'terminal',size:'expanded',process:'checks'}],[{entity:'store',asset:'terminal',size:'regular',process:'readout'},{entity:'receipt',asset:'terminal',size:'regular',process:'dispatch'}]]};
  return {issue,layout,scene:composeLandscape(issue,layout)};
}

export function landscapeExamples() {
  const bundles={};
  for(const environment of ['city','campus','building','workspace','technical']) {
    let view;
    if(environment==='technical')view=technicalView();
    else {
      const issue=serviceIssue(environment),layout=['city','campus'].includes(environment)?outdoorLayout(environment):environment==='building'?buildingLayout():{seed:81403,environment:'workspace',rows:[[{entity:'intake',asset:'desk',size:'compact',process:'record'},{entity:'check',asset:'tester',size:'expanded',process:'measurement'},{entity:'release',asset:'desk',size:'compact',process:'dispatch'}]]};
      if(['city','campus'].includes(environment))issue.entities.forEach(e=>e.kind='place');
      view={issue,layout,scene:composeLandscape(issue,layout)};
      if(['city','campus'].includes(environment)) {
        const g=view.scene.ground[0];g.d=Math.max(g.d,environment==='campus'?565:450);g.w=Math.max(g.w,880);
        view.scene.bounds.push([g.x+g.w,g.y+g.d,0]);
        view.scene.ground.push({type:'text',at:environment==='campus'?[85,503,3]:[380,436,3],text:environment==='campus'?'FELLES INNGANG':'SERVICEGATA',size:9,color:'#5c6e5e'});
      }
    }
    for(const l of view.scene.scenarioLayouts)l.steps.forEach((s,i)=>{
      const step=view.issue.scenarios.find(s=>s.id===l.scenario).steps[i],a=view.scene.instances.find(a=>a.entity===step.state.at);
      if(!a.process)return;
      const part={record:'record',measurement:'meter',dispatch:'output',checks:'decision',readout:'display'}[a.process];
      s.parts=[{entity:a.entity,part,state:l.scenario==='missing'?(i?'waiting':'blocked'):'done'}];
    });
    bundles[environment]={version:2,language:'nb',root:environment,views:{[environment]:view}};
  }
  const building=bundles.building;
  building.views.building.issue.entities.find(e=>e.id==='check').detailView='workspace';
  building.views.workspace=structuredClone(bundles.workspace.views.workspace);
  building.views.workspace.boundaries=[{relation:'inspect',entity:'intake',direction:'in'},{relation:'deliver',entity:'release',direction:'out'},{relation:'clarify',entity:'intake',direction:'out'}];
  for(const bundle of Object.values(bundles))validateViews(bundle);
  return bundles;
}
