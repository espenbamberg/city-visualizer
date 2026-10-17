async function checkSpatial(browserPage) {
  const context=await browserPage.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],report=[];
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  page.on('pageerror',error=>errors.push(error.message));
  try {
    const response=await page.goto('http://127.0.0.1:8766/spatial/'),html=await response.text();
    const data=await page.locator('#map-data').evaluate(el=>JSON.parse(el.textContent));
    assert(await page.locator('.map-object').count()===7,'All seven semantic objects are selectable');
    assert(await page.locator('[data-network-edge]').count()===16,'Paths, road and power share the saved network');
    const geometry=await page.locator('.map-object').evaluateAll(nodes=>nodes.map(n=>n.dataset.fullBounds));
    for(const story of data.issue.scenarios) {
      await page.locator(`[data-scenario="${story.id}"]`).click();
      for(let i=0;i<story.steps.length;i++) {
        if(i)await page.locator('[data-action="next"]').click();
        const actor=page.locator(`[data-actor="${story.id}"]`);
        await page.waitForFunction(id=>document.querySelector(`[data-actor="${id}"]`)?.dataset.phase==='settled',story.id);
        const path=data.scene.scenarioLayouts.find(l=>l.scenario===story.id).steps[i].path;
        const point=JSON.parse(await actor.getAttribute('data-position'));
        assert(point.every((n,j)=>Math.abs(n-path.at(-1)[j])<.001),`${story.id}: actor reaches or stays at the named socket`);
        if(story.id==='catch-bus')assert(await actor.evaluate(el=>el.parentElement.dataset.interior)==='stop','Person is interleaved with the shelter parts');
        if(story.id==='find-shade')assert(await actor.evaluate(el=>el.parentElement.dataset.interior)==='shade','Person is interleaved with tree parts');
      }
      if(story.id==='catch-bus') {
        const actor=page.locator('[data-actor="catch-bus"]'),arrival=await actor.getAttribute('data-position');
        for(const action of ['previous','next']) {
          await page.locator(`[data-action="${action}"]`).click();
          await page.waitForFunction(()=>document.querySelector('[data-actor="catch-bus"]')?.dataset.phase==='settled');
          assert(await actor.getAttribute('data-position')===arrival,`${action}: waiting preserves arrival position`);
        }
      }
      await page.locator(`[data-scenario="${story.id}"]`).click();
      assert(await page.locator('.story-layout:not([hidden]) .step-marker[aria-pressed="true"]').count()===1,'Restart has one current step');
      if(story.id==='catch-bus') {
        await page.locator('[data-action="next"]').click();
        await page.waitForFunction(()=>document.querySelector('[data-actor="catch-bus"]')?.dataset.phase==='settled');
        const point=JSON.parse(await page.locator('[data-actor="catch-bus"]').getAttribute('data-position'));
        assert(JSON.stringify(point)===JSON.stringify(data.scene.routes.find(r=>r.relation==='walk-stop').points.at(-1)),'Replay waits at the arrival port');
      }
    }
    report.push('All five stories: named-port arrival, stationary waiting forward/backward/replay, gate traversal, roof/canopy layering and restart.');
    await page.locator('#panel-hide').click();
    for(const entity of data.issue.entities) {
      const object=page.locator(`.map-object[data-entity="${entity.id}"]`);await object.focus();await page.keyboard.press('Enter');
      assert(await object.getAttribute('aria-pressed')==='true',`${entity.id}: keyboard selection`);
    }
    await page.locator('#fit').click();
    await page.screenshot({path:'.playwright-mcp/spatial-desktop.png'});
    await page.setViewportSize({width:390,height:844});await page.locator('#fit').click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal mobile overflow');
    assert(JSON.stringify(geometry)===JSON.stringify(await page.locator('.map-object').evaluateAll(nodes=>nodes.map(n=>n.dataset.fullBounds))),'Viewport changes preserve physical geometry');
    await page.screenshot({path:'.playwright-mcp/spatial-mobile.png'});
    report.push('Keyboard access to every object; desktop/mobile Fit and stable bounds.');

    await page.setViewportSize({width:1440,height:1000});await page.locator('#panel-show').click();
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('[data-scenario="catch-bus"]').click();
    const actor=page.locator('[data-actor="catch-bus"]');
    const first=await actor.getAttribute('data-position');
    await page.waitForFunction(first=>document.querySelector('[data-actor="catch-bus"]').dataset.position!==first,first);
    await page.locator('[data-action="playback"]').click();
    const paused=await actor.getAttribute('data-position');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert(await actor.getAttribute('data-position')===paused,'Pause freezes actual travel');
    report.push('Actual animated travel starts and pauses.');

    await page.goto('http://127.0.0.1:8766/spatial/assets.html');
    assert(await page.locator('.asset-grid article').count()>=7,'Component study includes semantic and scenery variants');
    await page.screenshot({path:'.playwright-mcp/spatial-assets.png',fullPage:true});
    await context.setOffline(true);await page.goto('about:blank');await page.setContent(html,{waitUntil:'load'});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('[data-scenario="visit-garden"]').click();
    await page.locator('[data-action="next"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-actor="visit-garden"]')?.dataset.place==='garden');
    assert(errors.length===0,errors.join('; '));
    report.push('Component study and offline story playback; no page errors.');
    return report;
  } finally {await context.close();}
}
