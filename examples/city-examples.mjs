// Editable briefs expressed as data; build-city-examples writes their JSON inputs and previews.
const source={id:'brief',title:'Regional library service — example operating brief',locator:'brief.md',date:'2026-10-12'};
const entity=(id,number,label,kind,role,description,constraint)=>({id,number,label,kind,role,description,constraint,source:'brief',status:'fictional'});
const relation=(id,from,to,kind,label)=>({id,from,to,kind,label,source:'brief',status:'fictional'});

export function smallExample() {
  const entries=[
    ['home','Reader home','house','Reader','The reader leaves home for a day of borrowing and a reading group.','The group meets in the afternoon.'],
    ['desk','Welcome desk','reception','Library staff','Staff help the reader choose a collection and explain today’s activities.','The collection is in a separate building.'],
    ['collection','Book collection','office','Collection team','The reader borrows a book selected with the collection team.','The book must be available on the shelf.'],
    ['park','Reading garden','park','Readers','The reader takes a break in the garden before the group begins.','The path connects the library buildings.'],
    ['room','Reading room','school','Group facilitator','Readers meet around tables for a shared reading session.','The facilitator opens the session at the announced time.']
  ];
  const entities=entries.map(([id,label,asset,role,description,constraint],i)=>entity(id,String(i+1).padStart(2,'0'),label,'place',role,description,constraint));
  const relationships=entries.slice(1).map(([id],i)=>relation(`walk-${id}`,entries[i][0],id,'movement',`Walk to ${entities[i+1].label.toLowerCase()}`));
  const issue={title:'A day at the library',question:'How does a reader move from finding a book to joining a reading group?',summary:'Follow a reader through five places, from home to a shared reading session.',status:'fictional',sources:[source],entities,relationships,scenarios:[{
    id:'reading-day',number:'01',label:'Find a book, join a group',summary:'A five-place journey through the neighbourhood.',condition:'The collection and reading room are open.',outcome:'The reader arrives with a borrowed book and joins the group.',actor:{kind:'person',label:'Reader in the ochre coat',start:'home'},steps:relationships.map((r,i)=>({title:r.label,text:entities[i+1].description,relations:[r.id],state:{at:r.to,via:r.id,moving:r.label,caption:`At ${entities[i+1].label.toLowerCase()}`}}))
  }]};
  return {id:'reading-day',issue,layout:{seed:62131,districts:[{label:'Library neighbourhood',plots:entries.map(([entity,,asset])=>({entity,asset}))}]},brief:'# A day at the library\n\nA reader walks from home to the welcome desk, chooses a book in the collection building, pauses in the garden and joins a reading group. These five places explain the whole journey. No IT systems participate in this brief. The collection and group room are open. Staff own the welcome, lending and group handoffs.\n'};
}

export function largeExample() {
  const districts=[['north','Northbank'],['river','Riverside'],['market','Market quarter'],['hill','Hill district'],['harbour','Harbour'],['west','West gardens']];
  const facilities=[
    ['desk','Welcome','reception','Front-desk team','Welcomes readers, checks requests and connects them to branch services.','Staff check the collection before promising a pickup.'],
    ['collection','Collection','office','Collection team','Maintains the lending collection and prepares reserved books.','A reservation is ready only after the book is located.'],
    ['learning','Learning','school','Learning team','Runs reading groups and digital learning sessions.','Session places and facilitator availability determine the programme.'],
    ['stock','Book store','warehouse','Stock team','Receives, sorts and stores books moving through the regional collection.','Each transfer needs an identified destination branch.'],
    ['dispatch','Delivery','depot','Delivery team','Plans inter-branch deliveries and records arrival.','Branch staff confirm receipt before a book becomes ready for pickup.']
  ];
  const entities=[],relationships=[],plots=[];
  districts.forEach(([id,name],di)=>{
    plots.push({label:name,plots:facilities.map(([suffix,label,asset,role,description,constraint],i)=>{
      const key=`${id}-${suffix}`;
      entities.push(entity(key,String(entities.length+1).padStart(2,'0'),`${name} ${label}`,'place',role,description,constraint));
      return {entity:key,asset,sign:label,...(asset==='office'?{height:93+(di%3)*28}:{})};
    })});
    relationships.push(relation(`${id}-find`,`${id}-desk`,`${id}-collection`,'information','Check local availability'),
      relation(`${id}-prepare`,`${id}-stock`,`${id}-dispatch`,'movement','Bring a prepared book to delivery'),
      relation(`${id}-walk`,`${id}-desk`,`${id}-collection`,'movement','Walk to the collection'));
  });
  const systems=[
    ['catalogue','Shared catalogue','system','cabinet','Collection discovery','Lists titles and the branch holding each copy.','Branches update holdings after each transfer.'],
    ['reservations','Reservations','system','cabinet','Reservation coordination','Tracks a reader’s request from ordering to pickup.','A request remains pending until a copy is assigned.'],
    ['membership','Membership','system','cabinet','Reader records','Maintains membership records used by the front desks.','Staff resolve unmatched reader records before lending.'],
    ['delivery','Delivery planning','system','cabinet','Transfer planning','Groups prepared transfers into delivery runs.','Planning uses the branch destination and ready status.'],
    ['notices','Reader notices','system','cabinet','Pickup notifications','Sends a pickup notice after the receiving branch confirms the book.','A pending transfer must not trigger a ready notice.'],
    ['runtime','Shared runtime','infrastructure','server','Application operations','Runs the shared library services.','Service availability depends on this runtime.'],
    ['records','Library records','infrastructure','database','Data operations','Stores catalogue, membership and reservation records.','Services need consistent updates when books move.'],
    ['integration','Message gateway','infrastructure','gateway','External messaging','Connects notices and delivery updates to external endpoints.','Delivery acknowledgements return through the gateway.']
  ];
  plots.push({label:'Shared services & technology',plots:systems.map(([id,label,kind,asset,role,description,constraint])=>{
    entities.push(entity(id,`${kind==='system'?'S':'T'}${entities.length-29}`,label,kind,role,description,constraint));
    return {entity:id,asset};
  })});
  for (const [id] of districts) relationships.push(relation(`${id}-search`,`${id}-collection`,'catalogue','information','Search regional holdings'),relation(`${id}-member`,`${id}-desk`,'membership','information','Check membership'),relation(`${id}-run`,`${id}-dispatch`,'delivery','information','Update the transfer plan'));
  for (const [id] of systems.filter(s=>s[2]==='system')) relationships.push(relation(`${id}-host`,id,'runtime','technical','Runs on the shared runtime'));
  relationships.push(relation('save','runtime','records','technical','Read and write library records'),relation('send','notices','integration','technical','Submit a reader notice'),
    relation('request','north-desk','reservations','information','Register a book reservation'),relation('locate','reservations','catalogue','information','Find an available copy'),
    relation('transfer','harbour-dispatch','north-dispatch','movement','Deliver the reserved book between branches'),relation('confirm','north-dispatch','notices','information','Confirm the book has arrived'),
    relation('cross-district','north-collection','river-learning','movement','Walk to the Riverside reading group'));
  const issue={title:'One library, six neighbourhoods',question:'How do local branches and shared technology deliver one regional library service?',summary:'Thirty workplaces across six neighbourhoods connect lending, learning, stock and delivery. Five shared applications support them, with a common runtime, database and gateway.',status:'fictional',sources:[source],entities,relationships,scenarios:[
    {id:'reader-journey',number:'01',label:'A reader crosses neighbourhoods',summary:'Local help, a borrowed book and a group in Riverside.',condition:'Northbank has the chosen book; the Riverside reading group is open.',outcome:'The reader reaches the Riverside learning team with a book from Northbank.',actor:{kind:'person',label:'Reader in the ochre coat',start:'north-desk'},steps:[
      {title:'Find the collection',text:'The welcome team directs the reader to the Northbank collection.',relations:['north-walk','north-find'],state:{at:'north-collection',via:'north-walk',moving:'Walking to the collection',caption:'At the Northbank collection'}},
      {title:'Join another neighbourhood',text:'The reader takes the connecting streets to the Riverside learning centre and joins the group.',relations:['cross-district'],state:{at:'river-learning',via:'cross-district',moving:'Walking to Riverside',caption:'At the Riverside learning centre'}}]},
    {id:'regional-reservation',number:'02',label:'A book from another branch',summary:'A reservation becomes a delivered book and a pickup notice.',condition:'The local branch lacks the requested copy; Harbour has one available.',outcome:'The receiving branch confirms arrival before the reader is notified.',steps:[
      {title:'Register the request',text:'Northbank staff check membership and record the reader’s reservation.',relations:['north-member','request']},
      {title:'Find a regional copy',text:'Reservations checks the shared catalogue and identifies the Harbour copy.',relations:['locate','harbour-search']},
      {title:'Prepare and deliver',text:'Harbour prepares the copy, schedules it and delivers it to Northbank.',relations:['harbour-prepare','harbour-run','transfer']},
      {title:'Confirm and notify',text:'Northbank confirms receipt. The notices service sends the pickup message through the gateway.',relations:['confirm','send']}]},
    {id:'platform',number:'03',label:'The shared foundation',summary:'Local services depend on common applications and records.',condition:'All six branches use the shared applications.',outcome:'The operating team can trace branch dependencies through services to runtime and records.',steps:[
      {title:'Shared discovery',text:'Each collection team searches the same regional catalogue.',relations:districts.map(([id])=>`${id}-search`)},
      {title:'Common runtime and records',text:'The applications share runtime and storage. An interruption here affects several branch activities.',relations:['catalogue-host','reservations-host','membership-host','delivery-host','notices-host','save'],problem:true}]}
  ]};
  return {id:'library-network',issue,layout:{seed:90421,districts:plots},brief:'# Regional library service strategy\n\nThis example operating model covers six neighbourhoods: Northbank, Riverside, Market quarter, Hill district, Harbour and West gardens. Each has a welcome desk, lending collection, learning centre, stock store and delivery depot: thirty physical workplaces.\n\nThe proposed service shares five applications: catalogue, reservations, membership, delivery planning and reader notices. A runtime, records database and message gateway form the technical foundation. These eight objects have distinct dependencies; they are drawn separately from physical workplaces.\n\nLocal teams own welcome, lending and learning. Stock and delivery teams coordinate transfers. A pickup notice follows receiving-branch confirmation. Three stories explain a cross-neighbourhood reader journey, a regional reservation and the common technical dependencies. The supplied detail supports seven districts in the illustration: six neighbourhoods plus shared services.\n'};
}
