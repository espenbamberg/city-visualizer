export const detailDimensions={car:[50,24,30],van:[50,24,35],bicycle:[28,14,40],plane:[80,76,38],desk:[75,48,42],workbench:[90,55,55],tester:[85,55,65],shelf:[75,40,68],battery:[90,65,30],motor:[70,60,45],terminal:[65,48,65],queue:[90,50,40],garden:[100,80,62],seating:[100,70,36]};

export function detailAsset(a,D) {
  const {x,y,w,d,material,asset}=a,{box,line,cylinder,person,tree,bench,sign}=D;
  let out='';
  if(asset==='garden') {
    out+=box(x,y,1,w,d,3,'#adbb94',4);
    for(const dx of [14,52,86])out+=tree(x+dx,y+24,42+dx%11,dx);
    for(let dx=8;dx<w-8;dx+=12)out+=box(x+dx,y+d-13,4,8,8,3,'#8f9d71',1);
    return out;
  }
  if(asset==='seating') return bench(x+12,y+12)+bench(x+58,y+12)+person(x+28,y+19,5,undefined,true)+box(x+35,y+44,2,26,18,15,'#b5aa8c',2);
  out+=box(x-3,y-3,1,w+6,d+6,2,'#c7cec0',2);
  if(['desk','workbench','tester'].includes(asset)) {
    for(const dx of [4,w-8])for(const dy of [4,d-8])out+=box(x+dx,y+dy,3,4,4,25,'#859188');
    out+=box(x,y,28,w,d,3,material,1)+box(x+4,y+4,9,w*.33,d-8,17,'#a6ada0');
    for(const z of [13,19,25])out+=box(x+8,y+d-3,z,w*.25,1,1,'#737e75');
    out+=box(x+w*.55,y+8,31,19,3,18,'#687b7a')+box(x+w*.55+1,y+11.2,33,17,.4,14,'#b7c9bd');
    for(let i=0;i<4;i++)out+=box(x+w*.55+3,y+11.8,35+i*2.5,8+i%2*4,.3,.7,'#748e82');
    out+=box(x+w*.55-1,y+18,31,22,9,1,'#b4b9ab');
    for(let i=0;i<7;i++)out+=line([[x+w*.55+i*3,y+19,32.2],[x+w*.55+i*3,y+25,32.2]],'#879483',.5);
    if(asset!=='desk') {
      out+=box(x+9,y+9,31,24,22,14,'#d2cec0',1)+box(x+12,y+11,45,18,17,1,'#87978b');
      for(const dx of [14,25])for(const dy of [14,22])out+=cylinder(x+dx,y+dy,46,1,1,'#d6d9c9');
      out+=line([[x+29,y+19,47],[x+40,y+19,47],[x+40,y+30,33],[x+53,y+30,33],[x+53,y+15,35]],'#95774e',1.6);
      for(let i=0;i<4;i++)out+=box(x+5+i*7,y+d-9,31,4,7,1,'#777f72');
    } else out+=box(x+10,y+12,31,16,20,.6,'#f0ecda');
    if(a.size==='expanded') {
      out+=box(x+8,y+39,31,w-16,d-48,1,'#b8c5ae',1);
      for(let dx=14;dx<w-24;dx+=26) {
        out+=box(x+dx,y+45,32,18,15,1,'#e8e3cf');
        for(let i=0;i<3;i++)out+=line([[x+dx+3,y+48+i*3,33.2],[x+dx+14,y+48+i*3,33.2]],'#8b9580',.5);
      }
      if(asset==='tester') {
        out+=box(x+w-30,y+9,31,23,23,19,'#889b90',1)+box(x+w-27,y+32.2,36,17,.6,10,'#dae2cb');
        out+=line([[x+31,y+17,46],[x+42,y+17,46],[x+42,y+37,33],[x+w-18,y+37,33],[x+w-18,y+32,38]],'#a28350',1.2);
      }
    }
    out+=person(x+w*.75,y+d+10,3,undefined,true)+bench(x+w*.75-12,y+d+5);
    return out;
  }
  if(asset==='shelf' || asset==='queue') {
    const height=asset==='shelf'?64:36;
    for(const dx of [0,w-3])for(const dy of [0,d-3])out+=box(x+dx,y+dy,3,3,3,height,'#85958a');
    for(let z=6;z<height;z+=18) {
      out+=box(x,y,z,w,d,2,'#b8bda9');
      for(let dx=6;dx+17<=w-3;dx+=22) {
        for(let dy=6;dy+18<=d-4;dy+=24) {
          out+=box(x+dx,y+dy,z+2,17,18,12,material,1);
          out+=box(x+dx+4,y+dy+18.3,z+5,9,.5,5,'#e6e3cf');
          out+=line([[x+dx+7,y+dy+19,z+6],[x+dx+7,y+dy+19,z+9]],'#7a8172',.7);
        }
      }
    }
    return out;
  }
  if(asset==='battery') {
    out+=box(x,y,3,w,d,5,'#80958d');
    for(let dx=6;dx<w-8;dx+=13)for(let dy=6;dy<d-9;dy+=15) {
      out+=cylinder(x+dx,y+dy,8,5,16,material)+cylinder(x+dx,y+dy,24,2,1,'#cccfb4');
    }
    out+=box(x+5,y+d-7,9,w-10,3,2,'#b3925a');
    return out;
  }
  if(asset==='motor') {
    out+=box(x+5,y+5,3,w-10,d-10,7,'#8a9c91');
    out+=cylinder(x+w/2,y+d/2,10,22,26,material);
    for(let angle=0;angle<Math.PI*2;angle+=Math.PI/8)out+=cylinder(x+w/2+Math.cos(angle)*18,y+d/2+Math.sin(angle)*18,36,1.4,1,'#626f62');
    out+=cylinder(x+w/2,y+d/2,36,7,9,'#acb8a6');
    return out;
  }
  // A local terminal is an instrument on a plinth, rather than a miniature office building.
  out+=box(x+3,y+4,3,w-6,d-8,36,material,2)+box(x+9,y+d-3,18,w-18,1,23,'#6d8380');
  for(let i=0;i<5;i++)out+=box(x+13,y+d-1.8,21+i*3,w-30-i%2*9,.4,1,'#c0d2bd');
  for(let dx=14;dx<w-8;dx+=11)out+=cylinder(x+dx,y+d-8,40,2,2,dx===14?'#c5b075':'#8aab94');
  for(let dx=11;dx<w-8;dx+=6)out+=box(x+dx,y+9,39,2,Math.min(17,d-20),.6,'#7a8c7f');
  if(a.size==='expanded') {
    out+=box(x+w-31,y+10,40,20,25,2,'#778f81');
    for(let i=0;i<4;i++)out+=cylinder(x+w-27+i*4,y+15,42,1.1,1,'#d6dabe');
  }
  out+=sign(x+12,y+d+1,10,a.sign ?? 'CONTROL',Math.min(4,(w-20)/Math.max(1,(a.sign ?? 'CONTROL').length*.65)),'#405b4c');
  return out;
}
