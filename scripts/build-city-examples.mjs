import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {smallExample,largeExample} from '../examples/city-examples.mjs';
import {composeScene} from '../kit/compose.mjs';

const examples=fileURLToPath(new URL('../examples/',import.meta.url));
for (const example of [smallExample(),largeExample()]) {
  const input=resolve(examples,example.id), output=resolve('preview',example.id);
  const scene=composeScene(example.issue,example.layout);
  await mkdir(input,{recursive:true});
  for (const [name,data] of [['issue',example.issue],['layout',example.layout],['scene',scene]]) await writeFile(resolve(input,`${name}.json`),JSON.stringify(data,null,2)+'\n');
  await writeFile(resolve(input,'brief.md'),example.brief);
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./build.mjs',import.meta.url)),input,output],{stdio:'inherit'});
  if (result.status!==0) process.exit(result.status ?? 1);
}
