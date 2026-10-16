import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadViews,renderV2} from '../kit/v2.mjs';

if(![2,4].includes(process.argv.length))throw Error('Usage: node build-v2.mjs [input-directory output-directory]');
const input=resolve(process.argv[2] ?? fileURLToPath(new URL('../examples/v2/',import.meta.url)));
const output=resolve(process.argv[3] ?? 'preview/v2');
const bundle=await loadViews(input);
const [css,runtime]=await Promise.all(['style.css','viewer.js'].map(name=>readFile(new URL(`../kit/${name}`,import.meta.url),'utf8')));
const html=renderV2(bundle,css,runtime).replace('<head>','<head><link rel="icon" href="data:,">');
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'index.html.new'),html);
await rename(resolve(output,'index.html.new'),resolve(output,'index.html'));
console.log(`Built ${output}/index.html: ${Object.keys(bundle.views).length} views, ${(Buffer.byteLength(html)/1024).toFixed(0)} KB`);
