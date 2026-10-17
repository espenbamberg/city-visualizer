import * as k from './anatomy/iso-kit.mjs';
import { personProfile } from './people.mjs';
import { transport } from './transport.mjs';
import { detailAsset, detailDimensions } from './detail-assets.mjs';
import {processAsset} from './process-assets.mjs';
import {outdoorDimensions,isOutdoor,outdoorParts} from './outdoor-assets.mjs';

export const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
export const assetNames = ['house', 'office', 'reception', 'school', 'park', 'square', 'cool-room', 'warehouse', 'workshop', 'depot', 'cabinet', 'server', 'database', 'gateway', ...Object.keys(detailDimensions), ...Object.keys(outdoorDimensions)];
export const sceneryNames = ['tree', 'lamp', 'van', 'bench', 'person', ...Object.keys(outdoorDimensions)];
export const assetDimensions = {house:[112,88,72],office:[122,98,121],reception:[122,98,60],school:[180,115,65],park:[200,150,72],square:[190,130,38],'cool-room':[150,115,58],warehouse:[168,91,73],workshop:[256,128,62],depot:[123,89,67],cabinet:[58,39,42],server:[120,70,85],database:[110,70,60],gateway:[120,55,34]};
Object.assign(assetDimensions,detailDimensions);
Object.assign(assetDimensions,outdoorDimensions);

export function drawing(P, seed = 0) {
  let host = null, personSlot = 0;
  const fine=(svg,level=2)=>host?.detailLevels?`<g data-lod="${level}">${svg}</g>`:svg;
  const project = point => k.iso(point, P);
  const polygon = (points, fill, extra = '') => `<path class="face" d="${k.pathOf(points.map(project), true)}" fill="${fill}" ${extra}/>`;
  const line = (points, color = '#777b70', width = 0.6, extra = '') => fine(`<path d="${k.pathOf(points.map(project))}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`);
  const box = (x, y, z, w, d, h, material = '#c8c3b5', r = 0.4) => `<g style="--material:${material}">${k.solidSvg(k.slabOf({ x, y, w, d, r }, z, h, P, 3, h > 2 ? 0.4 : 0), { tone: 'mid' })}</g>`;
  const cylinder = (x, y, z, r, h, material) => `<g style="--material:${material}">${k.solidSvg(k.cylinder(x, y, r, z, h, P, 16))}</g>`;
  const text = (point, value, size = 7, color = '#4c554d', extra = '') => {
    const [x, y] = project(point);
    return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${escape(value)}</text>`;
  };
  const sign = (x, y, z, value, size = 5, color = '#f8f5e9') => `<text transform="${k.sideMatrix([x, y], z, P, 'left')}" font-size="${size}" fill="${color}" font-weight="600" letter-spacing="0.5">${escape(value)}</text>`;
  function label(a, entity) {
    const { plane = 'top', width = entity.label.length * 7.5 + 32, size = 14, lines = [entity.label] } = a.labelStyle ?? {};
    const stacked = plane === 'front';
    const height = (lines.length + Number(stacked)) * size * 1.2 + 8;
    const inset = stacked ? 5 : size * 2;
    const matrix = plane === 'top' ? k.topMatrix(a.label, a.label[2], P) : k.sideMatrix(a.label, a.label[2], P, 'left');
    return `<g class="map-label ${entity.kind}" data-entity="${entity.id}" aria-hidden="true" transform="${matrix}"><rect class="label-edge" x="${-width/2}" y="1" width="${width}" height="${height}"/><rect class="label-bg" x="${-width/2}" width="${width}" height="${height}"/><text class="label-number" x="${-width/2+5}" y="${size+3}" font-size="${size*.72}">${escape(entity.number)}</text>${lines.map((line,i) => `<text x="${-width/2+inset}" y="${(i+1+Number(stacked))*size*1.2+2}" font-size="${size}" textLength="${Math.min(width-inset-5, line.length*size*.56)}" lengthAdjust="spacingAndGlyphs">${escape(line)}</text>`).join('')}</g>`;
  }
  const front = (x, y, z, w, h, fill) => polygon([[x, y, z], [x + w, y, z], [x + w, y, z + h], [x, y, z + h]], fill);
  const side = (x, y, z, d, h, fill) => polygon([[x, y, z], [x, y + d, z], [x, y + d, z + h], [x, y, z + h]], fill);

  function window(x, y, z, w, h, axis = 'front') {
    const pane = axis === 'front' ? front : side;
    const mid = axis === 'front' ? [[x + w / 2, y, z], [x + w / 2, y, z + h]] : [[x, y + w / 2, z], [x, y + w / 2, z + h]];
    const sill = axis === 'front' ? [[x - 1, y + 0.2, z], [x + w + 1, y + 0.2, z]] : [[x + 0.2, y - 1, z], [x + 0.2, y + w + 1, z]];
    return pane(x, y, z, w, h, '#697a7c') + pane(x, y, z + h * 0.58, w, h * 0.42, '#acbabe') + line(mid, '#e1dfd2', 0.7) + line(sill, '#e5e2d6', 1.5);
  }

  function person(x, y, z = 3, coat, seated = false, appearance, identity) {
    const slot = personSlot++;
    const profile = personProfile(`${seed}:${identity ?? (host ? `${host.id}:${slot}` : `${x}:${y}`)}`, appearance ?? host?.people?.[slot]);
    coat = profile.coat = host ? profile.coat : (appearance?.coat ?? coat ?? profile.coat);
    const {skin,hair,hairstyle,build,trousers} = profile;
    const top = seated ? 23.5 : 24;
    return `<g data-person-profile="${escape(JSON.stringify(profile))}">` + cylinder(x, y, z, 4, 0.3, '#b5b4a4') +
      box(x - 2, y - (seated ? 5 : .5), z + 1, 1.5, 2, seated ? 9 : 11, trousers) +
      box(x + 0.5, y - (seated ? 5 : .5), z + 1, 1.5, 2, seated ? 9 : 11, trousers) +
      (seated ? box(x - 2, y - 5, z + 9, 1.5, 6, 1.5, trousers) + box(x + .5, y - 5, z + 9, 1.5, 6, 1.5, trousers) : '') +
      box(x - 2.6*build, y - 1.6, z + top - 13, 5.2*build, 3.5, 8.5, coat, 1) +
      line([[x - 3, y, z + top - 6], [x - 4, y + 1.5, z + top - 13]], coat, 2.2) +
      line([[x + 3, y, z + top - 6], [x + 4, y + 1.5, z + top - 12]], coat, 2.2) +
      (hairstyle==='long' ? box(x-2.5,y-2.5,z+top-7,5,2,7,hair,1) : '') +
      cylinder(x, y, z + top - 4, 2.25, 4, skin) +
      (hairstyle==='bald' ? '' : cylinder(x, y, z + top - .7, hairstyle==='curly'?2.9:2.4, hairstyle==='curly'?2:1, hair)) +
      (hairstyle==='bun' ? cylinder(x,y-1.5,z+top+.2,1.8,2.5,hair) : '') + '</g>';
  }

  function tree(x, y, height = 49, seed = 0) {
    const [cx, cy] = project([x, y, height]);
    const scale = P.scale;
    const clusters = [[-5, 0, 10], [6, -2, 10], [-8, -8, 8], [0, -14, 10], [8, -11, 8], [0, -3, 11]];
    const colors = seed % 3 === 0 ? ['#8c9973', '#9aa881', '#adb78c'] : seed % 3 === 1 ? ['#6c8569', '#829a77', '#a0ae86'] : ['#929764', '#adb17c', '#bcc08d'];
    return polygon([[x - 13, y - 9, 1], [x + 15, y - 3, 1], [x + 11, y + 15, 1], [x - 15, y + 11, 1]], '#81866b', 'opacity=".12" stroke="none"') +
      cylinder(x, y, 2, 1.9, height - 5, '#7c7460') +
      clusters.map(([dx, dy, r], i) => {
        const points = Array.from({ length: 15 }, (_, n) => {
          const a = n / 15 * Math.PI * 2;
          const radius = r * (n % 2 ? 1 : 0.87);
          return [cx + (dx + Math.cos(a) * radius) * scale, cy + (dy + Math.sin(a) * radius) * scale];
        });
        return `<path d="${k.pathOf(points, true)}" fill="${colors[i % 3]}" stroke="#68765b" stroke-width=".55"/>`;
      }).join('');
  }

  function lamp(x, y) {
    return cylinder(x, y, 2, 3, 1.5, '#8f958a') + cylinder(x, y, 3.5, 0.8, 40, '#727e77') +
      box(x - 1, y - 1, 43, 10, 2, 1.2, '#727e77') + box(x + 6, y - 2, 42, 7, 4, 1.5, '#d8d8c2');
  }

  function van(x, y, color = '#dddcd0', label = '') {
    const wheel = (dx, dy) => `<path d="${k.sideRing([x + dx, y + dy, 7], 5, 'y', P)}" fill="#3d4742" stroke="#34413a" stroke-width=".5"/><path d="${k.sideRing([x + dx, y + dy + .2, 7], 2.5, 'y', P)}" fill="#aab3a5" stroke="#68766a" stroke-width=".5"/>`;
    let out = polygon([[x - 3, y - 2, 2], [x + 50, y - 2, 2], [x + 50, y + 28, 2], [x - 3, y + 28, 2]], '#525c55', 'opacity=".1" stroke="none"');
    for (const dx of [8, 36]) out += wheel(dx, 0);
    out += box(x, y, 7, 46, 22, 14, color, 3) + box(x + 3, y + 1, 20, 26, 20, 9, color, 2) + box(x + 31, y + 1.3, 20, 10, 19, 7, '#819699', 1.5);
    out += front(x + 32, y + 22.2, 20, 9, 6, '#596f74') + front(x + 8, y + 22.2, 12, 14, 7, '#f2f0e5');
    out += sign(x + 9, y + 22.4, 15, label, 4, '#526b5b') + box(x + 44, y - 0.3, 8, 2.8, 23, 3, '#7a8380');
    for (const dx of [8, 36]) out += wheel(dx, 22.5);
    return out;
  }

  function bench(x, y, z = 2) {
    let out = box(x + 3, y + 2, z, 2, 8, 9, '#6e7770') + box(x + 23, y + 2, z, 2, 8, 9, '#6e7770');
    for (let i = 0; i < 4; i++) out += box(x, y + i * 3, z + 9, 29, 2, 1.2, '#a29478');
    return out;
  }

  function roof(x, y, w, d, z, rise, material = '#85786b') {
    const a = [x - 3, y - 3, z], b = [x + w + 3, y - 3, z], c = [x + w + 3, y + d + 3, z], e = [x - 3, y + d + 3, z];
    const r1 = [x - 3, y + d / 2, z + rise], r2 = [x + w + 3, y + d / 2, z + rise];
    let out = polygon([a, b, r2, r1], '#988879') + polygon([b, c, r2], '#c0b29d') + polygon([r1, r2, c, e], material);
    for (let i = 1; i < 9; i++) {
      const t = i / 9;
      out += line([[x - 3, y + d / 2 + (d / 2 + 3) * t, z + rise * (1 - t)], [x + w + 3, y + d / 2 + (d / 2 + 3) * t, z + rise * (1 - t)]], '#655f55', .45);
    }
    out += line([r1, r2], '#5d6054', 1.3);
    return out;
  }

  function shell(a) {
    return box(a.x - 3, a.y - 3, 3, a.w + 6, a.d + 6, 3, '#b9b9a9') + box(a.x, a.y, 6, a.w, a.d, a.h, a.material);
  }

  function house(a) {
    const { x, y, w, d, h } = a;
    let out = shell(a);
    for (const z of [22, 52]) {
      for (const dx of [12, 43, 81]) out += window(x + dx, y + d + .2, z, 17, 19);
      for (const dy of [14, 49]) out += window(x + w + .2, y + dy, z, 17, 19, 'side');
    }
    out += front(x + 47, y + d + .4, 6, 17, 29, '#687569') + front(x + 50, y + d + .6, 19, 11, 12, '#8b9b99');
    out += box(x + 41, y + d, 2, 30, 14, 4, '#bfbba9') + box(x + 44, y + d, 6, 23, 8, 2, '#dbd4c1');
    out += roof(x, y, w, d, h + 7, 28) + box(x + 79, y + 27, h + 20, 12, 11, 24, '#9f8a76');
    out += line([[x + w + 1, y + d, 6], [x + w + 1, y + d, h + 7]], '#7f8275', 1.5);
    out += box(x + 10, y + d + 1, 18, 24, 5, 5, '#7e8b69') + box(x + 80, y + d + 1, 18, 24, 5, 5, '#8d9871');
    return out;
  }

  function office(a) {
    const { x, y, w, d, h } = a;
    let out = shell(a);
    for (let z = 43; z+19<h+6; z+=28) {
      out += box(x - .6, y - .6, z - 4, w + 1.2, d + 1.2, 1.8, '#d5d4c5');
      for (let dx = 9; dx < w - 12; dx += 23) out += window(x + dx, y + d + .3, z, 14, 19);
      for (let dy = 10; dy < d - 14; dy += 25) out += window(x + w + .3, y + dy, z, 15, 19, 'side');
    }
    for (let dx = 8; dx < w - 16; dx += 27) out += window(x + dx, y + d + .3, 9, 22, 24);
    out += front(x + 45, y + d + .7, 6, 27, 28, '#526767') + line([[x + 58, y + d + 1, 6], [x + 58, y + d + 1, 34]], '#b6c0b3', .9);
    out += box(x - 1, y - 1, h + 6, w + 2, d + 2, 3, '#d4d5c7') + box(x + 5, y + 5, h + 9, w - 10, d - 10, 1, '#7d8c80');
    out += box(x - 2, y + d - 2, h + 9, w + 4, 3, 4, '#d1d2c5') + box(x + w - 1, y, h + 9, 3, d, 4, '#d1d2c5');
    out += box(x + 16, y + 16, h + 10, 31, 24, 12, '#a7b0a6');
    for (let i = 0; i < 6; i++) out += line([[x + 20, y + 18 + i * 3, h + 22.2], [x + 42, y + 18 + i * 3, h + 22.2]], '#738074', .8);
    out += box(x - 3, y + d, 35, w + 6, 10, 5, '#5f7769') + sign(x + 17, y + d + 10.3, 36.2, a.sign ?? '', 5.4);
    return out;
  }

  function warehouse(a) {
    const { x, y, w, d, h } = a;
    let out = shell(a);
    for (let i = 8; i < w; i += 12) out += line([[x + i, y + d + .2, 8], [x + i, y + d + .2, h + 3]], '#9b8974', .5);
    out += front(x + 70, y + d + .5, 6, 59, 44, '#8c9188');
    for (let z = 10; z < 48; z += 5) out += line([[x + 70, y + d + .8, z], [x + 129, y + d + .8, z]], '#b7bbaf', .7);
    out += front(x + 15, y + d + .6, 6, 20, 29, '#59685f') + window(x + 15, y + d + .8, 39, 35, 17);
    for (let dy = 7; dy < d - 5; dy += 9) out += line([[x + w + .2, y + dy, 8], [x + w + .2, y + dy, h + 4]], '#9b8974', .5);
    for (const dy of [13, 47]) out += window(x + w + .4, y + dy, 43, 24, 13, 'side');
    out += box(x + 9, y + d, 59, 126, 2, 9, '#7b7160') + sign(x + 18, y + d + 2.3, 61, a.sign ?? '', 6);
    out += roof(x, y, w, d, h + 7, 12, '#808c86');
    for (let i = 0; i < 3; i++) out += box(x + 136, y + d + 2 + i * 6, 4, 21, 5, 2, '#a09073');
    out += box(x + 138, y + d + 2, 7, 17, 14, 14, '#bca47d');
    return out;
  }

  function reception(a) {
    const { x, y, w, d, h } = a;
    let out = box(x - 3, y - 3, 2, w + 6, d + 6, 5, '#a4aea0') + box(x, y, 7, w, d, .6, '#dcd8c7');
    for (let dx = 0; dx <= w; dx += 20) out += line([[x + dx, y, 7.8], [x + dx, y + d, 7.8]], '#c5c8bc', .45);
    for (let dy = 0; dy <= d; dy += 20) out += line([[x, y + dy, 7.8], [x + w, y + dy, 7.8]], '#c5c8bc', .45);
    out += box(x, y, 7, w, 4, h, a.material) + box(x, y + 4, 7, 4, d - 4, h - 16, '#c3c8b9');
    for (const dx of [12, 49, 86]) out += window(x + dx, y + 4.3, 31, 25, 19);
    out += box(x + 10, y + 4, 54, w - 20, 1.4, 9, '#5f7769') + sign(x + 15, y + 5.6, 56, a.sign ?? '', 5);
    out += box(x + 9, y + 9, 7.8, 36, 13, 19, '#aab4a4');
    for (const dx of [11, 22, 33]) out += front(x + dx, y + 22.3, 10, 9, 13, '#d2d4c4') + box(x + dx + 3, y + 22.5, 17, 3, .8, 1, '#7a8777');
    for (let i = 0; i < 4; i++) out += box(x + 13 + i * 6, y + 12, 27, 4, 7, 8, i % 2 ? '#8b9e93' : '#b9a78d');
    const contents = [];
    const add = (at, svg) => contents.push({ at, svg });
    for (const dy of [46, 73]) {
      let chair = '';
      for (const dx of [11, 23]) for (const sy of [dy, dy + 10]) chair += box(x + dx, y + sy, 8, 1.5, 1.5, 9, '#747f77');
      chair += box(x + 9, y + dy - 1, 17, 18, 14, 2.5, '#8b9b88', 1) + box(x + 9, y + dy - 2, 19.5, 18, 2, 12, '#8b9b88', 1);
      add([x + 18, y + dy + 5, 17], chair);
    }
    add([x + 61, y + 41, 20], person(x + 61, y + 41, 8, '#647f80'));
    let counter = box(x + 36, y + 53, 8, 64, 18, 16, '#a2b0a0') + box(x + 33, y + 51, 24, 70, 22, 2, '#b7a98d');
    counter += front(x + 40, y + 71.3, 10, 56, 11, '#d9dcce') + sign(x + 45, y + 71.6, 13, 'SERVICE', 5, '#586d5c');
    counter += box(x + 76, y + 55, 26, 10, 6, .8, '#697b77') + box(x + 80, y + 57, 26.8, 2, 2, 4, '#697b77');
    counter += box(x + 74, y + 58, 30, 16, 2, 11, '#637874', .5) + front(x + 75, y + 60.2, 31, 14, 9, '#889b95');
    for (let i = 0; i < 4; i++) counter += line([[x + 77 + i * 3, y + 60.4, 34], [x + 77 + i * 3, y + 60.4, 38]], '#5d716a', .45);
    counter += box(x + 58, y + 53, 26, 13, 5, .8, '#d9ded3');
    for (let i = 0; i < 4; i++) counter += line([[x + 60 + i * 2.5, y + 53.5, 27], [x + 60 + i * 2.5, y + 57.5, 27]], '#829282', .4);
    counter += box(x + 43, y + 62, 26, 11, 7, .4, '#f0eee2');
    for (let i = 0; i < 3; i++) counter += line([[x + 45, y + 64 + i, 26.5], [x + 51, y + 64 + i, 26.5]], '#899385', .35);
    add([x + 68, y + 62, 22], counter);
    add([x + 62, y + 84, 20], person(x + 62, y + 84, 8, '#ac8969'));
    out += contents.sort((a,b) => k.depthOf(a.at,P)-k.depthOf(b.at,P)).map(item => item.svg).join('');
    out += box(x + w - 3, y + 4, 7, 3, d - 4, 9, '#b5bfaf');
    return out;
  }

  function workbench(x, y, z = 7, width = 48) {
    let out = '';
    for (const dx of [2, width - 4]) for (const dy of [2, 18]) out += box(x + dx, y + dy, z, 2, 2, 17, '#7f8980');
    out += box(x, y, z + 17, width, 23, 2, '#b4a58b') + box(x + 6, y + 5, z + 19, 10, 7, 1, '#e2dfd1');
    out += box(x + width - 13, y + 4, z + 19, 9, 3, 10, '#687c78');
    out += front(x + width - 12, y + 7.2, z + 22, 7, 6, '#a7b8b5');
    return out;
  }

  function appliance(x, y, z = 7) {
    return box(x, y, z, 19, 19, 26, '#e2e1d4', 1) + front(x + 1, y + 19.3, z + 20, 17, 4, '#b2beb7') +
      `<g style="--material:#78898a">${k.solidSvg(k.cylinder(x + 9.5, y + 10, 6, z + 26, .5, P, 20))}</g>` +
      `<path d="${k.sideRing([x + 9.5, y + 19.5, z + 11], 6.3, 'y', P)}" fill="#889b9a" stroke="#606e6b" stroke-width="1"/>`;
  }

  function workshop(a) {
    if(a.size)return sizedWorkshop(a);
    const { x, y, w, d, h } = a;
    let out = box(x - 4, y - 4, 2, w + 8, d + 8, 5, '#a4aea0') + box(x, y, 7, w, d, .6, '#dcd8c7');
    for (let dx = 0; dx <= w; dx += 24) out += line([[x + dx, y, 7.8], [x + dx, y + d, 7.8]], '#c6c8b9', .5);
    for (let dy = 0; dy <= d; dy += 24) out += line([[x, y + dy, 7.8], [x + w, y + dy, 7.8]], '#c6c8b9', .5);
    out += box(x, y, 7, w, 4, h, '#ccc9b8') + box(x, y + 4, 7, 4, d - 4, 42, '#c4c8b8');
    for (const dx of [18, 63, 109]) out += window(x + dx, y + 4.3, 39, 32, 19);
    out += front(x + 166, y + 4.6, 31, 66, 28, '#8c977e');
    for (let i = 0; i < 7; i++) out += line([[x + 171 + i * 8, y + 4.8, 35], [x + 171 + i * 8, y + 4.8, 54]], '#c2cab4', .65);
    const contents = [];
    const add = (at, svg) => contents.push({ at, svg });
    for (const dx of [16, 85]) add([x + dx + 25, y + 36, 19], workbench(x + dx, y + 22));
    add([x + 62, y + 48, 18], person(x + 62, y + 48, 8, '#5f7b78'));
    add([x + 125, y + 50, 18], person(x + 125, y + 50, 8, '#a78465'));
    for (const dx of [23, 55, 91]) add([x + dx + 10, y + 89, 20], appliance(x + dx, y + 79));
    add([x + 154, y + 74, 17], workbench(x + 137, y + 68, 7, 43));
    add([x + 190, y + 94, 18], person(x + 190, y + 94, 8, '#6c7761'));
    let shelves = '';
    for (const sx of [0, 52]) shelves += box(x + 191 + sx, y + 18, 7, 2, 30, 46, '#7c8c80');
    for (const z of [10, 26, 43]) {
      shelves += box(x + 190, y + 17, z, 57, 31, 2, '#a3ac99');
      for (let i = 0; i < 3; i++) {
        if (z === 26 && i === 1) continue;
        shelves += box(x + 194 + i * 16, y + 23, z + 2, 12, 18, 11, i === 0 ? '#bca782' : '#a6b4a1');
      }
    }
    add([x + 220, y + 33, 30], shelves);
    out += contents.sort((a, b) => k.depthOf(a.at, P) - k.depthOf(b.at, P)).map(item => item.svg).join('');
    out += box(x + w - 3, y + 56, 7, 3, d - 56, 13, '#b5b9a6');
    out += box(x + 9, y + d + 1, 7, 79, 2.5, 8, '#697d69') + sign(x + 13, y + d + 3.7, 9, a.sign ?? '', 4.4);
    return out;
  }

  function sizedWorkshop(a) {
    const {x,y,w,d,h}=a,parts=[];
    let out=box(x-4,y-4,2,w+8,d+8,5,'#a4aea0')+box(x,y,7,w,d,.6,'#dcd8c7');
    for(let dx=0;dx<=w;dx+=24)out+=line([[x+dx,y,7.8],[x+dx,y+d,7.8]],'#c6c8b9',.5);
    for(let dy=0;dy<=d;dy+=24)out+=line([[x,y+dy,7.8],[x+w,y+dy,7.8]],'#c6c8b9',.5);
    out+=box(x,y,7,w,4,h,a.material)+box(x,y+4,7,4,d-4,42,'#c4c8b8');
    const add=(at,svg)=>parts.push({at,svg});
    for(let dx=16;dx<=w-130;dx+=70) {
      out+=window(x+dx,y+4.3,39,32,19);
      add([x+dx+24,y+35,18],workbench(x+dx,y+22));
      add([x+dx+24,y+58,18],person(x+dx+24,y+58,8));
    }
    let shelves='';
    for(const dx of [0,54])shelves+=box(x+w-67+dx,y+17,7,2,32,46,'#7c8c80');
    for(const z of [10,26,43]) {
      shelves+=box(x+w-68,y+17,z,57,32,2,'#a3ac99');
      for(let i=0;i<3;i++)shelves+=box(x+w-64+i*16,y+23,z+2,12,18,11,'#b4b19a');
    }
    add([x+w-40,y+33,30],shelves);
    for(let dx=20;dx<w-(d>=160?105:55);dx+=36)add([x+dx+10,y+d-22,20],appliance(x+dx,y+d-32));
    if(d>=160) {
      add([x+44,y+111,20],workbench(x+20,y+100,7,70));
      add([x+w-49,y+d-38,20],workbench(x+w-74,y+d-50));
      add([x+112,y+124,18],person(x+112,y+124,8));
    }
    out+=parts.sort((a,b)=>k.depthOf(a.at,P)-k.depthOf(b.at,P)).map(p=>p.svg).join('');
    out+=box(x+w-3,y+56,7,3,d-56,13,'#b5b9a6');
    out+=box(x+9,y+d+1,7,Math.min(w-18,120),2.5,8,'#697d69')+sign(x+13,y+d+3.7,9,a.sign ?? '',4.4);
    return out;
  }

  function depot(a) {
    const { x, y, w, d, h } = a;
    let out = shell(a) + box(x - 2, y - 2, h + 6, w + 4, d + 4, 3, '#bcc3b7');
    out += box(x + 5, y + 5, h + 9, w - 10, d - 10, 1, '#7b8780');
    out += front(x + 13, y + d + .4, 6, 55, 39, '#7a8b80');
    for (let z = 11; z < 43; z += 5) out += line([[x + 13, y + d + .6, z], [x + 68, y + d + .6, z]], '#b3bfb0', .6);
    out += window(x + 84, y + d + .4, 16, 24, 23) + box(x + 8, y + d, 49, 105, 3, 10, '#4f6c63');
    for (const dy of [15, 48]) out += window(x + w + .3, y + dy, 28, 21, 24, 'side');
    out += sign(x + 17, y + d + 3.3, 51.5, a.sign ?? '', 4.8);
    out += box(x + 8, y + 9, h + 10, 26, 28, 6, '#a7b4a7');
    for (let i = 0; i < 5; i++) out += line([[x + 10, y + 12 + i * 5, h + 16.2], [x + 32, y + 12 + i * 5, h + 16.2]], '#778879', .65);
    return out;
  }

  function school(a) {
    const { x, y, w, d, h } = a;
    let out = box(x - 3, y - 3, 2, w + 6, d + 6, 5, '#b3b7a5') + box(x, y, 7, w, d, .7, '#ded7c3');
    for (let dx = 0; dx <= w; dx += 22) out += line([[x+dx,y,7.8],[x+dx,y+d,7.8]], '#c5c3b3', .45);
    for (let dy = 0; dy <= d; dy += 22) out += line([[x,y+dy,7.8],[x+w,y+dy,7.8]], '#c5c3b3', .45);
    out += box(x,y,7,w,4,h,a.material) + box(x,y+4,7,4,d-4,h-18,'#b8b8a6');
    for (const dx of [12,58,104,150]) out += window(x+dx,y+4.3,44,24,17);
    out += box(x+9,y+4,64,w-18,1.5,7,'#766f5c') + sign(x+16,y+5.7,65.5,a.sign ?? '',5.2);
    out += box(x+49,y+4,18,70,1.6,22,'#958b74') + front(x+51,y+5.8,20,66,18,'#657d6a');
    for (let i=0;i<3;i++) out += line([[x+57,y+6,24+i*4],[x+94-i*5,y+6,24+i*4]],'#d8decb',.6);
    const contents = [];
    for (const dy of [32,72]) for (const dx of [24,75,126]) {
      let desk = '';
      for (const lx of [1,25]) for (const ly of [1,12]) desk += box(x+dx+lx,y+dy+ly,8,1.5,1.5,12,'#89917e');
      desk += box(x+dx,y+dy,20,29,16,2,'#b8a481') + box(x+dx+5,y+dy+3,22,12,9,.4,'#f0eede');
      desk += line([[x+dx+11,y+dy+3,22.5],[x+dx+11,y+dy+12,22.5]],'#aab49d',.4);
      desk += box(x+dx+10,y+dy+22,8,2,2,9,'#7d8a79') + box(x+dx+6,y+dy+18,17,12,10,1.5,'#8f9f8b');
      desk += person(x+dx+12,y+dy+24,8,dx===75?'#b09874':'#849b92',true);
      contents.push({at:[x+dx+15,y+dy+14,15],svg:desk});
    }
    contents.push({at:[x+146,y+20,20],svg:person(x+146,y+20,8,'#7a8a78')});
    out += contents.sort((a,b)=>k.depthOf(a.at,P)-k.depthOf(b.at,P)).map(a=>a.svg).join('');
    out += box(x+w-3,y+4,7,3,d-4,10,'#b7bca9');
    return out;
  }

  function walkingFloor(a) {
    if(isOutdoor(a))return outdoorParts(a,{box,line,project},P).floor;
    const {x,y,w,d}=a;
    if(a.asset==='park' && a.size)return box(x,y,1,w,d,2,a.material,5)+box(x+w*.44,y+2,3,24,d-4,.5,'#d9d5bf',2)+box(x+16,y+d*.57,3,w-32,22,.5,'#d9d5bf',2);
    if (a.asset==='park') return box(x,y,1,w,d,2,a.material,5) + box(x+79,y+2,3,w*.18,d-4,.5,'#d9d5bf',2) + box(x+26,y+79,3,w-48,25,.5,'#d9d5bf',2);
    if (a.asset==='square') {
      let out=box(x,y,1,w,d,2,'#c5c4b4',2) + box(x+5,y+5,3,w-10,d-10,.5,a.material,1);
      out+=line([[x+12,y+12,3.6],[x+w-12,y+12,3.6],[x+w-12,y+d-12,3.6],[x+12,y+d-12,3.6],[x+12,y+12,3.6]],'#dedccb',1);
      for (const dy of [28,52,76]) out+=line([[x+23,y+dy,3.6],[x+83,y+dy,3.6]],'#c7c8b8',.7);
      return out+line([[x+53,y+28,3.6],[x+53,y+76,3.6]],'#c7c8b8',.7);
    }
    if (a.asset==='cool-room') {
      let out=box(x-3,y-3,2,w+6,d+6,5,'#a7b2a5')+box(x,y,7,w,d,.7,'#dddccf');
      for (let dx=0;dx<=w;dx+=24) out+=line([[x+dx,y,7.8],[x+dx,y+d,7.8]],'#bdc8bd',.4);
      for (let dy=0;dy<=d;dy+=24) out+=line([[x,y+dy,7.8],[x+w,y+dy,7.8]],'#bdc8bd',.4);
      return out;
    }
    return '';
  }

  function park(a) {
    const { x, y, w, d } = a;
    if(a.size) {
      let out=a.floorInGround?'':walkingFloor(a);
      const parts=[];
      for(const dy of (d<140?[24]:[24,d-18]))for(let dx=24;dx<w-10;dx+=58) {
        if(Math.abs(dx-(w*.44+12))<25)continue;
        parts.push({at:[x+dx,y+dy,0],svg:tree(x+dx,y+dy,52+(dx%3)*4,dx)});
      }
      for(let dx=20;dx<w-48;dx+=85)parts.push({at:[x+dx+14,y+d*.57+30,0],svg:bench(x+dx,y+d*.57+26,4)});
      parts.push({at:[x+w*.44+12,y+d*.42,0],svg:person(x+w*.44+12,y+d*.42,4)});
      out+=`<g data-interior="${escape(a.entity)}" data-region="${[x,y,w,d]}">${parts.sort((a,b)=>k.depthOf(a.at,P)-k.depthOf(b.at,P)).map(p=>`<g data-depth="${k.depthOf(p.at,P)}">${p.svg}</g>`).join('')}</g>`;
      return out;
    }
    let out = a.floorInGround ? '' : walkingFloor(a);
    const contents = [];
    for (const [tx,ty,th,seed] of [[25,23,57,0],[78,24,66,1],[154,25,62,2],[174,75,66,1],[37,119,57,0],[125,116,61,1]]) {
      out += polygon([[x+tx-15,y+ty-8,3.6],[x+tx+16,y+ty-7,3.6],[x+tx+39,y+ty+26,3.6],[x+tx+4,y+ty+30,3.6]],'#64775c','opacity=".16" stroke="none"');
      contents.push({at:[x+tx,y+ty,0],svg:tree(x+tx,y+ty,th,seed)});
    }
    contents.push({at:[x+48,y+89,0],svg:bench(x+34,y+86,3.6)});
    contents.push({at:[x+146,y+89,0],svg:bench(x+133,y+86,3.6)});
    contents.push({at:[x+92,y+64,0],svg:person(x+92,y+64,4,'#a89071')});
    contents.push({at:[x+101,y+83,0],svg:person(x+101,y+83,4,'#6f8b84')});
    out += `<g data-interior="${escape(a.entity)}" data-region="${[x,y,w,d]}">${contents.sort((a,b)=>k.depthOf(a.at,P)-k.depthOf(b.at,P)).map(a=>`<g data-depth="${k.depthOf(a.at,P)}">${a.svg}</g>`).join('')}</g>`;
    out += box(x+7,y+d-14,3,44,8,3,'#9ca783',2);
    for (let i=0;i<6;i++) out += cylinder(x+12+i*6,y+d-10,6,1.6,1,'#c5b88a');
    return out;
  }

  function square(a) {
    const { x, y, w, d } = a;
    let out = a.floorInGround ? '' : walkingFloor(a);
    out += `<g data-interior="${escape(a.entity)}" data-region="${[x,y,w,d]}"></g>`;
    out += bench(x+121,y+38,3.6) + person(x+141,y+65,4,'#ac9274') + person(x+122,y+81,4,'#819487');
    out += cylinder(x+w-22,y+18,3.5,2,34,'#7a8478') + box(x+w-30,y+17,25,17,2,14,'#d9ddcb');
    out += sign(x+w-28,y+19.2,29,'MEET',4,'#64745b');
    for (let i=0;i<5;i++) out += line([[x+20+i*3,y+d-8,3.7],[x+20+i*3,y+d-3,3.7]],'#7a8377',.8);
    return out;
  }

  function coolRoom(a) {
    const { x, y, w, d, h } = a;
    let out = a.floorInGround ? '' : walkingFloor(a);
    out += box(x,y,7,w,4,h,a.material) + box(x,y+4,7,4,d-4,h-12,'#bdc9be');
    out += window(x+11,y+4.3,28,64,19);
    out += box(x+9,y+4,51,w-18,1.5,9,'#698478') + sign(x+15,y+5.7,53,a.sign ?? '',5.2);
    out += box(x+103,y+4,32,33,10,14,'#d3d9cc',1);
    for (let z=35;z<44;z+=2) out += line([[x+107,y+14.2,z],[x+132,y+14.2,z]],'#899c90',.6);
    out += box(x+14,y+18,8,17,14,22,'#b7c9c2') + cylinder(x+22.5,y+25,30,5,10,'#9db7b6');
    out += front(x+17,y+32.2,19,11,8,'#6e8b81') + box(x+21,y+32.5,23,2,3,1,'#e0e1cf');
    out += box(x+39,y+18,8,34,14,18,'#b6bea9') + box(x+37,y+17,26,38,17,1.5,'#e1dfca');
    for (const dx of [44,51,58]) out += cylinder(x+dx,y+25,27.5,1.5,3,'#e9e9dd');
    out += bench(x+21,y+64,8) + person(x+34,y+70,8,'#9b8872',true);
    out += bench(x+76,y+65,8) + person(x+90,y+72,8,'#809c92',true);
    out += person(x+115,y+90,8,'#718975');
    out += `<g data-interior="${escape(a.entity)}" data-region="${[x,y,w,d]}"></g>`;
    out += box(x+w-3,y+4,7,3,d-4,10,'#b4c2b3');
    out += box(x+57,y+d-2,7,3,5,32,'#8eaa9b') + box(x+88,y+d-2,7,3,5,32,'#8eaa9b') + box(x+57,y+d-2,39,34,5,3,'#8eaa9b');
    out += `<g class="entrance-open">${box(x+88,y+d-26,7,2,25,31,'#abc0b0')}${sign(x+58,y+d+3.2,44,'OPEN',5,'#405b47')}</g>`;
    out += `<g class="entrance-closed" hidden>${box(x+60,y+d-1,7,28,2,31,'#9c9b88')}${front(x+64,y+d+1.2,20,20,10,'#e8e2cb')}${sign(x+65,y+d+1.4,23,'CLOSED',3.4,'#675138')}${box(x+81,y+d+1,16,2,2,2,'#675138')}</g>`;
    return out;
  }

  function cabinet(a) {
    const { x, y, w, d, h } = a;
    let out = box(x, y, 1, w, d, 2, '#dedfd5');
    for (const dx of [6, 31]) {
      out += box(x + dx, y + 6, 3, 20, 24, h, '#c8cec4');
      out += front(x + dx + 2, y + 30.2, 7, 16, h - 7, '#dce0d4');
      for (const dz of [12, 24, 36]) {
        out += line([[x + dx + 3, y + 30.5, dz], [x + dx + 17, y + 30.5, dz]], '#a4afa1', .6);
        out += front(x + dx + 12, y + 30.6, dz + 3, 3, 1.6, '#7d9282');
      }
      out += side(x + dx + 20.3, y + 11, 10, 14, h - 14, '#bdc6ba');
    }
    return out;
  }

  function server(a) {
    const { x, y, w, d, h, material } = a;
    let out = box(x, y, 1, w, d, 3, '#d5d9d2');
    for (const dx of [8, 44, 80]) {
      out += box(x + dx, y + 9, 4, 28, 44, h - 4, material);
      out += front(x + dx + 2, y + 53.3, 9, 24, h - 14, '#637071');
      for (let z = 13; z < h - 10; z += 10) {
        out += front(x + dx + 4, y + 53.5, z, 20, 7, '#a8b2ae');
        out += front(x + dx + 5, y + 53.7, z + 2, 11, 2, '#737f7d');
        out += front(x + dx + 20, y + 53.8, z + 2, 2, 2, '#d6d7ae');
        out += line([[x + dx + 17, y + 53.9, z + 1], [x + dx + 17, y + 53.9, z + 6]], '#566260', .7);
      }
      for (let dy = 16; dy < 46; dy += 4) out += line([[x + dx + 28.2, y + dy, 17], [x + dx + 28.2, y + dy, h - 15]], '#889693', .6);
      out += box(x + dx + 4, y + 15, h + .2, 20, 24, .5, '#939f9b');
      out += sign(x + dx + 5, y + 53.5, h - 5, 'COMPUTE', 3.4, '#4f605d');
    }
    out += box(x + 15, y + 59, 4, 89, 7, 5, '#8b9894');
    for (let dx = 22; dx < 100; dx += 9) out += front(x + dx, y + 66.3, 5, 5, 2, '#d3d7c6');
    return out;
  }

  function database(a) {
    const { x, y, w, d, h, material } = a;
    let out = box(x, y, 1, w, d + 3, 3, '#d5d9d2');
    for (const dx of [29, 80]) {
      out += cylinder(x + dx, y + 34, 4, 22, h - 4, material);
      for (const z of [8, 22, 36, 50]) out += cylinder(x + dx, y + 34, z, 22.5, 1.5, '#94a4a1');
      out += cylinder(x + dx, y + 34, h, 22.5, 2, '#c7ceca');
      out += `<text transform="${k.topMatrix([x + dx, y + 34], h + 2.2, P)}" font-size="6" fill="#60736d" text-anchor="middle">DATA</text>`;
    }
    return out;
  }

  function gateway(a) {
    const { x, y, w, d, h, material } = a;
    let out = box(x, y, 1, w, d, 3, '#d5d9d2');
    for (const z of [5, 20]) {
      out += box(x + 12, y + 8, z, 94, 32, 12, material);
      out += front(x + 15, y + 40.3, z + 2, 88, 8, '#74827d');
      for (let dx = 20; dx < 90; dx += 8) {
        out += front(x + dx, y + 40.5, z + 3, 5, 4, '#c6cebf');
        out += front(x + dx + 1, y + 40.7, z + 4, 3, 2, '#556660');
      }
      out += front(x + 95, y + 40.7, z + 4, 3, 2, '#c6bd91');
    }
    out += sign(x + 21, y + 40.8, h - 2, 'API / MESSAGES', 4, '#e8eadf');
    for (const dx of [24, 47, 70]) out += line([[x + dx, y + 41, 9], [x + dx, y + 49, 9], [x + dx + 8, y + 49, 24], [x + dx + 8, y + 41, 24]], '#9b927d', 1);
    return out;
  }

  const recipes = { house, office, reception, school, park, square, 'cool-room': coolRoom, warehouse, workshop, depot, cabinet, server, database, gateway };
  function ground(a) {
    switch (a.type) {
      case 'box': return box(a.x, a.y, a.z, a.w, a.d, a.h, a.material, a.r);
      case 'line': return line(a.points, a.color, a.width, a.dash ? `stroke-dasharray="${a.dash.join(' ')}"` : '');
      case 'text': return `<text class="ground-label" transform="${k.topMatrix(a.at, a.at[2], P)}" font-size="${a.size}" fill="${a.color}" letter-spacing="${a.tracking ?? 0}">${escape(a.text)}</text>`;
    }
  }
  function scenery(a) {
    if(isOutdoor(a)) { const p=outdoorParts(a,{box,line,project},P);return (a.floorInGround?'':p.floor)+p.body; }
    switch (a.type) {
      case 'tree': return tree(a.x, a.y, a.h, a.seed);
      case 'lamp': return lamp(a.x, a.y);
      case 'van': return van(a.x, a.y, a.material, a.sign);
      case 'bench': return bench(a.x, a.y);
      case 'person': return person(a.x, a.y, a.z, a.material, false, a.appearance, a.id ?? `street:${a.x}:${a.y}`);
    }
  }
  return { project, box, line, polygon, text, person, tree, lamp, van, bench, ground, scenery, label, walkingFloor, asset: a => {
    host=a; personSlot=0;
    try {
      if(isOutdoor(a)) { const p=outdoorParts(a,{box,line,project},P);return (a.floorInGround?'':p.floor)+p.body; }
      if(a.process)return processAsset(a,{box,line,cylinder,sign,person,bench});
      if (['car','van','bicycle','plane'].includes(a.asset)) return transport(P,a.asset,a.material,0,[a.x+a.w/2,a.y+a.d/2,2]);
      return recipes[a.asset] ? recipes[a.asset](a) : detailAsset(a,{box,line,polygon,cylinder,text,person,tree,bench,sign});
    } finally { host=null; }
  } };
}
