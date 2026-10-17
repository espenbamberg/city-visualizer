import assert from 'node:assert/strict';
import {isOutdoor,outdoorGeometry,outdoorInstance} from './outdoor-assets.mjs';
import {footprint,overlaps} from './spatial.mjs';

export function objectBounds(a) {
  if(isOutdoor(a))return outdoorGeometry(a).bounds;
  if(a.asset)return {...footprint(a),z:0,h:a.h+40};
  return {x:a.x-15,y:a.y-15,z:a.z??0,w:65,d:60,h:a.h??80};
}

export function objectObstacles(a) {
  if(isOutdoor(a))return outdoorGeometry(a).obstacles;
  if(!a.type)return [a];
  if(!['tree','lamp','bench','van'].includes(a.type))return [];
  return [{entity:`scenery ${a.type}`,x:a.x-(a.type==='tree'?6:2),y:a.y-(a.type==='tree'?6:2),w:a.type==='bench'?32:a.type==='van'?54:a.type==='tree'?12:4,d:a.type==='bench'?15:a.type==='van'?28:a.type==='tree'?12:4,h:a.h??(a.type==='bench'?16:45)}];
}

export function validateClearances(scene) {
  const objects=[...scene.instances,...scene.scenery];
  for(const a of objects.filter(isOutdoor)) {
    const {clearances,obstacles}=outdoorGeometry(a);
    for(const b of objects)if(a!==b)for(const obstacle of objectObstacles(b)) {
      const solid={...obstacle,z:obstacle.z??0};
      assert(!clearances.some(c=>overlaps(c,solid)),`Reserved access for ${a.entity??a.type} overlaps ${b.entity??b.type}`);
      assert(!obstacles.some(c=>overlaps(c,solid)),`Physical objects overlap: ${a.entity??a.type}/${b.entity??b.type}`);
    }
  }
}

export function placedFootprint(a) {
  return footprint(isOutdoor(a)?outdoorInstance(a):a);
}
