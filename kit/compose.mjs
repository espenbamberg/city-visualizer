import assert from 'node:assert/strict';
import {assetDimensions} from './assets.mjs';
import {composeVariable} from './compose-variable.mjs';

// District plots provide editable starting geometry; their meaning and size come from the brief.
export function composeScene(issue, layout) {
  assert(Array.isArray(issue.entities) && issue.entities.length,'Missing entities');
  assert(Array.isArray(layout.districts) && layout.districts.length,'Missing districts');
  assert(Number.isSafeInteger(layout.seed) && layout.seed>=0,'Provide a nonnegative scene seed');
  const entities = new Map(issue.entities.map(e=>[e.id,e])), seen=new Set();
  for (const district of layout.districts) {
    assert(typeof district.label==='string' && district.label.trim(),'Missing district name');
    assert(Array.isArray(district.plots) && district.plots.length,'Empty district');
    for (const plot of district.plots) {
      assert(entities.has(plot.entity) && !seen.has(plot.entity),'Unknown or repeated district entity');
      assert(Object.hasOwn(assetDimensions,plot.asset),'Unknown district asset');
      assert(plot.height===undefined || (plot.asset==='office' && Number.isFinite(plot.height) && plot.height>=65 && plot.height<=240),'Office height must be between 65 and 240');
      seen.add(plot.entity);
    }
  }
  assert(seen.size===entities.size,'Every entity needs a district plot');
  return composeVariable(issue,layout);
}
