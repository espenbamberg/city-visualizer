import {iso,depthOf,pathOf} from './anatomy/iso-kit.mjs';

// Rotate world geometry before projection, then sort its faces; vertical parts stay vertical.
export function transport(P,kind,color='#b58b58',angle=0,at=[0,0,0]) {
  const faces=[],c=Math.cos(angle),s=Math.sin(angle);
  const turn=([x,y,z])=>[at[0]+x*c-y*s,at[1]+x*s+y*c,at[2]+z];
  function face(points,fill) {
    points=points.map(turn);
    faces.push({depth:points.reduce((n,p)=>n+depthOf(p,P),0)/points.length,svg:`<path d="${pathOf(points.map(p=>iso(p,P)),true)}" fill="${fill}" stroke="#52655d" stroke-width=".45" stroke-linejoin="round"/>`});
  }
  function box(x,y,z,w,d,h,material) {
    const a=[x,y,z],b=[x+w,y,z],c=[x+w,y+d,z],e=[x,y+d,z],top=p=>[p[0],p[1],p[2]+h];
    face([a,b,top(b),top(a)],`color-mix(in srgb,${material},#344936 22%)`);
    face([b,c,top(c),top(b)],material);
    face([c,e,top(e),top(c)],`color-mix(in srgb,${material},#344936 10%)`);
    face([e,a,top(a),top(e)],`color-mix(in srgb,${material},#344936 30%)`);
    face([top(a),top(b),top(c),top(e)],`color-mix(in srgb,${material},#fffced 20%)`);
  }
  function wheel(x,y,r=4) {
    face(Array.from({length:16},(_,i)=>[x+Math.cos(i*Math.PI/8)*r,y,r+Math.sin(i*Math.PI/8)*r]),'#454f4a');
    face(Array.from({length:12},(_,i)=>[x+Math.cos(i*Math.PI/6)*r*.5,y+.1,r+Math.sin(i*Math.PI/6)*r*.5]),'#c8cbbd');
  }
  if(kind==='car' || kind==='van') {
    box(-23,-10,5,46,20,10,color);
    box(-18,-9,15,kind==='van'?24:21,18,kind==='van'?13:8,color);
    box(7,-8.8,15,9,17.6,7,'#799398');
    box(21,-10.4,6,3,20.8,3,'#87918c');
    for(const y of [-10.3,10.3])for(const x of [-14,14])wheel(x,y);
    for(const y of [-8,5])box(23,y,10,1,3,3,'#eee5b6');
    for(const x of [-14,-3])box(x,10.2,15,4,.8,1,'#e1decf');
    box(-22,-7,16,1,14,9,'#c6c3b4');
  } else if(kind==='bicycle') {
    wheel(-10,0,6);wheel(11,0,6);
    const beam=(a,b)=>{
      const aa=turn(a),bb=turn(b);
      faces.push({depth:(depthOf(aa,P)+depthOf(bb,P))/2,svg:`<path d="${pathOf([iso(aa,P),iso(bb,P)])}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`});
    };
    for(const [a,b] of [[[-10,0,6],[-4,0,16]],[[-4,0,16],[2,0,6]],[[2,0,6],[-10,0,6]],[[2,0,6],[7,0,17]],[[7,0,17],[-4,0,16]],[[11,0,6],[7,0,20]]])beam(a,b);
    box(-7,-2,17,6,4,1,'#51594e');box(6,-4,21,2,8,1,'#6f7a70');
    box(-7,-4,23,7,7,9,color);box(-5,-2,33,4,4,5,'#bc9373');
    beam([0,0,24],[7,0,21]);beam([-3,0,23],[3,0,11]);
  } else if(kind==='plane') {
    box(-35,-4,9,65,8,8,color);
    box(24,-3,10,12,6,5,'#879b9e');
    face([[-9,-4,12],[-20,-36,10],[3,-36,10],[13,-4,12]],'#d5d9d0');
    face([[-9,4,12],[-20,36,10],[3,36,10],[13,4,12]],'#d5d9d0');
    face([[-35,0,15],[-35,0,34],[-21,0,16]],color);
    box(-32,-14,11,10,28,2,'#aebcaf');
    for(const y of [-20,16])box(-6,y,6,16,4,5,'#84948d');
    for(let x=-23;x<20;x+=5)box(x,4.1,14,2,.5,2,'#597b85');
    for(const x of [-18,22])wheel(x,0,3);
  } else if(kind==='data') {
    box(-7,-5,0,14,10,5,color);
    for(const x of [-4,0,4])box(x,-2,5,2,4,.5,'#e7eee2');
  } else if(kind==='electricity') {
    face([[-7,0,1],[0,-4,1],[-1,0,1],[7,0,1],[0,4,1],[1,0,1]],'#f0cb69');
  }
  return faces.sort((a,b)=>a.depth-b.depth).map(f=>f.svg).join('');
}
