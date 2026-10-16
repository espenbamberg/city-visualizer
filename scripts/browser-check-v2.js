async function checkV2(browserPage,preview='v2') {
  const context=await browserPage.context().browser().newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage(),errors=[],report=[];
  let phase='initial moving story';
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  page.on('pageerror',e=>errors.push(e.message));
  const view=id=>page.waitForFunction(id=>document.querySelector('.workspace').dataset.view===id,id);
  const open=async id=>{const actor=page.locator(`.story-actor[data-entity="${id}"]:not([hidden])`);await (await actor.count()?actor:page.locator(`.map-object[data-entity="${id}"]`)).focus();await page.keyboard.press('Enter');};
  try {
    await page.goto(`http://127.0.0.1:8765/${preview}/`);
    await page.locator('[data-scenario="visit"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-actor="visit"]').dataset.phase==='moving');
    await page.locator('[data-action="playback"]').click();
    const position=await page.locator('[data-actor="visit"]').getAttribute('data-position');
    const camera=await page.locator('#world').getAttribute('transform');
    phase='open workshop';await open('workshop');await view('workshop');
    assert(await page.locator('#inspector').innerText()==='','New local view opens in overview');
    assert(await page.locator('#view-boundaries').innerText().then(s=>s.includes('Lever apparatet')),'Parent handoff is explained inside');
    await page.locator('[data-scenario="repair"]').click();
    await page.locator('[data-action="playback"]').click();
    const localPosition=await page.locator('[data-actor="repair"]').getAttribute('data-position');
    phase='open diagnosis';await open('diagnosis');await view('diagnostics');
    assert(await page.locator('.view-crumbs button').count()===2,'Three-level navigation');
    phase='return workshop';await page.locator('[data-back]').click();await view('workshop');
    assert(await page.locator('[data-actor="repair"]').getAttribute('data-position')===localPosition,'Local moving position is restored');
    assert(await page.locator('[data-action="playback"]').innerText()==='Play story','Return leaves story paused');
    phase='return city camera';await page.locator('[data-back]').click();await view('city');
    await page.waitForFunction(camera=>document.querySelector('#world').getAttribute('transform')===camera,camera);
    assert(await page.locator('[data-actor="visit"]').getAttribute('data-position')===position,'Parent moving position restored exactly');
    assert(await page.locator('.map-object[data-entity="workshop"]').evaluate(el=>el===document.activeElement),'Return restores source focus');
    await page.locator('[data-action="playback"]').click();
    await page.waitForFunction(pos=>document.querySelector('[data-actor="visit"]').dataset.position!==pos,position);
    report.push('Three levels, paused exact-position restoration, camera/focus restoration and resumed travel.');

    // An immediate reverse must not commit the pending child view.
    await open('workshop');await page.locator('[data-back]').click();
    assert(await page.locator('.workspace').getAttribute('data-view')==='city','Reverse cancels an unfinished entry');
    await page.emulateMedia({reducedMotion:'reduce'});
    const bundle=await page.locator('#view-data').evaluate(el=>JSON.parse(el.textContent));
    const paths={city:[],workshop:['workshop'],diagnostics:['workshop','diagnosis'],park:['park'],van:['van'],booking:['booking'],validation:['booking','validate'],plane:['plane']};
    for(const [id,path] of Object.entries(paths)) {
      phase=`all processes: ${id}`;
      if(await page.locator('.city-home').count())await page.locator('.city-home').click();
      for(const entity of path)await open(entity);
      await view(id);
      assert(await page.locator('#city').count()===1,'Only one mounted SVG scene');
      const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id));
      assert(new Set(ids).size===ids.length,'No duplicate scene DOM IDs');
      for(const scenario of bundle.views[id].issue.scenarios) {
        await page.locator(`[data-scenario="${scenario.id}"]`).click();
        for(const [i,step] of scenario.steps.entries()) {
          if(i)await page.locator('[data-action="next"]').click();
          assert((await page.locator('#inspector h3').innerText())===step.title,'Local steps match their own process');
          if(scenario.actor) {
            const actor=page.locator(`[data-actor="${scenario.id}"]`);
            assert(await actor.getAttribute('data-place')===step.state.at,'Every actor reaches its declared endpoint');
            const annotation=page.locator(`[data-story="${scenario.id}"] [data-story-step="${i}"]`);
            assert(await page.locator(`.route[data-relation="${step.state.via}"] .route-line`).getAttribute('d')===await annotation.getAttribute('data-walk-path'),'All kinds share actual visible geometry');
            if(step.actor)assert(await actor.getAttribute('data-kind')===step.actor.kind && (await page.locator('.handoff').innerText()).includes(step.handoff),'Explicit handoff changes the actor');
          }
        }
      }
    }
    report.push('All eight views and all local stories, mixed-actor handoffs, visible route equality and complete end states.');

    phase='real travel of non-person actors';
    for(const [place,story,kind] of [['city','delivery','van'],['city','bike','bicycle'],['city','air','plane'],['booking','accepted','data'],['van','energy','electricity']]) {
      await page.emulateMedia({reducedMotion:'reduce'});
      if(await page.locator('.city-home').count())await page.locator('.city-home').click();
      if(place!=='city')await open(place);
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.locator(`[data-scenario="${story}"]`).click();
      const sample=await page.evaluate(async({story,kind})=>{
        const actor=document.querySelector(`[data-actor="${story}"]`),step=document.querySelector(`[data-story="${story}"] [data-story-step="0"]`);
        const line=document.querySelector(`.route[data-relation="${step.dataset.walkRoute}"] .route-line`);
        const origin=document.querySelector('#city').dataset.origin.split(',').map(Number),positions=[],errors=[];
        for(let n=0;n<15;n++) {
          await new Promise(requestAnimationFrame);
          positions.push(actor.dataset.position);
          const foot=new DOMPoint(...origin).matrixTransform(actor.getScreenCTM());
          const numbers=line.getAttribute('d').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number),points=[];
          for(let j=0;j<numbers.length;j+=2)points.push(new DOMPoint(numbers[j],numbers[j+1]).matrixTransform(line.getScreenCTM()));
          let distance=Infinity;
          for(let j=1;j<points.length;j++) {
            const a=points[j-1],b=points[j],dx=b.x-a.x,dy=b.y-a.y;
            const t=Math.max(0,Math.min(1,((foot.x-a.x)*dx+(foot.y-a.y)*dy)/(dx*dx+dy*dy||1)));
            distance=Math.min(distance,Math.hypot(foot.x-a.x-t*dx,foot.y-a.y-t*dy));
          }
          errors.push(distance);
        }
        return {moved:new Set(positions).size>1,maxError:Math.max(...errors),correctKind:actor.dataset.kind===kind,heading:actor.dataset.heading};
      },{story,kind});
      assert(sample.moved && sample.correctKind && sample.maxError<=1,'All moving kinds follow the rendered line within one pixel');
      if(['van','bicycle','plane'].includes(kind))assert(sample.heading!==undefined,'Transport has a world-oriented heading');
      await page.locator('[data-action="playback"]').click();
      const pos=await page.locator(`[data-actor="${story}"]`).getAttribute('data-position');
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert(await page.locator(`[data-actor="${story}"]`).getAttribute('data-position')===pos,'Pause freezes every kind');
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    report.push('Real intermediate van, bicycle, plane, data and electricity motion: matching paths, headings and pause.');

    phase='fullscreen';await page.locator('.city-home').click();
    await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>document.fullscreenElement?.id==='map-workspace');
    await page.locator('#panel-hide').click();
    await open('booking');await open('validate');await view('validation');
    assert(await page.locator('.workspace').evaluate(el=>el===document.fullscreenElement && el.classList.contains('panel-hidden')),'Fullscreen and minimized panel survive drilldown');
    await page.locator('[data-back]').click();await view('booking');
    await page.locator('#fullscreen').click();
    await page.locator('.city-home').click();
    await page.locator('#panel-show').click();
    await page.locator('[data-scenario="delivery"]').click();
    const van=page.locator('[data-actor="delivery"]');
    assert(await van.getAttribute('data-entity')==='van','Moving vehicle represents its named entity');
    assert(await page.locator('.map-object[data-entity="van"]').evaluate(el=>getComputedStyle(el).visibility==='hidden'),'Parked duplicate is suppressed');
    await van.focus();await page.keyboard.press('Enter');await view('van');
    await page.locator('[data-back]').click();
    assert(await van.evaluate(el=>el===document.activeElement),'Return focuses the traveling vehicle');
    report.push('Native fullscreen, hidden panel, moving-vehicle opening and identity without a parked duplicate.');

    phase='phone';await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:false}));
    await page.locator('#fullscreen').click();
    await open('park');await view('park');
    await page.locator('#panel-hide').click();
    await page.locator('#city').focus();await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('.map-fullscreen').open);
    assert(await page.locator('.workspace').getAttribute('data-view')==='park','Escape exits fullscreen before leaving the view');
    await page.locator('#city').focus();await page.keyboard.press('Escape');await view('city');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Phone layout has no horizontal overflow');
    report.push('Phone layout, fallback fullscreen, hidden panel and ordered Escape navigation.');
    phase='automatic local playback';
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('#panel-show').click();
    await page.clock.install();
    for(const [id,path] of Object.entries(paths).filter(([id])=>id!=='city')) {
      if(await page.locator('.city-home').count())await page.locator('.city-home').click();
      for(const entity of path)await open(entity);
      for(const scenario of bundle.views[id].issue.scenarios) {
        await page.locator(`[data-scenario="${scenario.id}"]`).click();
        await page.clock.runFor(120000);
        assert(await page.locator('#inspector h3').innerText()===scenario.steps.at(-1).title,'Local autoplay reaches the outcome');
        assert(await page.locator('[data-action="playback"]').innerText()==='Replay story','Local autoplay stops at the outcome');
      }
    }
    report.push('Every local process autoplays to its outcome and stops (virtual clock, reduced motion).');
    assert(errors.length===0,errors.join('; '));return report;
  } catch(error) {throw Error(`${phase}: ${error.message}; page errors: ${errors.join('; ')}`);} finally {await context.close();}
}
