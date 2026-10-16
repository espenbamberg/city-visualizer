// Run with the browser tool's filename option after building both previews.
async function checkNavigation(browserPage) {
  const context = await browserPage.context().browser().newContext({viewport:{width:1440,height:1100}});
  const page = await context.newPage();
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const errors = [];
  page.on('pageerror',e => errors.push(e.message));
  const settle = scale => page.waitForFunction(value => document.querySelector('#world').transform.baseVal.consolidate().matrix.a === value,scale);
  try {
    for (const path of ['', 'heat/']) {
      await page.goto(`http://127.0.0.1:8765/${path}`);
      await page.emulateMedia({reducedMotion:'no-preference'});
      const samples = await page.evaluate(async () => {
        const world = document.querySelector('#world');
        const value = () => world.transform.baseVal.consolidate().matrix.a;
        document.querySelector('#zoom-in').click();
        const values = [value()];
        for(let i=0;i<8;i++) { await new Promise(requestAnimationFrame); values.push(value()); }
        return values;
      });
      assert(samples[0] === 1 && samples.some(x => x>1 && x<1.25), 'Zoom has intermediate frames, not a jump');
      assert(samples.every((x,i) => i===0 || x>=samples[i-1]), 'Zoom eases without oscillating');
      await settle(1.25);
      // Repeated input accumulates, then reverses from the current rendered value.
      const reversal = await page.evaluate(async () => {
        const world = document.querySelector('#world');
        document.querySelector('#zoom-in').click();
        document.querySelector('#zoom-in').click();
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const before = world.getAttribute('transform');
        document.querySelector('#zoom-out').click();
        return before === world.getAttribute('transform');
      });
      assert(reversal, 'Retargeting must not jump to the previous target');
      await settle(1.5625);
      await page.locator('#fit').click();
      await settle(1);
      const anchor = await page.evaluate(async () => {
        const svg = document.querySelector('#city'), world = document.querySelector('#world');
        const screen = new DOMPoint(900,400).matrixTransform(svg.getScreenCTM());
        const wheel = new WheelEvent('wheel',{clientX:screen.x,clientY:screen.y,deltaY:-20,ctrlKey:true,cancelable:true,bubbles:true});
        const point = new DOMPoint(wheel.clientX,wheel.clientY).matrixTransform(svg.getScreenCTM().inverse());
        const content = point.matrixTransform(world.transform.baseVal.consolidate().matrix.inverse());
        svg.dispatchEvent(wheel);
        for(let i=0;i<4;i++) await new Promise(requestAnimationFrame);
        const m = world.transform.baseVal.consolidate().matrix;
        return {scale:m.a,dx:content.x*m.a+m.e-point.x,dy:content.y*m.d+m.f-point.y};
      });
      assert(anchor.scale>1 && anchor.scale<Math.exp(.05), 'Modified wheel zoom is eased');
      assert(Math.abs(anchor.dx)<.01 && Math.abs(anchor.dy)<.01, 'Wheel keeps its focal point stationary');
      // A drag can take over while a zoom is still settling.
      const box = await page.locator('#city').boundingBox();
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
      await page.mouse.down();
      const held = await page.locator('#world').getAttribute('transform');
      await page.evaluate(async () => { for(let i=0;i<5;i++) await new Promise(requestAnimationFrame); });
      assert(held === await page.locator('#world').getAttribute('transform'), 'Pointer-down stops at presentation state');
      await page.mouse.move(box.x+box.width/2+30,box.y+box.height/2+15);
      assert(held !== await page.locator('#world').getAttribute('transform'), 'Drag responds directly');
      await page.mouse.up();
      await page.emulateMedia({reducedMotion:'reduce'});
      const colors = await page.evaluate(() => {
        const strokes = () => [...document.querySelectorAll('.route-line')].map(el => getComputedStyle(el).stroke);
        const overview = strokes();
        const stories = [...document.querySelectorAll('[data-scenario]')].map(button => {
          button.click();
          const color = getComputedStyle(button.querySelector('.scenario-number')).backgroundColor;
          const lines = [...document.querySelectorAll('.route.is-active .route-line')];
          return {color,match:lines.length>0 && lines.every(el => getComputedStyle(el).stroke===color),
            arrow:getComputedStyle(document.querySelector('#arrow-story path')).stroke===color};
        });
        document.querySelector('[data-action="overview"]').click();
        return {stories,restored:JSON.stringify(strokes())===JSON.stringify(overview)};
      });
      assert(colors.stories.every(s => s.match && s.arrow),'Story numbers, highlighted routes and arrows share a color');
      assert(new Set(colors.stories.map(s => s.color)).size===colors.stories.length,'Example stories have distinct colors');
      assert(colors.restored,'Leaving a story restores relationship colors');
      assert(await page.locator('#fullscreen').evaluate(el => el.nextElementSibling.id==='fit' && el.parentElement.classList.contains('map-controls')),'Fullscreen sits immediately before Fit');
      assert(await page.locator('#map-instruction').innerText()==='Ctrl/⌘ to zoom','Zoom hint stays short after selecting a story');
      await page.locator('#fit').click();
      const immediate = await page.evaluate(() => {
        document.querySelector('#zoom-in').click();
        return document.querySelector('#world').transform.baseVal.consolidate().matrix.a;
      });
      assert(immediate === 1.25, 'Reduced motion changes zoom immediately');
      const units = await page.evaluate(() => [0,1,2].map(mode => {
        document.querySelector('#fit').click();
        const svg=document.querySelector('#city'), b=svg.getBoundingClientRect();
        const event=new WheelEvent('wheel',{clientX:b.x+b.width/2,clientY:b.y+b.height/2,deltaMode:mode,deltaY:mode===0 ? -16 : mode===1 ? -1 : -16/svg.clientHeight,metaKey:true,cancelable:true,bubbles:true});
        svg.dispatchEvent(event);
        return {scale:document.querySelector('#world').transform.baseVal.consolidate().matrix.a,prevented:event.defaultPrevented};
      }));
      assert(units.every(u => u.prevented && Math.abs(u.scale-Math.exp(.04))<.00001),'Wheel delta units normalize consistently');
      const y=await page.evaluate(()=>scrollY);
      const beforeScroll = await page.locator('#world').getAttribute('transform');
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
      await page.mouse.wheel(0,120);
      await page.waitForFunction(before=>scrollY>before,y);
      assert(await page.locator('#world').getAttribute('transform')===beforeScroll,'Ordinary wheel scrolls the document without zooming');
      await page.evaluate(()=>scrollTo(0,0));
      await page.locator('#fit').click();
      await page.locator('#zoom-in').click();

      const transform = await page.locator('#world').getAttribute('transform');
      await page.locator('#fullscreen').click();
      await page.waitForFunction(() => document.fullscreenElement?.id === 'map-workspace');
      assert(await page.locator('.map-fullscreen').evaluate(el => el.open), 'Native fullscreen contains a modal map');
      assert(await page.locator('#world').getAttribute('transform') === transform, 'Fullscreen preserves viewport');
      assert(await page.locator('#map-stage').evaluate(el => {
        const b=el.getBoundingClientRect(); return Math.abs(b.width-innerWidth)<2 && Math.abs(b.height-innerHeight)<2;
      }), 'Fullscreen fills the viewport');
      await page.locator('#zoom-in').click();
      assert(await page.locator('#zoom-value').innerText() === '156%', 'Controls work in fullscreen');
      await page.locator('#fullscreen').click();
      await page.waitForFunction(() => !document.fullscreenElement && !document.querySelector('.map-fullscreen').open);
      assert(await page.locator('#fullscreen').evaluate(el => el===document.activeElement), 'Exit restores focus');
      assert(await page.locator('.map-column #map-stage').count() === 1, 'Map returns to its original position');
      // Exiting through the browser must also restore the normal page.
      await page.locator('#fullscreen').click();
      await page.waitForFunction(() => !!document.fullscreenElement);
      await page.evaluate(() => document.exitFullscreen());
      await page.waitForFunction(() => !document.querySelector('.map-fullscreen').open);

      // Browsers without native element fullscreen still get a full-window view.
      await page.evaluate(() => Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:false}));
      await page.setViewportSize({width:390,height:844});
      await page.locator('#fullscreen').click();
      assert(await page.locator('.map-fullscreen').evaluate(el => el.open && !document.fullscreenElement), 'Viewport fallback');
      await page.keyboard.press('Tab');
      assert(await page.evaluate(() => document.querySelector('.map-fullscreen').contains(document.activeElement)), 'Focus stays within full-window map');
      assert(await page.locator('#map-stage').evaluate(el => {
        const b=el.getBoundingClientRect(); return Math.abs(b.width-innerWidth)<2 && Math.abs(b.height-innerHeight)<2;
      }), 'Mobile full-window bounds');
      await page.locator('#city').focus();
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.map-fullscreen').open);
      await page.waitForFunction(() => document.activeElement===document.querySelector('#fullscreen'));
      assert(await page.locator('#fullscreen').evaluate(el => el===document.activeElement), 'Escape restores focus');
      await page.setViewportSize({width:1440,height:1100});
    }
    assert(errors.length===0, errors.join('; '));
    return 'Both maps: eased/interruptible zoom, stable wheel anchor, direct drag, reduced motion, native fullscreen, browser exit, full-window mobile fallback and focus restoration.';
  } finally { await context.close(); }
}
