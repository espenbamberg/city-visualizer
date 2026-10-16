import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {v4Example,v4ScaleExample} from '../examples/v4-example.mjs';
import {renderV2} from '../kit/v2.mjs';

const root=fileURLToPath(new URL('../examples/v4/',import.meta.url));
const [css,runtime]=await Promise.all(['style.css','viewer.js'].map(name=>readFile(new URL(`../kit/${name}`,import.meta.url),'utf8')));
for(const [name,bundle] of [['v4',v4Example()],['v4-scale',v4ScaleExample()]]) {
  const output=resolve('preview',name),manifest={version:2,language:bundle.language,root:bundle.root,views:{}};
  const html=renderV2(bundle,css,runtime).replace('<head>','<head><link rel="icon" href="data:,">');
  if(name==='v4') {
    for(const [id,view] of Object.entries(bundle.views)) {
      const folder=resolve(root,'views',id);await mkdir(folder,{recursive:true});
      for(const type of ['issue','scene',...(view.layout?['layout']:[])])await writeFile(resolve(folder,`${type}.json`),JSON.stringify(view[type],null,2)+'\n');
      manifest.views[id]={issue:`views/${id}/issue.json`,scene:`views/${id}/scene.json`,...(view.boundaries?{boundaries:view.boundaries}:{})};
    }
    await writeFile(resolve(root,'map-v2.json'),JSON.stringify(manifest,null,2)+'\n');
  }
  await mkdir(output,{recursive:true});await writeFile(resolve(output,'index.html'),html);
  console.log(`Built ${output}/index.html (${Math.round(Buffer.byteLength(html)/1024)} KB)`);
}
