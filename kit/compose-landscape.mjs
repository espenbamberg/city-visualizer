import assert from 'node:assert/strict';
import {validateEnvironment} from './environments.mjs';
import {composeScene} from './compose.mjs';
import {composeGroups} from './compose-groups.mjs';
import {composeLocal} from './compose-local.mjs';
import {composeBuilding} from './compose-building.mjs';

export function composeLandscape(issue,layout) {
  validateEnvironment(layout.environment);
  const shapes=['districts','groups','rows','rooms'].filter(key=>layout[key]!==undefined);
  assert(shapes.length===1,'Choose exactly one layout: districts, groups, rows or rooms');
  const shape=shapes[0],allowed={districts:['city'],groups:['city','campus'],rows:['workspace','technical'],rooms:['building']};
  assert(layout.environment===undefined||allowed[shape].includes(layout.environment),`Incompatible environment and ${shape} layout`);
  const scene=({districts:composeScene,groups:composeGroups,rows:composeLocal,rooms:composeBuilding})[shape](issue,layout);
  if(layout.environment)scene.environment=layout.environment;
  return scene;
}
