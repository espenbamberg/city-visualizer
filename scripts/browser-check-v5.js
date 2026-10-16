async function checkV5(browserPage) {
  const browser=browserPage.context().browser(),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],report=[];
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  page.on('pageerror',e=>errors.push(e.message));
  const open=async id=>{await page.locator(`.map-object[data-entity="${id}"]`).focus();await page.keyboard.press('Enter');};
  const view=id=>page.waitForFunction(id=>document.querySelector('.workspace').dataset.view===id,id);
  let phase='stories';
  try {
    const bundles={};let steps=0;
    for(const id of ['city','campus','building','workspace','technical']) {
      phase=`${id}: steps`;await page.goto(`http://127.0.0.1:8765/v5/${id}/`);
      const bundle=await page.locator('#view-data').evaluate(el=>JSON.parse(el.textContent));bundles[id]=bundle;
      for(const [name,v] of Object.entries(bundle.views)) {
        if(name!==id)await open('check');await view(name);
        assert(await page.locator('#city').count()===1,'Exactly one mounted scene');
        for(const scenario of v.issue.scenarios) {
          await page.locator(`[data-scenario="${scenario.id}"]`).click();
          for(const [i,step] of scenario.steps.entries()) {
            if(i)await page.locator('[data-action="next"]').click();steps++;
            assert(await page.locator('#inspector h3').innerText()===step.title,`${name}: correct step`);
            assert(await page.locator(`[data-actor="${scenario.id}"]`).getAttribute('data-place')===step.state.at,'Actor endpoint');
            const annotation=page.locator(`[data-story="${scenario.id}"] [data-story-step="${i}"]`);
            assert(await annotation.getAttribute('data-walk-path')===await page.locator(`.route[data-relation="${step.state.via}"] .route-line`).getAttribute('d'),'Travel uses visible route');
            const expected=v.scene.scenarioLayouts.find(l=>l.scenario===scenario.id).steps[i].parts??[];
            for(const p of expected)assert(await page.locator(`[data-part="${p.entity}/${p.part}"]`).first().getAttribute('data-part-state')===p.state,'Process part state');
          }
          await page.locator('[data-action="previous"]').click();
          assert(await page.locator('#inspector h3').innerText()===scenario.steps.at(-2).title,'Previous step');
          await page.locator(`[data-scenario="${scenario.id}"]`).click();
          assert(await page.locator('#inspector h3').innerText()===scenario.steps[0].title,'Reselection restarts');
          assert(await page.locator('[data-action="playback"]').innerText()==='Pause story','Restart starts playback');
        }
      }
      if(id==='building')await page.locator('.city-home').click();
      await page.setViewportSize({width:390,height:844});await page.locator('#panel-hide').click();
      await page.locator('#fit').click();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Phone has no horizontal overflow');
      assert(await page.locator('#panel-show').isVisible(),'Collapsed panel has a reachable island');
      await page.locator('#panel-show').click();await page.setViewportSize({width:1440,height:1000});
    }
    report.push(`${steps} steps across five root environments and the nested workspace: endpoints, shared paths, part states, previous/restart and phone layout.`);

    phase='indoor travel and exact return';await page.goto('http://127.0.0.1:8765/v5/building/');
    await page.locator('#show-labels').uncheck();await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('[data-scenario="complete"]').click();
    const positions=await page.evaluate(async()=>{
      const a=document.querySelector('[data-actor="complete"]'),positions=[];
      for(let i=0;i<16;i++){await new Promise(requestAnimationFrame);positions.push(a.dataset.position);}return positions;
    });
    assert(new Set(positions).size>1,'Real indoor movement advances');
    await page.locator('[data-action="playback"]').click();
    const snapshot=async()=>({position:await page.locator('[data-actor="complete"]').getAttribute('data-position'),camera:await page.locator('#world').getAttribute('transform'),step:await page.locator('#inspector h3').innerText(),labels:await page.locator('#show-labels').isChecked(),parts:await page.locator('[data-part]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.part,n.dataset.partState]))});
    const before=await snapshot();await open('check');await view('workspace');
    assert(await page.locator('.city-home').innerText()==='Hele kartet','Environment-neutral return');
    await page.locator('[data-back]').click();await view('building');
    await page.waitForFunction(camera=>document.querySelector('#world').getAttribute('transform')===camera,before.camera);
    assert(JSON.stringify(await snapshot())===JSON.stringify(before),'Exact camera, actor, step, layer and part restoration');
    assert(await page.locator('.map-object[data-entity="check"]').evaluate(el=>el===document.activeElement),'Return focus');
    assert(await page.locator('[data-action="playback"]').innerText()==='Play story','Return pauses playback');
    await page.locator('[data-action="playback"]').click();
    await page.waitForFunction(pos=>document.querySelector('[data-actor="complete"]').dataset.position!==pos,before.position);
    await page.locator('[data-action="playback"]').click();
    await page.emulateMedia({reducedMotion:'reduce'});
    report.push('Actual indoor movement, interrupted drilldown, exact paused return and resumed travel.');

    phase='fullscreen and mobile navigation';await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>document.fullscreenElement?.id==='map-workspace');
    await page.locator('#panel-hide').click();await open('check');await view('workspace');
    assert(await page.locator('.workspace').evaluate(el=>el===document.fullscreenElement&&el.classList.contains('panel-hidden')),'Fullscreen contains panel and child');
    await page.locator('[data-back]').click();await page.locator('#fullscreen').click();
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:false}));
    await page.locator('#fullscreen').click();await open('check');await view('workspace');
    await page.locator('#city').focus();await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('.map-fullscreen').open);
    await page.keyboard.press('Escape');await view('building');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Phone return fits');
    report.push('Native and phone fallback fullscreen, hidden panel and ordered Escape navigation.');

    phase='autoplay';await page.setViewportSize({width:1440,height:1000});await page.clock.install();
    for(const [id,bundle] of Object.entries(bundles)) {
      await page.goto(`http://127.0.0.1:8765/v5/${id}/`);
      for(const [name,v] of Object.entries(bundle.views)) {
        if(name!==id)await open('check');await view(name);
        for(const s of v.issue.scenarios) {
          await page.locator(`[data-scenario="${s.id}"]`).click();
          for(const step of s.steps)await page.clock.fastForward(30000);
          assert(await page.locator('#inspector h3').innerText()===s.steps.at(-1).title,'Automatic outcome');
          assert(await page.locator('[data-action="playback"]').innerText()==='Replay story','Playback stops at outcome');
        }
      }
    }
    report.push('All 12 stories autoplay to their outcomes and stop (virtual clock, reduced motion).');
    assert(!errors.length,errors.join('; '));return report;
  } catch(e){throw Error(`${phase}: ${e.message}; page errors: ${errors.join('; ')}`);}finally{await context.close();}
}
