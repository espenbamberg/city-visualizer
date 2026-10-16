import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomInt} from 'node:crypto';
import {composeLandscape} from '../kit/compose-landscape.mjs';

if (process.argv.length!==4) {
  console.error('Usage: node compose.mjs input-directory output-scene.json');
  process.exit(1);
}
const [input,output]=process.argv.slice(2).map(p=>resolve(p));
const issue=JSON.parse(await readFile(resolve(input,'issue.json'),'utf8'));
const layout=JSON.parse(await readFile(resolve(input,'layout.json'),'utf8'));
layout.seed ??= randomInt(2147483647);
const scene=composeLandscape(issue,layout);
await writeFile(output,JSON.stringify(scene,null,2)+'\n');
console.log(`Composed ${scene.instances.length} objects: ${output}`);
