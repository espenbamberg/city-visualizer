import assert from 'node:assert/strict';

// Interior rectangles exclude their five-unit walls; front walls contain the authored door.
export function roomWalls(rooms=[]) {
  assert(Array.isArray(rooms),'Invalid rooms');
  const ids=new Set(),walls=new Map();
  for(const r of rooms) {
    assert(r&&/^[a-z][a-z0-9-]*$/.test(r.id)&&!ids.has(r.id),'Invalid or repeated room ID');ids.add(r.id);
    assert(typeof r.label==='string'&&r.label.trim(),'Missing room label');
    assert(['x','y','w','d','h'].every(k=>Number.isFinite(r[k]))&&r.w>0&&r.d>0&&r.h>=30,'Invalid room geometry');
    const door=r.door;
    assert(door&&Number.isFinite(door.offset)&&Number.isFinite(door.width)&&door.offset>=5&&door.width>0&&door.offset+door.width<=r.w-5,'Invalid room door');
    assert(door.open===undefined||typeof door.open==='boolean','Invalid door state');
    for(const other of rooms)if(other!==r)assert(!(r.x<other.x+other.w+5&&r.x+r.w+5>other.x&&r.y<other.y+other.d+5&&r.y+r.d+5>other.y),`Overlapping rooms: ${r.id}/${other.id}`);
    const wall=(suffix,x,y,w,d,cutaway=false)=>{
      if(w<=0||d<=0)return;
      const key=[x,y,w,d].join(','),old=walls.get(key);
      walls.set(key,{id:old?.id??`${r.id}-${suffix}`,entity:`wall ${r.id}/${suffix}`,x,y,w,d,h:Math.max(r.h,old?.h??0),cutaway:cutaway||old?.cutaway||false});
    };
    wall('back',r.x-5,r.y-5,r.w+10,5);
    wall('left',r.x-5,r.y,5,r.d);
    wall('right',r.x+r.w,r.y,5,r.d,true);
    wall('front-left',r.x-5,r.y+r.d,door.offset+5,5,true);
    wall('front-right',r.x+door.offset+door.width,r.y+r.d,r.w-door.offset-door.width+5,5,true);
    if(door.open===false)wall('closed-door',r.x+door.offset,r.y+r.d,door.width,5,true);
  }
  return [...walls.values()];
}

export function validateRoomContents(scene) {
  roomWalls(scene.rooms);
  for(const a of scene.instances) {
    if(a.room===undefined)continue;
    const r=scene.rooms?.find(r=>r.id===a.room);
    assert(r,`Unknown instance room: ${a.entity}`);
    assert(a.x>=r.x+4&&a.y>=r.y+4&&a.x+a.w<=r.x+r.w-4&&a.y+a.d+35<=r.y+r.d,`Station exceeds room: ${a.entity}`);
  }
}
