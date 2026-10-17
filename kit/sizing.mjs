import {assetDimensions} from './assets.mjs';
import {isOutdoor} from './outdoor-assets.mjs';

export const sizeVariants={
  office:{compact:[95,76,93],regular:[122,98,121],expanded:[184,126,149]},
  workshop:{compact:[196,110,62],regular:[256,128,62],expanded:[360,190,68]},
  park:{compact:[150,110,72],regular:[200,150,72],expanded:[300,180,72]},
  desk:{compact:[65,44,52],regular:[75,48,52],expanded:[110,64,52]},
  workbench:{compact:[80,48,55],regular:[90,55,55],expanded:[150,86,55]},
  tester:{compact:[80,48,65],regular:[85,55,65],expanded:[180,105,65]},
  shelf:{compact:[48,32,68],regular:[75,40,68],expanded:[120,48,68]},
  terminal:{compact:[52,40,45],regular:[65,48,45],expanded:[120,72,45]},
  queue:{compact:[48,36,40],regular:[90,50,40],expanded:[140,64,40]}
};
export const emphasisSizes={primary:'expanded',supporting:'regular',context:'compact'};

export function dimensions(plot) {
  if(!Object.hasOwn(assetDimensions,plot.asset))throw Error('Unknown size asset');
  if(plot.emphasis!==undefined && !Object.hasOwn(emphasisSizes,plot.emphasis))throw Error('Invalid emphasis');
  if(plot.height!==undefined && (plot.asset!=='office' || !Number.isFinite(plot.height) || plot.height<65 || plot.height>240))throw Error('Invalid office height');
  const variants=sizeVariants[plot.asset];
  if(plot.size!==undefined && (!variants || !Object.hasOwn(variants,plot.size)))throw Error('Unsupported asset size');
  const size=plot.size ?? (variants && plot.emphasis!==undefined ? emphasisSizes[plot.emphasis] : undefined);
  if(size && plot.height!==undefined)throw Error('Choose a size or an office height, not both');
  const [w,d,h]=size?variants[size]:assetDimensions[plot.asset];
  return {w:isOutdoor(plot)?plot.w??w:w,d:isOutdoor(plot)?plot.d??d:d,h:plot.height ?? h,...(size?{size}:{}),...(plot.emphasis?{emphasis:plot.emphasis}:{})};
}

export function validateSize(instance) {
  if(instance.emphasis!==undefined && !Object.hasOwn(emphasisSizes,instance.emphasis))throw Error('Invalid emphasis');
  if(instance.size===undefined)return;
  const variants=sizeVariants[instance.asset];
  if(!variants || !Object.hasOwn(variants,instance.size))throw Error('Unsupported asset size');
  if(!variants[instance.size].every((n,i)=>n===[instance.w,instance.d,instance.h][i]))throw Error('Geometry differs from declared asset size');
}

export function nameplate(label,width) {
  const size=10,plateWidth=Math.max(105,width),limit=Math.floor((plateWidth-29)/5.6),lines=[];
  for(const word of label.split(' ')) {
    if(!lines.length || `${lines.at(-1)} ${word}`.length>limit)lines.push(word);
    else lines[lines.length-1]+=` ${word}`;
  }
  return {width:plateWidth,size,lines};
}
