// Virtual time verifies autoplay without waiting for real-world reading pauses.
async function checkPlayback(browserPage) {
  const context = await browserPage.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page = await context.newPage(), errors = [];
  const assert = (ok,message) => { if (!ok) throw Error(message); };
  page.on('pageerror',error => errors.push(error.message));
  const click = selector => page.locator(selector).evaluate(el => el.click());
  const title = () => page.locator('#inspector h3').innerText();
  const playback = () => page.locator('[data-action="playback"]').innerText();
  await page.clock.install({time:new Date('2026-10-12T18:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-12T18:00:01Z'));
  try {
    for (const path of ['', 'heat/']) {
      await page.goto(`http://127.0.0.1:8765/${path}`);
      await page.clock.runFor(50);
      const {issue} = await page.locator('#map-data').evaluate(el => JSON.parse(el.textContent));
      for (const scenario of issue.scenarios) {
        await click(`[data-scenario="${scenario.id}"]`);
        assert(await playback()==='Pause story','Selecting any story starts autoplay');
        for (const step of scenario.steps) {
          assert(await title()===step.title,`Automatic sequence reaches ${step.title}`);
          await page.clock.runFor(2999);
          assert(await title()===step.title,'Each step has a readable minimum dwell');
          for (let seconds=0; seconds<90 && await title()===step.title && await playback()==='Pause story'; seconds++) await page.clock.runFor(1000);
        }
        assert(await playback()==='Replay story','Playback stops at the outcome');
        await page.clock.runFor(60000);
        assert(await title()===scenario.steps.at(-1).title,'Completed story never loops');
        await click(`[data-scenario="${scenario.id}"]`);
        assert(await title()===scenario.steps[0].title && await playback()==='Pause story','Reselecting restarts the same story');
        await click('[data-action="playback"]');
        await page.clock.runFor(60000);
        assert(await title()===scenario.steps[0].title,'Pause cancels the pending advance');
        await click('[data-action="playback"]');
        await click('[data-action="next"]');
        const manual = await title();
        await page.clock.runFor(60000);
        assert(await title()===manual && await playback()!=='Pause story','Manual navigation takes over');
      }
      await click(`[data-scenario="${issue.scenarios[0].id}"]`);
      if (path==='') {
        await click(`[data-scenario="${issue.scenarios.find(s=>!s.actor).id}"]`);
        assert(await page.locator('.story-actor:not([hidden])').count()===0,'Switching to a non-animated story clears the prior actor');
      }
      await click('[data-action="overview"]');
      await page.clock.runFor(60000);
      assert(await page.locator('#inspector h3').count()===0,'Overview cancels pending playback');
    }

    await page.emulateMedia({reducedMotion:'no-preference'});
    await click('[data-scenario="hot-afternoon"]');
    const actor = page.locator('[data-actor="hot-afternoon"]');
    await page.clock.runFor(400);
    await click('[data-action="playback"]');
    const paused = await actor.getAttribute('data-position');
    await page.clock.runFor(20000);
    assert(await actor.getAttribute('data-position')===paused,'Pause freezes movement as well as step progression');
    await click('[data-action="playback"]');
    await page.clock.runFor(100);
    assert(await actor.getAttribute('data-position')!==paused,'Resume continues movement');
    await page.clock.runFor(3300);
    assert(await actor.getAttribute('data-phase')==='settled','Actor arrives before the reading pause');
    assert(await title()==='Walk to school','No early step advance during travel');
    await click('[data-scenario="hot-afternoon"]');
    assert(await actor.getAttribute('data-phase')==='moving','Reselecting step zero replays its journey');
    await click('[data-scenario="closed-door"]');
    await page.clock.runFor(4000);
    assert(await page.locator('[data-actor="hot-afternoon"]').getAttribute('hidden')!==null,'Switching cancels the previous actor');
    assert(await page.locator('.entrance-closed').isVisible(),'Closed-room state survives autoplay');
    await page.evaluate(() => document.querySelector('#text-view').scrollIntoView());
    await page.waitForFunction(() => document.querySelector('[data-action="playback"]').textContent!=='Pause story');
    const offscreen = await title();
    await page.clock.runFor(60000);
    await page.evaluate(() => scrollTo(0,0));
    await page.clock.runFor(1000);
    assert(await title()===offscreen && await playback()!=='Pause story','Leaving the map pauses without replay on return');

    await page.setViewportSize({width:390,height:844});
    await page.emulateMedia({reducedMotion:'reduce'});
    await click('[data-scenario="hot-afternoon"]');
    await click('#sheet-toggle');
    await page.clock.runFor(20000);
    assert(await title()!=='Walk to school','Autoplay continues behind a collapsed mobile sheet');
    assert(await page.locator('.workspace').evaluate(el=>el.classList.contains('sheet-collapsed')),'Automatic steps preserve the collapsed sheet');
    assert(errors.length===0,errors.join('; '));
    return 'All six stories autoplay once; reading pauses, restart, pause/resume, manual takeover, actor travel, story switching, offscreen cancellation, reduced motion and mobile sheet passed.';
  } finally { await context.close(); }
}
