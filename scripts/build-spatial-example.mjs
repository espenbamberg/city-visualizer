import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {mobilityHub} from '../examples/mobility-hub.mjs';

const input=fileURLToPath(new URL('../examples/mobility-hub/',import.meta.url));
const output=resolve(process.argv[2]??'preview/spatial');
await mkdir(input,{recursive:true});
for(const [name,value] of Object.entries(mobilityHub()))await writeFile(resolve(input,`${name}.json`),JSON.stringify(value,null,2)+'\n');
const result=spawnSync(process.execPath,[fileURLToPath(new URL('./build.mjs',import.meta.url)),input,output],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
