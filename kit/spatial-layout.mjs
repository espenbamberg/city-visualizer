import assert from 'node:assert/strict';
import {placedFootprint} from './object-geometry.mjs';
import {isOutdoor,validateOutdoor} from './outdoor-assets.mjs';

export function relativePosition(item,objects) {
  const p=item.beside;
  assert(p&&typeof p==='object'&&['front','right','back','left'].includes(p.side),'Invalid relative placement');
  assert(item.at===undefined&&item.x===undefined&&item.y===undefined,'Choose coordinates or beside placement');
  const host=objects.find(a=>(a.entity??a.id)===p.entity);assert(host,`Relative placement needs an earlier object: ${p.entity}`);
  const gap=p.gap??16,align=p.align??'center';
  assert(Number.isFinite(gap)&&gap>=0&&['start','center','end'].includes(align),'Invalid placement gap/alignment');
  const a=placedFootprint(host),b=placedFootprint({...item,x:0,y:0});
  const fraction={start:0,center:.5,end:1}[align];
  return ({front:[a.x+(a.w-b.w)*fraction,a.y+a.d+gap],back:[a.x+(a.w-b.w)*fraction,a.y-b.d-gap],right:[a.x+a.w+gap,a.y+(a.d-b.d)*fraction],left:[a.x-b.w-gap,a.y+(a.d-b.d)*fraction]})[p.side];
}

export function placeScenery(specs,instances) {
  assert(Array.isArray(specs),'Scenery layout must be an array');
  const placed=[];
  for(const spec of specs) {
    assert(spec&&isOutdoor(spec),'Authored scenery layout requires a spatial recipe');
    const [x,y]=spec.beside?relativePosition(spec,[...instances,...placed]):[spec.x,spec.y];
    const {beside,repeat,...base}=spec,count=repeat?.count??1,step=repeat?.step??[0,0];
    assert(Number.isInteger(count)&&count>=1&&count<=100&&Array.isArray(step)&&step.length===2&&step.every(Number.isFinite),'Invalid scenery repetition');
    assert(count===1||step.some(n=>n!==0),'Repeated scenery needs nonzero spacing');
    for(let i=0;i<count;i++) {
      const a={...base,x:x+step[0]*i,y:y+step[1]*i,...(count>1&&spec.id?{id:`${spec.id}-${i+1}`}:{})};
      validateOutdoor(a);placed.push(a);
    }
  }
  return placed;
}
