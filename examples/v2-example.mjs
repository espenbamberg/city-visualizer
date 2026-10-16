import {assetDimensions} from '../kit/assets.mjs';
import {composeScene} from '../kit/compose.mjs';
import {validateViews} from '../kit/v2.mjs';

const source={id:'brief',title:'Et reparasjonsoppdrag fra henting til ferdig levering',locator:'brief.md',date:'2026-10-12'};
function issue(title,summary,entries,connections,stories) {
  const entities=entries.map(([id,label,asset,description,detailView],i)=>({id,number:String(i+1).padStart(2,'0'),label,kind:['van','car','plane','bicycle'].includes(asset)?'vehicle':['cabinet','terminal','queue'].includes(asset)?'system':'place',role:label,description,constraint:'Neste aktivitet starter når overleveringen er bekreftet.',source:'brief',status:'fictional',...(detailView?{detailView}:{})}));
  const relationships=connections.map(([id,from,to,kind,label])=>({id,from,to,kind,label,source:'brief',status:'fictional'}));
  const scenarios=stories.map((s,i)=>({id:s.id,number:String(i+1).padStart(2,'0'),label:s.label,summary:s.summary,condition:s.condition,outcome:s.outcome,...(s.kind?{actor:{kind:s.kind,label:s.actorLabel,start:s.start,...(s.entity?{entity:s.entity}:{})}}:{}),steps:s.steps.map(([relation,title,text,change])=>{
    const r=relationships.find(r=>r.id===relation);
    return {title,text,relations:[relation],...(s.kind?{state:{at:r.to,via:r.id,moving:title,caption:`Ved ${entities.find(e=>e.id===r.to).label.toLowerCase()}`}}:{}),...(change?{actor:change.actor,handoff:change.text}:{})};
  })}));
  return {title,question:`Hva skjer i ${title.toLowerCase()}?`,summary,status:'fictional',sources:[source],entities,relationships,scenarios,presentation:{storyHeading:'Velg et forløp'},legend:{movement:'Fysisk bevegelse',information:'Informasjon',electricity:'Elektrisk strøm',dependency:'Avhengighet'}};
}
function localScene(model,entries,theme='room') {
  const spots=[[40,38],[220,38],[400,38],[400,260],[40,260]];
  const scene={width:1400,height:1000,seed:92713,camera:{azimuth:45,elevation:38},bounds:[[-15,-15,0],[580,420,0]],ground:[{type:'box',x:0,y:0,z:0,w:580,d:420,h:3,material:theme==='park'?'#bbc8a5':theme==='digital'?'#c1cfc9':'#ded9c9',r:5}],scenery:[],instances:[],routes:[]};
  if(theme==='room') scene.ground.push({type:'box',x:0,y:0,z:3,w:580,d:4,h:66,material:'#c4c6b5'},{type:'box',x:0,y:0,z:3,w:4,d:420,h:66,material:'#b8c3b4'});
  if(theme==='room') {
    for(let x=40;x<580;x+=40)scene.ground.push({type:'line',points:[[x,4,3.1],[x,420,3.1]],color:'#cfcdbe',width:.35});
    for(let y=40;y<420;y+=40)scene.ground.push({type:'line',points:[[4,y,3.1],[580,y,3.1]],color:'#cfcdbe',width:.35});
  }
  if(theme==='park') {
    scene.ground.push({type:'box',x:100,y:188,z:3,w:460,d:24,h:.5,material:'#ddd7bd',r:3});
    for(const [x,y] of [[40,165],[45,330],[210,310],[260,345],[320,290]])scene.scenery.push({type:'tree',x,y,h:42,seed:x});
    scene.scenery.push({type:'bench',x:210,y:225},{type:'lamp',x:85,y:194},{type:'lamp',x:555,y:220});
  }
  if(theme==='vehicle') {
    scene.ground.push({type:'box',x:10,y:8,z:3,w:558,d:5,h:23,material:'#8ca69b'},{type:'box',x:10,y:400,z:3,w:558,d:5,h:8,material:'#8ca69b'});
    for(const x of [64,470]) for(const y of [2,404])scene.ground.push({type:'box',x,y,z:0,w:48,d:12,h:11,material:'#637369',r:4});
  }
  if(theme==='aircraft') {
    scene.ground.unshift({type:'box',x:225,y:-60,z:0,w:130,d:540,h:2,material:'#9daea6',r:12});
    scene.ground.push({type:'box',x:575,y:130,z:0,w:90,d:160,h:8,material:'#a9bdb1',r:35},{type:'box',x:596,y:165,z:8,w:40,d:90,h:4,material:'#72918e',r:12},{type:'box',x:-60,y:155,z:0,w:65,d:110,h:5,material:'#a9bdb1',r:18},{type:'box',x:-50,y:194,z:5,w:32,d:8,h:68,material:'#8da998',r:1});
    for(const y of [4,411])scene.ground.push({type:'box',x:10,y,z:3,w:558,d:5,h:13,material:'#abbeb0'});
  }
  entries.forEach(([id,label,asset],i)=>{
    const [x,y]=spots[i],[w,d,h]=assetDimensions[asset];
    scene.instances.push({id,entity:id,asset,x,y,w,d,h,material:['#acb9a2','#b2c4b9','#b5bfa4','#baa88b','#b9bdc2'][i],anchor:[x+w+18,i<3?y+d+30:y-22,4],label:[x+w/2,y+d+5,4],labelStyle:{width:150,size:10},sign:label.toUpperCase()});
    if(theme==='digital')scene.ground.push({type:'box',x:x-10,y:y-10,z:3,w:w+20,d:d+22,h:1,material:'#d3ded5',r:4});
    if(theme==='park') {
      const anchor=scene.instances.at(-1).anchor;
      scene.ground.push({type:'box',x:anchor[0]-9,y:Math.min(anchor[1],200)-10,z:3,w:18,d:Math.abs(anchor[1]-200)+20,h:.5,material:'#ddd7bd',r:2});
    }
  });
  const at=id=>scene.instances.find(a=>a.entity===id).anchor;
  scene.routes=model.relationships.map(r=>({relation:r.id,points:[at(r.from),[at(r.from)[0],200,4],[at(r.to)[0],200,4],at(r.to)].filter((p,i,list)=>!i||p.some((v,j)=>v!==list[i-1][j]))}));
  scene.scenarioLayouts=model.scenarios.map(s=>({scenario:s.id,...(s.actor?{actor:{identity:s.actor.kind==='person'?'technician':s.id,at:at(s.actor.start),material:'#aa8557'}}:{}),steps:s.steps.map(step=>{
    const r=model.relationships.find(r=>r.id===step.relations[0]),a=scene.instances.find(a=>a.entity===r.to);
    return {at:[a.x+a.w/2,a.y+a.d/2,a.h+30],links:[]};
  })}));
  return scene;
}

export function v2Example() {
  const views={};
  function add(id,title,summary,entries,connections,stories,boundaries,theme) {
    const model=issue(title,summary,entries,connections,stories);
    model.entities.forEach((entity,i)=>{
      if(['desk','workbench','tester','shelf','battery','motor'].includes(entries[i][2]))entity.kind='station';
      if(entries[i][2]==='database')entity.kind='infrastructure';
    });
    views[id]={issue:model,scene:localScene(model,entries,theme),boundaries};
    return model;
  }
  const cityEntries=[
    ['home','Hjemmet','house','Kunden avtaler henting og leverer apparatet.'],
    ['workshop','Verkstedet','workshop','Mottak, diagnose, reparasjon og sluttkontroll.','workshop'],
    ['park','Nabolagsparken','park','Et oppholdssted på veien mellom hjem og verksted.','park'],
    ['van','Servicebilen','van','Flytter apparatet og driver elektrisk fra batteri til motor.','van'],
    ['depot','Utleveringen','depot','Tar imot kontrollerte apparater og avtaler levering.'],
    ['booking','Bestillingen','cabinet','Kontrollerer oppdraget og sender en bekreftet arbeidsordre.','booking'],
    ['plane','Deleflyet','plane','Frakter reservedeler til terminalen.','plane'],
    ['airport','Flyterminalen','warehouse','Sorterer innkomne reservedeler før lokal transport.']
  ];
  const city=issue('Et oppdrag, flere innsider','Åpne objektene merket ⊕. Følg arbeidet inne i verkstedet, bilens energi, parklivet og bestillingens data.',cityEntries,[
    ['visit','home','workshop','movement','Lever apparatet'],['rest','workshop','park','movement','Gå til parken'],['cycle','park','home','movement','Sykle hjem'],
    ['load','workshop','van','movement','Last det kontrollerte apparatet'],['deliver','van','depot','movement','Kjør til utleveringen'],
    ['request','home','booking','information','Send bestillingen'],['order','booking','workshop','information','Send bekreftet arbeidsordre'],
    ['air','plane','airport','movement','Fly reservedeler til terminalen']
  ],[
    {id:'visit',label:'Kunden og verkstedet',summary:'Fra hjemmet til reparasjon og en pause i parken.',condition:'Hentingen er avtalt, og verkstedet er åpent.',outcome:'Kunden har levert apparatet og gått til parken.',kind:'person',actorLabel:'Kunden',start:'home',steps:[['visit','Lever apparatet','Kunden kommer til verkstedet. Åpne verkstedet for å følge arbeidet videre.'],['rest','Ta en pause','Kunden går til parken mens apparatet undersøkes.']]},
    {id:'delivery',label:'Servicebilen leverer',summary:'Følg bilen, eller åpne den mens den kjører.',condition:'Sluttkontrollen er godkjent og bilen er lastet.',outcome:'Utleveringen har mottatt apparatet.',kind:'van',actorLabel:'Servicebilen',entity:'van',start:'van',steps:[['deliver','Kjør til utleveringen','Bilen følger kjøreveien til utleveringen. Klikk på den for å se energien på innsiden.']]},
    {id:'booking',label:'Data blir en arbeidsordre',summary:'Bestilling, kontroll og overlevering.',condition:'Kunden har fylt ut apparat og ønsket tidspunkt.',outcome:'Verkstedet har fått en bekreftet ordre.',kind:'data',actorLabel:'Bestillingsdata',start:'home',steps:[['request','Send opplysningene','Dataene går til bestillingssystemet.'],['order','Send arbeidsordren','Bestillingen er kontrollert og får et oppdragsnummer.']]},
    {id:'bike',label:'Sykkelturen hjem',summary:'En sykkel følger forbindelsen fra parken.',condition:'Kunden har sykkelen ved parkutgangen.',outcome:'Kunden er hjemme.',kind:'bicycle',actorLabel:'Kunden på sykkel',start:'park',steps:[['cycle','Sykle hjem','Sykkelen følger den merkede ruten gjennom nabolaget.']]},
    {id:'air',label:'Reservedeler med fly',summary:'Flyet følger et luftløp og lander ved terminalen.',condition:'Reservedelene er lastet og klarert for transport.',outcome:'Delene er ved flyterminalen.',kind:'plane',actorLabel:'Deleflyet',entity:'plane',start:'plane',steps:[['air','Frakt reservedelene','Flyet følger luftløpet. Åpne flyet for å se hvordan lasten håndteres.']]}
  ]);
  const scene=composeScene(city,{seed:92713,districts:[{label:'Nabolag og verksted',plots:cityEntries.slice(0,4).map(([entity,,asset])=>({entity,asset}))},{label:'Levering og bestilling',plots:cityEntries.slice(4).map(([entity,,asset])=>({entity,asset}))}]});
  const air=scene.routes.find(r=>r.relation==='air');air.points=[air.points[0],[air.points[0][0]+80,air.points[0][1],120],[air.points.at(-1)[0]-80,air.points.at(-1)[1],120],air.points.at(-1)];
  views.city={issue:city,scene};
  add('workshop','Inne i verkstedet','Apparatet registreres, undersøkes, repareres og kontrolleres. Åpne diagnosebenken for å følge målingene.',[
    ['intake','Mottaksbord','desk','Registrerer apparat, symptom og oppdragsnummer.'],['diagnosis','Diagnosebenk','tester','Måler apparatet og finner feilen.','diagnostics'],['parts','Delehylle','shelf','Har deler med sporbare delenummer.'],['repair','Arbeidsbenk','workbench','Bytter den defekte komponenten.'],['quality','Sluttkontroll','tester','Kontrollerer funksjon før utlevering.']
  ],[['inspect','intake','diagnosis','movement','Flytt til diagnose'],['fetch','diagnosis','parts','movement','Hent riktig del'],['fix','parts','repair','movement','Utfør reparasjonen'],['test','repair','quality','movement','Kontroller resultatet'],['hold','diagnosis','intake','information','Meld behov for en del']],[
    {id:'repair',label:'Fra symptom til kontroll',summary:'Teknikeren følger apparatet gjennom verkstedet.',condition:'Apparatet og arbeidsordren er mottatt.',outcome:'Apparatet består kontrollen og kan lastes i bilen.',kind:'person',actorLabel:'Teknikeren',start:'intake',steps:[['inspect','Undersøk feilen','Teknikeren leser symptomet og gjør målinger på diagnosebenken.'],['fetch','Finn riktig del','Delenummeret kontrolleres før delen hentes.'],['fix','Bytt komponenten','Den defekte komponenten byttes og tilkoblingene kontrolleres.'],['test','Prøv apparatet','Funksjonen testes under samme forhold som da feilen ble meldt.']]},
    {id:'missing',label:'Når delen mangler',summary:'Målingen blir til et behov som mottaket kan følge opp.',condition:'Diagnosen er ferdig, men delen finnes ikke på hyllen.',outcome:'Mottaket har et dokumentert delebehov.',kind:'person',actorLabel:'Teknikeren',start:'intake',steps:[['inspect','Dokumenter feilen','Teknikeren registrerer måling og delenummer.'],['hold','Send delebehovet','Mottaket får opplysningene og avtaler ny leveringstid.',{actor:{kind:'data',label:'Delebehov'},text:'Teknikerens måling blir et digitalt delebehov.'}]]}
  ],[{relation:'visit',entity:'intake',direction:'in'},{relation:'order',entity:'intake',direction:'in'},{relation:'load',entity:'quality',direction:'out'}]);
  add('diagnostics','Inne i diagnosen','Fra sikker klargjøring til et måleresultat som peker på riktig komponent.',[
    ['isolate','Klargjøring','workbench','Klargjør apparatet og kobler fra forsyningen.'],['probe','Målepunkt','tester','Setter måleprober ved den aktuelle komponenten.'],['read','Måleinstrument','terminal','Viser det avleste resultatet.'],['compare','Sammenligning','desk','Sammenholder resultatet med arbeidsordrens kontrollpunkter.'],['report','Feilrapport','terminal','Lagrer måling og delenummer.']
  ],[['prepare','isolate','probe','movement','Sett måleprobene'],['measure','probe','read','information','Les signalet'],['compare','read','compare','information','Vurder målingen'],['report','compare','report','information','Lagre feilen']],[
    {id:'measure',label:'Finn den defekte komponenten',summary:'Følg teknikeren og deretter måledataene.',condition:'Apparatet står på diagnosebenken.',outcome:'Feilrapporten angir målingen og komponenten som skal byttes.',kind:'person',actorLabel:'Teknikeren',start:'isolate',steps:[['prepare','Klargjør målepunktet','Teknikeren klargjør apparatet og plasserer probene.'],['measure','Les målingen','Instrumentet mottar signalet fra målepunktet.',{actor:{kind:'data',label:'Måledata'},text:'Fra teknikerens handling til instrumentets måledata.'}],['compare','Vurder resultatet','Teknikeren sammenholder avlesningen med kontrollpunktene i oppdraget.'],['report','Dokumenter funnet','Målingen og delenummeret følger apparatet videre til reparasjon.']]}
  ],[{relation:'inspect',entity:'isolate',direction:'in'},{relation:'fetch',entity:'report',direction:'out'},{relation:'hold',entity:'report',direction:'out'}]);
  add('park','Inne i parken','Gangveien forbinder inngang, skygge, sitteplasser og utgang.',[
    ['entry','Inngangen','seating','Møtested ved gangveien.'],['shade','Trærne','garden','Skygge ved oppholdsområdet.'],['rest','Sitteplassen','seating','Et sted å vente mens reparasjonen pågår.'],['exit','Sykkelutgangen','bicycle','Her starter sykkelturen hjem.']
  ],[['shade','entry','shade','movement','Gå til skyggen'],['rest','shade','rest','movement','Finn en sitteplass'],['exit','rest','exit','movement','Gå til sykkelen']],[
    {id:'pause',label:'En pause mellom ærend',summary:'Finn skygge og en plass å sitte.',condition:'Kunden kommer fra verkstedet.',outcome:'Kunden er ved sykkelen og klar for hjemturen.',kind:'person',actorLabel:'Kunden',start:'entry',steps:[['shade','Velg skygge','Gangveien leder til trærne.'],['rest','Sett deg ned','Kunden finner en plass nær gangveien.'],['exit','Fortsett hjem','Kunden går til sykkelen ved utgangen.']]}
  ],[{relation:'rest',entity:'entry',direction:'in'},{relation:'cycle',entity:'exit',direction:'out'}],'park');
  add('van','Inne i servicebilen','En utbrettet oversikt over bilens energikjede og last. Strøm følger forbindelsene mellom batteri, styring og motor.',[
    ['battery','Batteripakke','battery','Lagrer energien for kjøreturen.'],['control','Motorstyring','terminal','Regulerer energien til motoren.'],['motor','Drivmotor','motor','Omsetter elektrisk energi til bevegelse.'],['cargo','Sikret last','shelf','Holder det kontrollerte apparatet under transport.']
  ],[['power','battery','control','electricity','Forsyn motorstyringen'],['drive','control','motor','electricity','Driv motoren'],['cargo','motor','cargo','dependency','Transporter sikret last']],[
    {id:'energy',label:'Fra batteri til fremdrift',summary:'Strømpulsen følger bilens elektriske forbindelser.',condition:'Bilen er klar til avgang og batteriet har energi.',outcome:'Motoren leverer fremdrift til kjøreturen.',kind:'electricity',actorLabel:'Elektrisk energi',start:'battery',steps:[['power','Lever energi','Batteriet forsyner motorstyringen.'],['drive','Reguler motoren','Motorstyringen regulerer strømmen til drivmotoren.']]},
    {id:'load',label:'Lasten følger oppdraget',summary:'Last og transport er avhengige av hverandre.',condition:'Apparatet er sikret i bilen.',outcome:'Lasten kan overleveres med oppdragsnummer.',steps:[['cargo','Hold lasten samlet','Det sikrede apparatet og dokumentasjonen følger samme oppdrag til utleveringen.']]}
  ],[{relation:'load',entity:'cargo',direction:'in'},{relation:'deliver',entity:'cargo',direction:'out'}],'vehicle');
  add('booking','Inne i bestillingen','Forespørselen kontrolleres, får et oppdragsnummer og blir en arbeidsordre. Åpne valideringen for å se kontrollene.',[
    ['receive','Mottak','terminal','Tar imot kundens opplysninger.'],['validate','Validering','terminal','Kontrollerer nødvendige felt og kapasitet.','validation'],['queue','Ordrekø','queue','Holder bekreftede bestillinger i rekkefølge.'],['store','Ordrelager','database','Lagrer oppdrag og status.'],['send','Arbeidsordre','terminal','Sender ordren til verkstedet.']
  ],[['check','receive','validate','information','Kontroller bestillingen'],['enqueue','validate','queue','information','Legg i kø'],['save','queue','store','information','Lagre oppdraget'],['send','store','send','information','Send arbeidsordren'],['reject','validate','receive','information','Be om manglende opplysning']],[
    {id:'accepted',label:'En komplett bestilling',summary:'Fra forespørsel til arbeidsordre.',condition:'Påkrevde opplysninger er oppgitt, og det finnes kapasitet.',outcome:'Verkstedet får en ordre med et lagret oppdragsnummer.',kind:'data',actorLabel:'Bestillingsdata',start:'receive',steps:[['check','Kontroller innholdet','Valideringen kontrollerer apparat, kontakt og tidspunkt.'],['enqueue','Plasser i ordrekøen','Den godkjente bestillingen går videre i køen.'],['save','Lagre oppdraget','Ordrelageret tildeler et oppdragsnummer.'],['send','Overlever til verkstedet','Arbeidsordren inneholder opplysningene verkstedet trenger.']]},
    {id:'incomplete',label:'En opplysning mangler',summary:'Forespørselen returneres med en konkret beskjed.',condition:'Kontaktinformasjonen mangler.',outcome:'Kunden får vite hvilket felt som må fylles ut.',kind:'data',actorLabel:'Bestillingsdata',start:'receive',steps:[['check','Finn det tomme feltet','Valideringen finner at kontaktinformasjonen mangler.'],['reject','Be om kontaktinformasjon','Mottaket sender beskjed om hvilket felt som må rettes.']]}
  ],[{relation:'request',entity:'receive',direction:'in'},{relation:'order',entity:'send',direction:'out'}],'digital');
  add('validation','Inne i valideringen','Tre konkrete kontroller avgjør om bestillingen kan sendes videre.',[
    ['fields','Feltkontroll','terminal','Kontrollerer at apparat og kontakt er fylt ut.'],['capacity','Kapasitetskontroll','terminal','Kontrollerer at ønsket tidspunkt er ledig.'],['decision','Beslutning','terminal','Samler kontrollresultatene.'],['accepted','Godkjent','queue','Sender godkjent bestilling til ordrekøen.'],['rejected','Returmelding','terminal','Returnerer navnet på feltet som må rettes.']
  ],[['capacity','fields','capacity','information','Kontroller tidspunkt'],['decide','capacity','decision','information','Samle resultatene'],['accept','decision','accepted','information','Godkjenn'],['reject','fields','rejected','information','Beskriv mangelen']],[
    {id:'ok',label:'Kontrollene består',summary:'Opplysninger og kapasitet kontrolleres før godkjenning.',condition:'Alle obligatoriske felt er oppgitt.',outcome:'Bestillingen er godkjent for ordrekøen.',kind:'data',actorLabel:'Kontrollresultat',start:'fields',steps:[['capacity','Kontroller tidspunktet','Et ledig tidspunkt oppfyller kapasitetskontrollen.'],['decide','Samle kontrollene','Beslutningen bygger på både feltkontroll og kapasitet.'],['accept','Godkjenn bestillingen','Den godkjente bestillingen sendes tilbake til ordrekøen på nivået over.']]},
    {id:'missing',label:'Et felt mangler',summary:'Feilen blir en konkret returmelding.',condition:'Et obligatorisk felt er tomt.',outcome:'Returmeldingen identifiserer feltet kunden må rette.',kind:'data',actorLabel:'Returmelding',start:'fields',steps:[['reject','Returner mangelen','Feltkontrollen oppgir hvilket felt som mangler.']]}
  ],[{relation:'check',entity:'fields',direction:'in'},{relation:'enqueue',entity:'accepted',direction:'out'},{relation:'reject',entity:'rejected',direction:'out'}],'digital');
  add('plane','Inne i deleflyet','Lasten kontrolleres, stues og klargjøres for lossing. Visningen er en utbrettet oversikt over lastarbeidet.',[
    ['manifest','Lasteliste','desk','Kobler reservedelen til mottaker og forsendelse.'],['check','Lastkontroll','workbench','Kontrollerer kolli og merking.'],['hold','Lasterom','shelf','Holder last og merking samlet.'],['unload','Lossing','workbench','Klargjør kolliet for overlevering til terminalen.']
  ],[['check','manifest','check','movement','Kontroller kolliet'],['stow','check','hold','movement','Stue lasten'],['unload','hold','unload','movement','Klargjør lossing']],[
    {id:'cargo',label:'Reservedelen gjennom lastarbeidet',summary:'Følg medarbeiderens kontroll og overlevering.',condition:'Reservedelen er pakket og knyttet til en forsendelse.',outcome:'Terminalen kan ta imot riktig kolli.',kind:'person',actorLabel:'Lastmedarbeideren',start:'manifest',steps:[['check','Sjekk lastelisten','Kolliet kontrolleres mot mottaker og forsendelse.'],['stow','Plasser i lasterommet','Lasten plasseres og merkes for riktig mottaker.'],['unload','Overlever kolliet','Ved ankomst klargjøres kolliet for terminalen.']]}
  ],[{relation:'air',entity:'unload',direction:'out'}],'aircraft');
  const bundle={version:2,language:'nb',root:'city',views};validateViews(bundle);return bundle;
}
