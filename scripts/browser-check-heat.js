// Run with the browser tool's filename option after building preview/heat.
async function checkHeat(browserPage) {
  const context = await browserPage.context().browser().newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('http://127.0.0.1:8765/heat/');
    const { issue } = await page.locator('#map-data').evaluate(el => JSON.parse(el.textContent));
    assert(await page.locator('.map-object').count() === 5, 'Five semantic places');
    assert(await page.locator('.route').count() === 9, 'Nine relationships');
    assert(!/technical|services/i.test(await page.locator('.map-corner').innerText()), 'No empty IT categories');
    assert((await page.locator('.legend').innerText()).includes('Environmental influence'), 'Environmental legend');
    assert(await page.locator('.route.influence .route-line').evaluate(el => getComputedStyle(el).strokeDasharray !== 'none'), 'Influence has a non-color line cue');
    assert(await page.locator('.route').evaluateAll(nodes => nodes.every(el => getComputedStyle(el).display !== 'none')), 'Overview shows every connection');
    await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>document.fullscreenElement?.id==='map-workspace');
    await page.locator('#panel-hide').click();
    for (const entity of issue.entities) {
      await page.locator(`.map-label[data-entity="${entity.id}"]`).click();
      assert(await page.locator('#inspector h3').innerText() === entity.label, `Select ${entity.id}`);
      assert(!/Evidence:|fictional|source fixture/i.test(await page.locator('#inspector').innerText()), 'Object explanation has no status boilerplate');
    }
    await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>!document.querySelector('.map-fullscreen').open);
    await page.locator('#panel-show').click();
    await page.waitForFunction(()=>document.querySelector('#panel-show').hidden);
    await page.locator('.map-object[data-entity="square"]').focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('.connection-evidence').count()===0, 'No connection evidence footer in inspector');
    assert(!/fictional|Evidence:|Issue status:/i.test(await page.locator('#text-view').textContent()), 'Full text has no status boilerplate');
    assert((await page.locator('.source-note').innerText()).includes('US EPA'), 'Readable source list remains available');

    const layoutIssues = [];
    for (const scenario of issue.scenarios) {
      await page.locator(`[data-scenario="${scenario.id}"]`).click();
      const story = page.locator(`[data-story="${scenario.id}"]`);
      assert(await page.locator('.story-layout:visible').count() === 1, 'Only the chosen scenario has markers');
      assert(await page.locator('[data-action="previous"]').isDisabled(), 'First step boundary');
      for (const [index, step] of scenario.steps.entries()) {
        assert(await page.locator('#inspector h3').innerText() === step.title, 'Step explanation');
        const active = await page.locator('.route.is-active').evaluateAll(nodes => nodes.map(n => n.dataset.relation).sort());
        assert(active.join(',') === [...step.relations].sort().join(','), 'Exact step connections');
        assert(await story.locator(`[data-step="${index}"]`).getAttribute('aria-pressed') === 'true', 'Current marker');
        const notes = await story.locator('[data-note-relation]:visible').evaluateAll(nodes => nodes.map(n => n.dataset.noteRelation));
        assert(notes.every(id => step.relations.includes(id)), 'Notes describe current relationships');
        layoutIssues.push(...await story.locator('.story-step.is-current').evaluate(el => {
          const b = el.getBBox(), v = el.ownerSVGElement.viewBox.baseVal;
          const caption = el.querySelector('.step-caption').getBoundingClientRect();
          const errors = [];
          if (b.x < 0 || b.y < 0 || b.x+b.width > v.width || b.y+b.height > v.height) errors.push('Annotation outside viewport');
          for (const note of el.querySelectorAll('.connection-note text')) {
            const n = note.getBoundingClientRect();
            if (caption.left < n.right && caption.right > n.left && caption.top < n.bottom && caption.bottom > n.top) errors.push('Caption overlaps connection note');
          }
          return errors;
        }));
        if (index < scenario.steps.length-1) await page.locator('[data-action="next"]').click();
      }
      assert(await page.locator('[data-action="next"]').isDisabled(), 'Last step boundary');
      assert((await page.locator('#inspector').innerText()).includes(scenario.outcome), 'Scenario outcome');
      await story.locator('[data-step="0"]').focus();
      await page.keyboard.press(' ');
      assert(await page.locator('#inspector h3').innerText() === scenario.steps[0].title, 'Keyboard step jump');
    }
    assert(layoutIssues.length === 0, layoutIssues.join('; '));
    await page.locator('#show-routes').uncheck();
    assert(await page.locator('[data-note-relation]:visible').count() === 0, 'Connection notes hidden with routes');
    await page.locator('#show-routes').check();
    await page.locator('#show-labels').uncheck();
    assert(await page.locator('.map-label:visible,.step-caption:visible').count() === 0, 'Labels toggle');
    await page.locator('#show-labels').check();
    await page.locator('.step-marker:visible').first().focus();
    await page.keyboard.press('Escape');
    assert(await page.locator('.story-layout:visible').count() === 0, 'Escape clears annotations');
    assert(await page.locator('#city').evaluate(el => el === document.activeElement), 'Escape focus');
    await page.keyboard.press('+');
    await page.waitForFunction(() => document.querySelector('#world').transform.baseVal.consolidate().matrix.a === 1.25);
    assert(await page.locator('#zoom-value').innerText() === '125%', 'Keyboard zoom');
    await page.locator('#fit').click();
    await page.waitForFunction(() => document.querySelector('#world').getAttribute('transform') === 'translate(0 0) scale(1)');
    assert(await page.locator('#zoom-value').innerText() === '100%', 'Fit');

    for (const width of [768,390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('[data-scenario="closed-door"]').click();
      await page.locator('#sheet-toggle').click();
      await page.locator('[data-story="closed-door"] [data-step="1"]').click();
      assert(await page.locator('#inspector h3').innerText() === 'The room is closed', 'Mobile marker');
      assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `Page overflow at ${width}`);
      assert(await page.locator('.workspace').evaluate(el => el.scrollWidth <= el.clientWidth+1), `Workspace overflow at ${width}`);
      assert(await page.locator('.source-note').evaluate(el => el.scrollWidth <= el.clientWidth+1), `Source URL overflow at ${width}`);
    }
    assert(errors.length === 0, errors.join('; '));
    await page.goto('http://127.0.0.1:8765/heat/assets.html');
    const clipped = await page.locator('.asset-grid svg').evaluateAll(nodes => nodes.flatMap((el,i) => {
      const b = el.getBBox(), v = el.viewBox.baseVal;
      return b.x < 0 || b.y < 0 || b.x+b.width > v.width || b.y+b.height > v.height ? [i] : [];
    }));
    assert(clipped.length === 0, `Clipped component panels: ${clipped}`);
    return ['Five places and nine visible relationships; direct explanations and readable sources.', 'Both scenarios: all seven steps, markers, notes, outcomes, keyboard, visibility toggles and focus.', 'Annotation bounds/overlaps, component bounds, and 768/390 px layouts including source URLs.'];
  } finally {
    await context.close();
  }
}
