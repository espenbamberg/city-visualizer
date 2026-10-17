import assert from 'node:assert/strict';

export function validateTransform(a) {
  assert(a.rotation===undefined || [0,90,180,270].includes(a.rotation),'Rotation must be a quarter turn');
  assert(a.z===undefined || (Number.isFinite(a.z)&&a.z>=0),'Invalid object elevation');
}

// Local dimensions stay unchanged; x/y are the minimum corner after rotation.
export function worldPoint(a,[x,y,z=0]) {
  const xy=({0:[x,y],90:[a.d-y,x],180:[a.w-x,a.d-y],270:[y,a.w-x]})[a.rotation??0];
  return [a.x+xy[0],a.y+xy[1],(a.z??0)+z];
}

export function worldBox(a,b) {
  const p=worldPoint(a,[b.x,b.y,b.z??0]),q=worldPoint(a,[b.x+b.w,b.y+b.d,b.z??0]);
  return {...b,x:Math.min(p[0],q[0]),y:Math.min(p[1],q[1]),z:p[2],w:Math.abs(q[0]-p[0]),d:Math.abs(q[1]-p[1])};
}

export function footprint(a) {
  return worldBox(a,{x:0,y:0,z:0,w:a.w,d:a.d,h:a.h});
}

export function unionBounds(boxes) {
  const min=key=>Math.min(...boxes.map(b=>b[key]));
  const x=min('x'),y=min('y'),z=min('z');
  return {x,y,z,w:Math.max(...boxes.map(b=>b.x+b.w))-x,d:Math.max(...boxes.map(b=>b.y+b.d))-y,h:Math.max(...boxes.map(b=>b.z+b.h))-z};
}

export function overlaps(a,b) {
  return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.d&&a.y+a.d>b.y&&a.z<b.z+b.h&&a.z+a.h>b.z;
}
