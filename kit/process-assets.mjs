export const processParts={
  intake:['record','appliance'],repair:['appliance','component','tools'],measurement:['component','probes','meter'],
  checks:['record','fields','capacity','decision'],dispatch:['record','queue','output'],record:['record','contact','slot'],
  readout:['input','display','record'],storage:['labels','stock'],queue:['tickets','released']
};

export function processAsset(a,D) {
  const {x,y,w,d,process}=a,{box,line,cylinder,sign,person,bench}=D;
  const part=(id,svg)=>`<g class="process-part" data-part="${a.entity}/${id}" data-part-state="idle">${svg}</g>`;
  const fine=svg=>`<g data-lod="2">${svg}</g>`;
  let out=box(x-3,y-3,1,w+6,d+6,2,'#bdc8b5',2);
  if(['storage','queue'].includes(process)) {
    const height=process==='storage'?60:32;
    for(const dx of [0,w-3])for(const dy of [0,d-3])out+=box(x+dx,y+dy,3,3,3,height,'#85958a');
    let contents='',labels='';
    for(let z=8;z<height;z+=18) {
      out+=box(x,y,z,w,d,2,'#b8bda9');
      for(let dx=7;dx+16<w-3;dx+=22)contents+=box(x+dx,y+6,z+2,16,Math.min(18,d-12),10,'#b6c4ac',1);
      labels+=box(x+5,y+d+.3,z-1,w-10,.7,5,'#e7e2cd');
    }
    return out+part(process==='storage'?'stock':'tickets',contents)+part(process==='storage'?'labels':'released',labels);
  }
  for(const dx of [4,w-8])for(const dy of [4,d-8])out+=box(x+dx,y+dy,3,4,4,25,'#819186');
  out+=box(x,y,28,w,d,3,a.material,1);
  const paper=(px,py)=>box(px,py,31,20,25,.8,'#ece6d1')+fine([0,1,2,3].map(i=>line([[px+3,py+6+i*4,32],[px+16-i%2*5,py+6+i*4,32]],'#8d987f',.7)).join(''));
  if(process==='readout') {
    out+=part('input',box(x+6,y+7,31,8,8,8,'#a5b99e')+line([[x+10,y+15,35],[x+10,y+32,33],[x+w/2,y+32,33]],'#a38a58',1.5));
    out+=part('display',box(x+w-39,y+6,31,32,21,18,'#7c958b',1)+box(x+w-36,y+27.3,35,26,.8,12,'#d9dfc5')+fine(line([[x+w-32,y+28.5,38],[x+w-24,y+28.5,43],[x+w-14,y+28.5,39]],'#648675',1.4)));
    return out+part('record',paper(x+5,y+d-28));
  }
  if(['intake','repair','measurement'].includes(process)) {
    const ax=x+8,ay=y+8,aw=Math.min(44,w*.4);
    let appliance=box(ax,ay,31,aw,30,3,'#7c918a')+box(ax,ay,34,3,30,24,'#c9d0c2')+box(ax,ay,34,aw,3,24,'#d9d8c6')+box(ax,ay+27,34,aw,3,12,'#b4c0b4');
    appliance+=box(ax+aw-3,ay,34,3,30,24,'#afbeb3');
    let circuit=box(ax+7,ay+7,35,aw-14,17,1,'#7a967c');
    circuit+=cylinder(ax+aw*.5,ay+15,36,Math.min(6,aw*.17),6,'#8d9f8f')+cylinder(ax+aw*.5,ay+15,42,2,2,'#c8cfb6');
    circuit+=fine(Array.from({length:3},(_,i)=>box(ax+8+i*(aw-20)/3,ay+8,36,3,4,3,'#65766b')).join(''));
    circuit+=fine([0,1,2].map(i=>line([[ax+7,ay+19+i*2,36.5],[ax+aw-7,ay+19+i*2,36.5]],'#b6ad70',.7)).join(''));
    appliance+=fine([5,aw-6].map(dx=>cylinder(ax+dx,ay+4,58,1,1,'#7b8e7d')).join(''));
    out+=process==='intake'?part('appliance',appliance+circuit):part(process==='repair'?'appliance':'component',appliance)+part(process==='repair'?'component':'probes',circuit);
    if(process==='intake')out+=part('record',paper(x+w-26,y+10));
    else if(process==='repair') {
      let tools='';for(let i=0;i<4;i++)tools+=box(x+w-29+i*6,y+9,31,2,18,2,'#788678');
      tools+=box(x+10,y+d-18,31,24,12,3,'#b5a17c')+fine(cylinder(x+20,y+d-12,34,4,3,'#8b9c8b'));
      out+=part('tools',tools);
    } else {
      out+=part('probes',line([[ax+20,ay+18,39],[x+w*.55,y+26,33],[x+w*.55,y+12,42],[x+w-24,y+12,42]],'#a88855',1.6));
      let meter=box(x+w-36,y+6,31,30,24,18,'#879d91',2)+box(x+w-32,y+30.2,36,22,.6,10,'#d8e0c8');
      meter+=fine(sign(x+w-30,y+31,38,'SIGNAL',3,'#516a57'));
      for(const dx of [-28,-16])meter+=cylinder(x+w+dx,y+14,49,3,2,'#bdc6aa');
      out+=part('meter',meter);
    }
    if(d>70)out+=fine(paper(x+w-33,y+d-32));
  } else {
    out+=part('record',paper(x+8,y+8));
    if(process==='checks'||process==='record') {
      for(const [i,id] of (process==='checks'?['fields','capacity','decision']:['contact','slot']).entries()) {
        const px=x+34+i*(w-40)/3;
        let card=box(px,y+8,31,Math.max(9,(w-48)/3),25,7,'#a2b59e',1)+cylinder(px+5,y+15,38,2,1,'#d2be7c');
        card+=fine(line([[px+3,y+22,38.2],[px+Math.max(6,(w-55)/3),y+22,38.2]],'#627a66',.8));
        if(w>=100)card+=fine(sign(px+2,y+33.2,33,{fields:'FELT',capacity:'TID',decision:'VEDTAK',contact:'KONTAKT',slot:'TID'}[id],2.5,'#516c58'));
        out+=part(id,card);
      }
      out+=line([[x+18,y+34,32],[x+w-10,y+34,32]],'#829987',1);
    } else {
      let queue='';for(let i=0;i<3;i++)queue+=box(x+w-22+i*3,y+8+i*2,31+i,12,12,1,'#d9dfca');
      out+=part('queue',queue)+part('output',box(x+w-19,y+d-20,31,13,13,8,'#8ca78d',1));
    }
  }
  if(['desk','workbench','tester'].includes(a.asset))out+=bench(x+w*.72-12,y+d+6,3)+person(x+w*.72,y+d+12,4,undefined,true);
  return out;
}
