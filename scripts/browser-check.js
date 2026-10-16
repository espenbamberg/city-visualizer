// Run with the browser tool's filename option; it supplies the Playwright page.
async function check(browserPage) {
  const context = await browserPage.context().browser().newContext();
  const page = await context.newPage();
  const assert = (condition, message = 'Browser assertion failed') => { if (!condition) throw new Error(message); };
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  const report = [];
  try {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto('http://127.0.0.1:8765/');
    const { issue } = await page.locator('#map-data').evaluate(el => JSON.parse(el.textContent));
    assert(await page.locator('.route').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).display !== 'none' && Number(getComputedStyle(node).opacity) >= .75)), 'Every connection must be visible in the overview');
    assert(await page.locator('.route').count() === issue.relationships.length);
    assert(await page.locator('.map-label').count() === issue.entities.length);
    const labelProblems = await page.locator('.map-label').evaluateAll(labels => labels.flatMap(label => {
      const plate = label.querySelector('.label-bg').getBBox();
      const matrix = label.transform.baseVal.consolidate().matrix;
      const problems = [];
      if (!label.closest('.map-object') || Math.abs(matrix.b) < .01) problems.push(`${label.dataset.entity}: detached or unprojected`);
      for (const text of label.querySelectorAll('text')) {
        const b = text.getBBox();
        if (b.x < plate.x-1 || b.y < plate.y-1 || b.x+b.width > plate.x+plate.width+1 || b.y+b.height > plate.y+plate.height+1) problems.push(`${label.dataset.entity}: text outside plate`);
      }
      return problems;
    }));
    assert(labelProblems.length === 0, labelProblems.join('; '));
    // Hide the floating panel to expose every label, including in fullscreen.
    await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>document.fullscreenElement?.id==='map-workspace');
    await page.locator('#panel-hide').click();
    for (const entity of issue.entities) {
      await page.locator(`.map-label[data-entity="${entity.id}"]`).click();
      assert(await page.locator('#inspector h3').innerText() === entity.label, `Label selection: ${entity.id}`);
      assert(await page.locator(`.map-label[data-entity="${entity.id}"]`).evaluate(el => el.classList.contains('is-active')));
    }
    await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>!document.querySelector('.map-fullscreen').open);
    await page.locator('#panel-show').click();
    await page.waitForFunction(()=>document.querySelector('#panel-show').hidden);
    await page.locator('[data-action="overview"]').click();
    report.push('All 14 plane-integrated labels fit their plates and select/highlight the correct object.');
    for (const id of ['servers', 'database', 'gateway']) {
      await page.locator(`.map-object[data-entity="${id}"]`).focus();
      await page.keyboard.press('Enter');
      assert((await page.locator('#inspector').innerText()).includes('TECHNICAL COMPONENT'));
      const expected = issue.relationships.filter(r => r.from === id || r.to === id).map(r => r.id).sort();
      const active = await page.locator('.route.is-active').evaluateAll(nodes => nodes.map(node => node.dataset.relation).sort());
      assert(active.join(',') === expected.join(','), `Wrong technical connections: ${id}`);
    }
    await page.locator('[data-action="overview"]').click();
    report.push('All connections visible by default; server, database and gateway inspection highlights their modeled links.');
    for (const scenario of issue.scenarios) {
      await page.locator(`[data-scenario="${scenario.id}"]`).click();
      assert(await page.locator('[data-action="previous"]').isDisabled());
      for (let index = 0; index < scenario.steps.length; index++) {
        assert(await page.locator('#inspector h3').innerText() === scenario.steps[index].title, 'Wrong step text');
        const active = await page.locator('.route.is-active').evaluateAll(nodes => nodes.map(node => node.dataset.relation));
        assert(active.sort().join(',') === [...scenario.steps[index].relations].sort().join(','), 'Wrong highlighted relationships');
        if (index < scenario.steps.length - 1) await page.locator('[data-action="next"]').click();
      }
      assert(await page.locator('[data-action="next"]').isDisabled());
      assert(await page.locator('#inspector').innerText().then(text => text.includes(scenario.outcome)));
      await page.locator('[data-action="previous"]').click();
      assert(await page.locator('#inspector h3').innerText() === scenario.steps.at(-2).title);
      assert(await page.evaluate(() => document.activeElement.dataset.action) === 'previous', 'Step navigation lost focus');
    }
    report.push(`All ${issue.scenarios.reduce((n,s)=>n+s.steps.length,0)} scenario steps: text, highlights, boundaries, outcomes and keyboard-focus retention.`);

    await page.locator('[data-scenario="booking"]').click();
    const story = page.locator('[data-story="booking"]');
    assert(await story.isVisible());
    await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>document.fullscreenElement?.id==='map-workspace');
    await page.locator('#panel-hide').click();
    for (const index of [3,1,2,0]) {
      const marker = story.locator(`[data-step="${index}"]`);
      if (index % 2) await marker.click();
      else { await marker.focus(); await page.keyboard.press('Enter'); }
      const step = issue.scenarios.find(s=>s.id==='booking').steps[index];
      assert(await page.locator('#inspector h3').innerText() === step.title);
      assert(await marker.getAttribute('aria-pressed') === 'true');
      assert(await story.locator('.step-caption:visible').count() === 1);
      assert(await story.locator('[data-note-relation]:visible').getAttribute('data-note-relation') === step.relations[0]);
    }
    await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>!document.querySelector('.map-fullscreen').open);
    await page.locator('#panel-show').click();
    await page.waitForFunction(()=>document.querySelector('#panel-show').hidden);
    await page.locator('#show-routes').uncheck();
    assert(await story.locator('[data-note-relation]:visible').count() === 0);
    assert(await story.locator('[data-step]:visible').count() === 4);
    await page.locator('#show-routes').check();
    await page.locator('#show-labels').uncheck();
    assert(await story.locator('.step-caption:visible').count() === 0);
    await page.locator('#show-labels').check();
    await page.locator('[data-scenario="routine"]').click();
    assert(!await story.isVisible(), 'A different story must clear booking annotations');
    await page.locator('[data-scenario="booking"]').click();
    await story.locator('[data-step="0"]').focus();
    await page.keyboard.press('Escape');
    assert(!await story.isVisible());
    assert(await page.locator('#city').evaluate(el=>document.activeElement===el), 'Escape must move focus off a hidden marker');
    await page.locator('[data-scenario="booking"]').click();
    await page.locator('[data-action="overview"]').click();
    assert(!await story.isVisible(), 'Overview must clear annotations');
    report.push('Booking markers support pointer/keyboard jumps; one step caption and its exact connection note are shown, toggled and cleared together.');

    await page.locator('.map-object[data-entity="home"]').focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('#inspector h3').innerText() === 'Customer home');
    await page.locator('#tab-places').click();
    await page.locator('[data-select="inventory"]').click();
    assert(await page.locator('#inspector h3').innerText() === 'Inventory');
    await page.locator('.map-label[data-entity="workshop"]').click();
    assert(await page.locator('#inspector h3').innerText() === 'Repair workshop');
    await page.locator('#show-routes').uncheck();
    assert(await page.locator('#routes').evaluate(el => getComputedStyle(el).display) === 'none');
    assert(await page.locator('#inspector h3').innerText() === 'Repair workshop');
    await page.locator('#show-routes').check();
    await page.locator('#show-labels').uncheck();
    assert(await page.locator('.map-label,.ground-label').evaluateAll(nodes => nodes.every(el => getComputedStyle(el).display === 'none')));
    await page.locator('#show-labels').check();
    assert(await page.locator('.map-label,.ground-label').evaluateAll(nodes => nodes.every(el => getComputedStyle(el).display !== 'none')));
    report.push('Keyboard/map/list selection and layer toggles preserve explanation state.');

    await page.locator('#zoom-in').click();
    await page.waitForFunction(() => document.querySelector('#world').transform.baseVal.consolidate().matrix.a === 1.25);
    assert(await page.locator('#zoom-value').innerText() === '125%');
    const before = await page.locator('#world').getAttribute('transform');
    const rect = await page.locator('#city').boundingBox();
    await page.mouse.move(rect.x+rect.width*.45,rect.y+rect.height*.55);
    await page.mouse.down();
    await page.mouse.move(rect.x+rect.width*.45+70,rect.y+rect.height*.55+25,{steps:5});
    await page.mouse.up();
    assert(await page.locator('#world').getAttribute('transform') !== before);
    assert(await page.locator('#inspector h3').innerText() === 'Repair workshop','Dragging must not activate the object under the pointer');
    await page.locator('#fit').click();
    await page.waitForFunction(() => document.querySelector('#world').getAttribute('transform') === 'translate(0 0) scale(1)');
    assert(await page.locator('#world').getAttribute('transform') === 'translate(0 0) scale(1)');
    await page.locator('#city').focus();
    await page.keyboard.press('+');
    await page.waitForFunction(() => document.querySelector('#world').transform.baseVal.consolidate().matrix.a === 1.25);
    assert(await page.locator('#zoom-value').innerText() === '125%');
    await page.keyboard.press('0');
    await page.waitForFunction(() => document.querySelector('#world').getAttribute('transform') === 'translate(0 0) scale(1)');
    assert(await page.locator('#zoom-value').innerText() === '100%');
    await page.keyboard.press('Escape');
    assert(await page.locator('.route.is-active').count() === 0);
    report.push('Pointer pan, keyboard zoom, Fit and Escape; dragging does not trigger selection.');

    for (const width of [768,390]) {
      await page.setViewportSize({width,height:900});
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.locator('#tab-stories').click();
      await page.locator('[data-scenario="missing"]').click();
      await page.locator('[data-action="next"]').click();
      assert(await page.locator('#inspector h3').innerText() === 'The repair becomes a waiting job');
      assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),`Horizontal overflow at ${width}`);
      assert(await page.evaluate(() => {
        const map = document.querySelector('#map-stage').getBoundingClientRect();
        const column = document.querySelector('.map-column').getBoundingClientRect();
        const workspace = document.querySelector('.workspace');
        return map.width <= column.width + 1 && workspace.scrollWidth <= workspace.clientWidth + 1;
      }), `Map is clipped or creates hidden internal overflow at ${width}`);
      await page.locator('[data-scenario="booking"]').click();
      await page.locator('#sheet-toggle').click();
      await page.locator('[data-story="booking"] [data-step="3"]').click();
      assert(await page.locator('#inspector h3').innerText() === 'Store the booking');
    }
    report.push('768 px and 390 px layouts and reduced-motion interaction.');
    assert(errors.length === 0,`JavaScript exceptions: ${errors.join('; ')}`);
    return report;
  } finally {
    page.off('pageerror',onError);
    await context.close();
  }
}
