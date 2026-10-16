import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {v2Example} from '../examples/v2-example.mjs';

const root=fileURLToPath(new URL('../examples/v2/',import.meta.url)),bundle=v2Example(),manifest={version:2,language:bundle.language,root:bundle.root,views:{}};
for(const [id,view] of Object.entries(bundle.views)) {
  const folder=resolve(root,'views',id);await mkdir(folder,{recursive:true});
  for(const name of ['issue','scene'])await writeFile(resolve(folder,`${name}.json`),JSON.stringify(view[name],null,2)+'\n');
  manifest.views[id]={issue:`views/${id}/issue.json`,scene:`views/${id}/scene.json`,...(view.boundaries?{boundaries:view.boundaries}:{})};
}
await writeFile(resolve(root,'map-v2.json'),JSON.stringify(manifest,null,2)+'\n');
const result=spawnSync(process.execPath,[fileURLToPath(new URL('./build-v2.mjs',import.meta.url)),root,resolve('preview/v2')],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status ?? 1);
