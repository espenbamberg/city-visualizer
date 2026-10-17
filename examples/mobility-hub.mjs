import {composeGroups} from '../kit/compose-groups.mjs';

export function mobilityHub() {
  const source={source:'design',status:'fictional'};
  const entities=[
    ['shop','Corner shop','place','An everyday destination','The shop faces the shared walking route. Its public entrance and delivery access are separate.','Keep the doorway clear.'],
    ['stop','Bus shelter','place','A sheltered waiting place','An open-sided shelter combines a roof, bench, timetable and stop sign. People enter beneath the roof.','Leave the boarding approach free of street furniture.'],
    ['racks','Cycle parking','infrastructure','Secure cycle parking','Three normal-sized hoops face a clear parking approach.','Parking needs more space than the metal hoops occupy.'],
    ['charging','Charging bay','infrastructure','Power for parked vehicles','The cabinet and cable serve a marked vehicle bay. The supply connection is separate from vehicle access.','The marked bay must remain clear for a vehicle.'],
    ['garden','Community garden','place','A planted place to visit','Raised planting beds sit inside a fence with a real opening.','Walk through the gate rather than through plants or rails.'],
    ['gate','Garden gate','infrastructure','An opening in the boundary','An L-shaped fence follows two edges of the garden. The gap is shared by its drawing and route checks.','The gap must be wide enough for the whole walking corridor.'],
    ['shade','Shade tree','place','Shade beside the walking route','The canopy reaches beyond the trunk. A person can stand beneath its edge.','Keep the route away from the trunk and below the canopy.']
  ].map(([id,label,kind,role,description,constraint],i)=>({id,label,kind,role,description,constraint,number:String(i+1),...source}));
  const relationships=[
    ['walk-stop','shop','stop','movement','Walk to the shelter'],
    ['walk-racks','shop','racks','movement','Collect a bicycle'],
    ['walk-gate','shop','gate','movement','Approach the garden gate'],
    ['enter-garden','gate','garden','movement','Pass through the gate'],
    ['walk-shade','shop','shade','movement','Walk into the shade'],
    ['supply','shop','charging','electricity','Feed the charging cabinet']
  ].map(([id,from,to,kind,label])=>({id,from,to,kind,label,...source}));
  const journey=(id,number,label,summary,steps,outcome)=>({id,number,label,summary,condition:'Start at the shop entrance.',outcome,actor:{kind:'person',label:'Neighbour in a green coat',start:'shop',identity:'neighbour'},steps:steps.map(([relation,at,title,text])=>({title,text,relations:[relation],state:{at,via:relation,moving:title,caption:text}}))});
  const issue={title:'A connected neighbourhood',question:'How can small public spaces share a place without blocking one another?',summary:'A corner shop, shelter, cycle parking, garden and charging bay share clear approaches. Explore how each object uses space.',status:'fictional',sources:[{id:'design',title:'Mobility-hub design study',locator:'An editable CityVisualizer example.'}],entities,relationships,scenarios:[
    journey('catch-bus','1','Wait under the shelter','Follow the walking route into an open-sided shelter.',[['walk-stop','stop','Enter the shelter','The neighbour reaches the waiting area beneath the roof, clear of the posts and bench.']],'The neighbour waits under cover.'),
    journey('collect-cycle','2','Collect a bicycle','Approach the cycle racks from their open side.',[['walk-racks','racks','Reach cycle parking','The approach leaves space to manoeuvre a bicycle beside the hoops.']],'Cycle parking remains accessible.'),
    journey('visit-garden','3','Visit the garden','Use the real opening in the fence.',[['walk-gate','gate','Reach the gate','The neighbour follows the shared path to the opening in the fence.'],['enter-garden','garden','Enter the garden','The neighbour passes between the gateposts and stops beside the planting bed.']],'The garden is reached without crossing rails or plants.'),
    journey('find-shade','4','Find some shade','Walk beneath the edge of the canopy.',[['walk-shade','shade','Step into the shade','The neighbour stands beneath the canopy, with room between the path and trunk.']],'The tree provides shade while its trunk stays clear of the path.'),
    {id:'power-bay',number:'5',label:'Power the charging bay',summary:'Follow the separate electrical connection.',condition:'The charging installation has a supply connection.',outcome:'Power reaches the cabinet beside the reserved vehicle bay.',actor:{kind:'electricity',label:'Electrical supply',start:'shop'},steps:[{title:'Supply the charging cabinet',text:'The cable connects the supply to the charging cabinet. Vehicle access uses the marked bay and road.',relations:['supply'],state:{at:'charging',via:'supply',moving:'Following the supply cable',caption:'Supply connected at the charging cabinet.'}}]}
  ]};
  const ports=[
    {id:'shop-entry',entity:'shop',node:'shop-entry',socket:'public',offset:25},
    {id:'stop-entry',entity:'stop',node:'stop-entry',socket:'waiting'},
    {id:'rack-entry',entity:'racks',node:'rack-entry',socket:'parking'},
    {id:'gate-entry',entity:'gate',node:'gate-entry',socket:'gate'},
    {id:'garden-entry',entity:'garden',node:'garden-entry',side:'back',position:7/12,offset:20},
    {id:'shade-entry',entity:'shade',node:'shade-entry',socket:'shade'},
    {id:'shop-power',entity:'shop',node:'shop-power',side:'right',position:.2,offset:0,z:8},
    {id:'bay-power',entity:'charging',node:'bay-power',socket:'power'},
    {id:'bay-entry',entity:'charging',node:'bay-entry',socket:'vehicle'}
  ];
  const nodes=[...ports.map(p=>({id:p.node,at:[0,0,3]})),...[
    ['west',65,230],['shop-junction',190,230],['shade-junction',266.4,230],['garden-junction',300,230],['east',350,230],['stop-junction',520,230],['stop-approach',520,125],['road-bend',350,480],['bay-approach',452,480],['road-end',620,480]
  ].map(([id,x,y])=>({id,at:[x,y,3]}))];
  const edges=[
    ['shop-path','shop-entry','shop-junction'],['west-path','west','shop-junction'],['rack-path','west','rack-entry'],['shade-path','shop-junction','shade-junction'],['shade-access','shade-junction','shade-entry'],['garden-path','shade-junction','garden-junction'],['gate-path','garden-junction','gate-entry'],['garden-access','gate-entry','garden-entry'],['east-path','garden-junction','east'],['stop-path','east','stop-junction'],['stop-approach-path','stop-junction','stop-approach'],['shelter-access','stop-approach','stop-entry']
  ].map(([id,from,to])=>({id,from,to,surface:'path',modes:['person'],width:16}));
  edges.push({id:'supply-cable',from:'shop-power',to:'bay-power',surface:'cable',modes:['electricity'],width:8});
  for(const [id,from,to] of [['street','road-bend','bay-approach'],['street-end','bay-approach','road-end'],['vehicle-access','bay-approach','bay-entry']])edges.push({id,from,to,surface:'road',modes:['car','van'],width:60});
  const layout={seed:617203,environment:'campus',groups:[{label:'Neighbourhood mobility hub',pattern:'court',at:[0,0],plots:[
    {entity:'shop',asset:'corner-shop',at:[80,80],sign:'CORNER SHOP',material:'#c4b79a',emphasis:'primary',label:[133,176,3],labelStyle:{width:104,size:8}},
    {entity:'stop',asset:'bus-shelter',at:[420,70],rotation:270,material:'#8fa79b',label:[450,190,3],labelStyle:{width:115,size:9}},
    {entity:'racks',asset:'bike-rack',at:[80,300],rotation:90,options:{bays:3},material:'#758d7d',label:[108,380,3],labelStyle:{width:112,size:9}},
    {entity:'charging',asset:'charging-bay',at:[420,300],material:'#93aa94',label:[452,414,3],labelStyle:{width:115,size:9}},
    {entity:'garden',asset:'planting-bed',at:[230,330],material:'#879c76',label:[286,408,3],labelStyle:{width:140,size:9}},
    {entity:'gate',asset:'fence',at:[210,290],w:180,d:140,options:{path:[[0,0],[180,0],[180,140]],gate:{segment:0,offset:70,width:40}},material:'#9c8e74',label:[245,292,27],labelStyle:{plane:'front',width:58,size:5}},
    {entity:'shade',asset:'canopy-tree',at:[220,70],material:'#8ea17a',label:[249,138,3],labelStyle:{width:100,size:8}}
  ]}],scenery:[
    {id:'street-tree',type:'canopy-tree',x:560,y:80,material:'#9aaa7c',repeat:{count:2,step:[0,110]}},
    {type:'bike-rack',beside:{entity:'stop',side:'back',gap:25,align:'start'},options:{bays:2},material:'#96a58b'},
    {type:'fence',x:70,y:430,material:'#a39476'}
  ],network:{nodes,ports,edges},routes:relationships.map(r=>({relation:r.id,network:{from:({'walk-stop':'shop-entry','walk-racks':'shop-entry','walk-gate':'shop-entry','enter-garden':'gate-entry','walk-shade':'shop-entry',supply:'shop-power'})[r.id],to:({'walk-stop':'stop-entry','walk-racks':'rack-entry','walk-gate':'gate-entry','enter-garden':'garden-entry','walk-shade':'shade-entry',supply:'bay-power'})[r.id],mode:r.kind==='electricity'?'electricity':'person'}}))};
  return {issue,layout,scene:composeGroups(issue,layout)};
}
