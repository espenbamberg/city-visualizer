async function checkV4(browserPage) {
  const context=await browserPage.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],report=[];
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  page.on('pageerror',e=>errors.push(e.message));
  const open=async id=>{await page.locator(`.map-object[data-entity="${id}"]`).focus();await page.keyboard.press('Enter');};
  const physical=()=>page.locator('.map-object').evaluateAll(nodes=>nodes.map(n=>[n.dataset.entity,n.dataset.fullBounds,...Array.from(n.querySelectorAll('.iso-fill'),p=>p.getAttribute('d'))]));
  try {
    await page.goto('http://127.0.0.1:8765/v4/');await page.locator('#panel-hide').click();
    assert(await page.locator('[data-network-edge]').count()>20,'Shared transport network is actually rendered');
    const original=JSON.stringify(await physical());
    await page.setViewportSize({width:390,height:844});
    const home=page.locator('.map-object[data-entity="home"]');
    const pixels=()=>home.evaluate(el=>Number(el.dataset.lodWidth)*document.querySelector('#world').transform.baseVal.consolidate().matrix.a*Math.min(el.ownerSVGElement.clientWidth/el.ownerSVGElement.viewBox.baseVal.width,el.ownerSVGElement.clientHeight/el.ownerSVGElement.viewBox.baseVal.height));
    async function pixelZoom(target) {
      await page.mouse.move(190,340);await page.keyboard.down('Control');
      try {for(let i=0;i<20;i++) {const current=await pixels();if(Math.abs(current-target)<.1)break;await page.mouse.wheel(0,Math.max(-120,Math.min(120,-Math.log(target/current)/.0025)));await page.evaluate(()=>new Promise(requestAnimationFrame));}}
      finally {await page.keyboard.up('Control');}
    }
    await pixelZoom(70);assert(await home.getAttribute('data-lod-tier')==='0','Small screen-space objects use overview detail');
    await pixelZoom(90);assert(await home.getAttribute('data-lod-tier')==='1','Area detail appears above its pixel threshold');
    await pixelZoom(80);assert(await home.getAttribute('data-lod-tier')==='1','Hysteresis prevents threshold flicker');
    await pixelZoom(74);assert(await home.getAttribute('data-lod-tier')==='0','Overview returns below the lower threshold');
    await pixelZoom(200);assert(await home.getAttribute('data-lod-tier')==='2','Close-up exposes fine geometry');
    assert(JSON.stringify(await physical())===original,'LOD and zoom never rebuild or resize the objects');
    await page.locator('#fit').click();await home.focus();
    assert(await home.locator('[data-lod="1"]').first().evaluate(el=>getComputedStyle(el).opacity)==='1','Focused small objects expose their name');
    await page.locator('#panel-show').click();await page.locator('#show-labels').uncheck();
    assert(await page.locator('.map-label').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).display==='none')),'Explicit label hiding has priority over LOD');
    await page.locator('#show-labels').check();await page.setViewportSize({width:1440,height:1000});
    report.push('Screen-pixel detail thresholds, hysteresis, stable geometry, keyboard reveal, mobile Fit and layer precedence.');

    const paths={workshop:['workshop'],diagnostics:['workshop','diagnosis'],booking:['booking'],validation:['booking','validate']};
    const bundle=await page.locator('#view-data').evaluate(el=>JSON.parse(el.textContent));
    for(const [id,path] of Object.entries(paths)) {
      if(await page.locator('.city-home').count())await page.locator('.city-home').click();
      for(const entity of path)await open(entity);
      for(const s of bundle.views[id].issue.scenarios) {
        await page.locator(`[data-scenario="${s.id}"]`).click();
        const layout=bundle.views[id].scene.scenarioLayouts.find(l=>l.scenario===s.id);
        for(let i=0;i<s.steps.length;i++) {
          if(i)await page.locator('[data-action="next"]').click();
          const actual=await page.locator('[data-part]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.part,n.dataset.partState])));
          const expected=Object.fromEntries((layout.steps[i].parts??[]).map(p=>[`${p.entity}/${p.part}`,p.state]));
          for(const [key,state] of Object.entries(actual))assert(state===(expected[key]??'idle'),`${id}/${s.id}/${i}: direct part state ${key}`);
        }
        await page.locator(`[data-scenario="${s.id}"]`).click();
        const expected=layout.steps[0].parts??[];
        for(const p of expected)assert(await page.locator(`[data-part="${p.entity}/${p.part}"]`).first().getAttribute('data-part-state')===p.state,'Restart restores the first part state');
      }
    }
    await page.locator('.city-home').click();await open('workshop');
    await page.locator('[data-scenario="repair"]').click();await page.locator('[data-action="next"]').click();
    const parts=await page.locator('[data-part]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.part,n.dataset.partState]));
    await open('diagnosis');await page.locator('[data-back]').click();
    assert(JSON.stringify(parts)===JSON.stringify(await page.locator('[data-part]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.part,n.dataset.partState]))),'Back restores all part states exactly');
    report.push('Every process-specific highlight/state, restart and nested return across four authored interiors.');

    const start=Date.now();await page.goto('http://127.0.0.1:8765/v4-scale/');const loadMs=Date.now()-start;
    assert(await page.locator('.map-object').count()===33,'Scale fixture has 30 places and 33 objects');
    const nodes=await page.locator('#city *').count();
    for(let i=0;i<4;i++){await open('workshop');await open('diagnosis');await page.locator('.city-home').click();}
    assert(await page.locator('#city *').count()===nodes,'Nested navigation retains a stable node count');
    await page.setViewportSize({width:390,height:844});await page.locator('#fit').click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Large map has no phone overflow');
    assert(!errors.length,errors.join('; '));return [...report,{scaleLoadMs:loadMs,rootSvgNodes:nodes}];
  } finally {await context.close();}
}
