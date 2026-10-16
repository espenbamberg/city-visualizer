// Exercises state changes, real animation and cancellation in both data sets.
async function checkMotion(browserPage) {
  const context=await browserPage.context().browser().newContext({viewport:{width:1440,height:1100}});
  const page=await context.newPage();
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try {
    for(const path of ['heat/','']) {
      await page.goto(`http://127.0.0.1:8765/${path}`);
      await page.emulateMedia({reducedMotion:'no-preference'});
      const {issue,scene}=await page.locator('#map-data').evaluate(el=>JSON.parse(el.textContent));
      for(const scenario of issue.scenarios.filter(s=>s.actor)) {
        await page.locator(`[data-scenario="${scenario.id}"]`).click();
        const actor=page.locator(`[data-actor="${scenario.id}"]`);
        for(const [i,step] of scenario.steps.entries()) {
          if(i) await page.locator('[data-action="next"]').click();
          const layout=scene.scenarioLayouts.find(l=>l.scenario===scenario.id);
          const expected=layout.steps[i].path.at(-1);
          if(layout.steps[i].path.length>1) {
            assert(await actor.getAttribute('data-phase')==='moving','Sequential transfer moves');
            assert((await page.locator('#story-status').innerText()).includes(step.state.moving),'Travel status is not premature arrival');
            const start=await actor.getAttribute('data-position');
            const samples=await actor.evaluate(async el=>{
              const out=[];
              for(let n=0;n<12;n++) {await new Promise(requestAnimationFrame);out.push(JSON.parse(el.dataset.position));}
              return out;
            });
            assert(samples.every(p=>p.every(Number.isFinite)),'Finite intermediate positions');
            assert(samples.some(p=>JSON.stringify(p)!==start),'The actor really moves');
          }
          await page.waitForFunction(id=>document.querySelector(`[data-actor="${id}"]`).dataset.phase==='settled',scenario.id);
          assert(await actor.getAttribute('data-position')===JSON.stringify(expected),'Exact authored destination');
          assert(await actor.getAttribute('data-place')===step.state.at,'Semantic location agrees');
          assert((await page.locator('#story-status').innerText()).includes(step.state.caption),'Settled caption agrees');
          assert(await page.locator('.story-actor:not([hidden])').count()===1,'One narrated actor');
          if(step.state.access) {
            const room=page.locator(`.map-object[data-entity="${step.state.access.entity}"]`);
            assert(await room.locator(`.entrance-${step.state.access.value}`).isVisible(),'Physical access state agrees');
          }
          if(path==='heat/' && step.state.at==='park') assert(await actor.evaluate(el=>el.parentNode.dataset.interior)==='park','Park actor interleaved with trees above the floor');
        }
        // Jump backwards, then request another step during its transition.
        // Keyboard activation also reaches markers behind the floating panel.
        await page.locator(`[data-story="${scenario.id}"] [data-step="0"]`).focus();
        await page.keyboard.press('Enter');
        await page.locator(`[data-story="${scenario.id}"] [data-step="${scenario.steps.length-1}"]`).focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(id=>document.querySelector(`[data-actor="${id}"]`).dataset.phase==='settled',scenario.id);
        assert(await actor.getAttribute('data-place')===scenario.steps.at(-1).state.at,'Latest requested state wins');
        await page.locator('[data-action="overview"]').click();
        assert(await page.locator('.story-actor:not([hidden])').count()===0,'Overview removes story actors');
        assert(!await page.locator('#story-status').isVisible(),'Overview removes status');
      }
      const first=issue.scenarios.find(s=>s.actor);
      if(first) {
        if(path==='heat/') {
          await page.locator(`[data-scenario="${first.id}"]`).click();
          await page.locator('#zoom-in').click();
          const b=await page.locator('#city').boundingBox();
          await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await page.mouse.down();
          const actor=page.locator(`[data-actor="${first.id}"]`), position=await actor.getAttribute('data-position');
          await page.evaluate(async()=>{for(let i=0;i<8;i++)await new Promise(requestAnimationFrame);});
          assert(await actor.getAttribute('data-position')!==position,'Grabbing the camera must not cancel story movement');
          await page.mouse.up();await page.locator('#fit').click();
          await page.locator('[data-action="overview"]').click();
          await page.locator(`[data-scenario="${first.id}"]`).click();
          await page.locator('#text-view').scrollIntoViewIfNeeded();
          await page.waitForFunction(id=>document.querySelector(`[data-actor="${id}"]`).dataset.phase==='settled',first.id);
          const settled=await actor.getAttribute('data-position');
          await page.locator('#city').scrollIntoViewIfNeeded();
          await page.evaluate(async()=>{for(let i=0;i<8;i++)await new Promise(requestAnimationFrame);});
          assert(await actor.getAttribute('data-position')===settled,'Offscreen transition must not replay on return');
          await page.locator('[data-action="overview"]').click();
        }
        await page.locator(`[data-scenario="${first.id}"]`).click();
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.waitForFunction(id=>document.querySelector(`[data-actor="${id}"]`).dataset.phase==='settled',first.id);
        await page.locator('#fullscreen').click();
        await page.waitForFunction(()=>!!document.fullscreenElement);
        await page.locator(`[data-story="${first.id}"] [data-step="${first.steps.length-1}"]`).focus();
        await page.keyboard.press('Enter');
        assert((await page.locator('#story-status').innerText()).includes(first.steps.at(-1).state.caption),'Fullscreen retains readable state');
        await page.locator('#fullscreen').click();
        await page.waitForFunction(()=>!document.querySelector('.map-fullscreen').open);
        await page.locator('.map-object').first().focus();
        await page.keyboard.press('Enter');
        assert(await page.locator('.story-actor:not([hidden])').count()===0,'Entity selection cancels story');
      }
    }
    assert(errors.length===0,errors.join('; '));
    return 'Living stories: real intermediate motion, every settled destination/access state, direct jumps, cancellation, reduced-motion change, interior ordering and fullscreen status passed.';
  } finally {await context.close();}
}
