import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {landscapeExamples,buildingLayout} from '../examples/landscapes.mjs';
import {composeLandscape} from '../kit/compose-landscape.mjs';
import {renderV2} from '../kit/v2.mjs';

const input=fileURLToPath(new URL('../examples/landscapes/',import.meta.url)),output=resolve(process.argv[2]??'preview/v5');
const [css,runtime]=await Promise.all(['style.css','viewer.js'].map(name=>readFile(new URL(`../kit/${name}`,import.meta.url),'utf8')));
const bundles=landscapeExamples();
for(const [id,bundle] of Object.entries(bundles)) {
  const folder=resolve(input,id),manifest={version:2,language:bundle.language,root:bundle.root,views:{}};
  for(const [name,v] of Object.entries(bundle.views)) {
    const dir=resolve(folder,'views',name);await mkdir(dir,{recursive:true});
    for(const type of ['issue','scene','layout'])await writeFile(resolve(dir,`${type}.json`),JSON.stringify(v[type],null,2)+'\n');
    manifest.views[name]={issue:`views/${name}/issue.json`,scene:`views/${name}/scene.json`,...(v.boundaries?{boundaries:v.boundaries}:{})};
  }
  await writeFile(resolve(folder,'map-v2.json'),JSON.stringify(manifest,null,2)+'\n');
  await mkdir(resolve(output,id),{recursive:true});
  const html=renderV2(bundle,css,runtime).replace('<head>','<head><link rel="icon" href="data:,">');
  await writeFile(resolve(output,id,'index.html'),html);
  console.log(`Built ${id}: ${Object.keys(bundle.views).length} views, ${Math.round(Buffer.byteLength(html)/1024)} KB`);
}
const comparison=resolve(input,'workspace','comparison');await mkdir(comparison,{recursive:true});
await writeFile(resolve(comparison,'layout.json'),JSON.stringify(buildingLayout(),null,2)+'\n');
await writeFile(resolve(comparison,'scene.json'),JSON.stringify(composeLandscape(bundles.workspace.views.workspace.issue,buildingLayout()),null,2)+'\n');
await writeFile(resolve(output,'index.html'),`<!doctype html><html lang="nb"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CityVisualizer · V5 landskap</title><style>body{max-width:850px;margin:8vh auto;padding:24px;background:#f6f3e9;color:#344938;font:18px/1.6 system-ui}h1{line-height:1.15}a{color:inherit}li{margin:22px 0}small{font-size:14px}</style><h1>Landskapet følger innholdet</h1><p>Fem romlige rammer, samme uttrykk og betjening. Åpne kontrollrommet i bygningen for å følge arbeidet ved benkene.</p><ul>${Object.entries(bundles).map(([id,b])=>`<li><a href="${id}/index.html">${b.views[id].issue.title}</a><br><small>${b.views[id].issue.presentation.layoutNote}</small></li>`).join('')}</ul><p>Hver illustrasjon er en selvstendig HTML-fil som kan åpnes offline.</p></html>`);
