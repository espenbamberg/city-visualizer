// Run through Playwright's filename option with both preview builds on port 8765.
async function checkEntrance(browserPage) {
  const browser=browserPage.context().browser();
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  const snapshot=()=>page.evaluate(()=>{
    const w=document.querySelector('.workspace'), s=document.querySelector('.sidebar');
    const b=w.getBoundingClientRect(), brand=document.querySelector('.brand').getBoundingClientRect();
    const canvas=document.querySelector('#city').getBoundingClientRect();
    const part=document.querySelector('.rise-part');
    return {intro:w.dataset.intro,opacity:Number(getComputedStyle(s).opacity),inert:s.inert,
      panel:getComputedStyle(s).transform,part:part.transform.baseVal.consolidate()?.matrix.f ?? 0,
      clips:document.querySelectorAll('.rise-slot[clip-path]').length,
      fullscreen:!!document.fullscreenElement,width:b.width,height:b.height,
      viewport:[innerWidth,innerHeight],brand:[brand.x,brand.y],scroll:scrollY,
      canvas:[canvas.x,canvas.y,canvas.width,canvas.height],
      world:document.querySelector('#world').getAttribute('transform')};
  });
  await page.clock.install({time:new Date('2026-10-12T17:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-12T17:00:01Z'));
  try {
    for(const path of ['','heat/']) {
      await page.goto(`http://127.0.0.1:8765/${path}`);
      const initial=await snapshot();
      assert(initial.intro==='rising' && initial.clips>0 && initial.part>0,'Objects begin below their ground masks');
      assert(initial.opacity===0 && initial.inert,'Delayed panel is not focusable');
      assert(initial.width===1440 && initial.height===1000 && !initial.fullscreen,'The opening fills the browser window without invoking native fullscreen');
      assert(initial.canvas.join(',')==='0,0,1440,1000','The drawing viewport reaches every browser edge');
      assert(await page.locator('.scroll-cue').evaluate(el=>el.getBoundingClientRect().top>=innerHeight),'Read link starts below the opening');
      assert(initial.brand[0]<40 && initial.brand[1]<40,'Brand sits at the upper left');
      await page.clock.runFor(900);
      const middle=await snapshot();
      assert(middle.part>0 && middle.part<initial.part,'Buildings rise through real intermediate positions');
      await page.clock.runFor(1090);
      assert((await snapshot()).opacity===0,'Panel stays hidden until two seconds');
      await page.clock.runFor(310);
      const entering=await snapshot();
      assert(entering.opacity>0 && entering.opacity<1 && !entering.inert,'Panel eases into view after two seconds');
      await page.clock.runFor(400);
      const done=await snapshot();
      assert(done.intro==='ready' && done.clips===0 && done.part===0 && done.opacity===1,'The final artwork and panel are exact, with no residual clipping');
      assert(done.world===initial.world,'Entrance does not modify the user camera');
      assert(done.canvas.join(',')===initial.canvas.join(','),'Arriving sidebar does not shift or resize the map');
      assert(await page.evaluate(()=>{
        const s=document.querySelector('.sidebar'), b=s.getBoundingClientRect();
        return b.right<innerWidth && s.contains(document.elementFromPoint(b.x+b.width/2,b.y+100))
          && document.querySelector('#city').contains(document.elementFromPoint(innerWidth-5,innerHeight/2));
      }),'Sidebar floats above the map with an interactive map strip to its right');
      await page.locator('.scroll-cue').click();
      assert((await snapshot()).scroll>500,'Read cue leads into the document');
      await page.evaluate(()=>scrollTo(0,0));await page.clock.runFor(100);
      assert((await snapshot()).intro==='ready','Returning to the map does not replay the introduction');

      await page.goto(`http://127.0.0.1:8765/${path}`);
      await page.locator('#zoom-in').click();
      assert((await snapshot()).intro==='ready','Controls interrupt the introduction immediately');
      await page.clock.runFor(1500);
      assert(await page.locator('#zoom-value').innerText()==='125%','The requested input still takes effect');

      await page.emulateMedia({reducedMotion:'reduce'});
      await page.reload();
      assert((await snapshot()).intro==='ready' && (await snapshot()).opacity===1,'Reduced motion skips the introduction and the delay');
      for(const width of [768,390,320]) {
        await page.setViewportSize({width,height:844});
        await page.locator('#sheet-toggle').click();
        assert(await page.locator('#sidebar-content').isHidden(),'Mobile sheet collapses');
        assert(await page.locator('#sheet-toggle').getAttribute('aria-expanded')==='false','Collapsed state is announced');
        await page.locator('#sheet-toggle').click();
        await page.locator('#tab-places').click();
        await page.locator('[data-select]').first().click();
        const visible=await page.locator('#inspector h3').evaluate(el=>{const b=el.getBoundingClientRect();return b.top>0 && b.bottom<innerHeight;});
        assert(visible,'Selected explanation is visible in the bottom sheet');
        await page.keyboard.press('Escape');
        assert(await page.locator('#sheet-toggle').evaluate(el=>el===document.activeElement),'Closing the sheet restores focus');
        await page.locator('#sheet-toggle').click();
        await page.locator('#tab-stories').click();
        assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'No horizontal document overflow');
        const b=await snapshot();assert(b.height===844 && b.width===width,'Mobile opening fills the window');
        assert(b.canvas.join(',')===`0,0,${width},844`,'Mobile sheet overlays a full-window canvas');
      }
      await page.setViewportSize({width:1440,height:1000});
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.goto(`http://127.0.0.1:8765/${path}`);
      await page.clock.runFor(600);
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.clock.runFor(32);
      assert((await snapshot()).intro==='ready','Changing reduced motion during the rise settles all parts');
      await page.emulateMedia({reducedMotion:'no-preference'});
    }
    assert(!errors.length,errors.join('; '));
  } finally {await context.close();}
  const staticContext=await browser.newContext({javaScriptEnabled:false});
  try {
    const p=await staticContext.newPage();
    await p.goto('http://127.0.0.1:8765/heat/');
    assert(await p.locator('.map-object').first().isVisible(),'Static map survives without JavaScript');
    assert(await p.locator('#text-view').innerText().then(t=>t.includes('Starting condition.')),'Complete text explanation survives without JavaScript');
  } finally {await staticContext.close();}
  const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  try {
    const p=await touchContext.newPage();
    await p.goto('http://127.0.0.1:8765/heat/');
    await touchContext.setOffline(true);
    const client=await touchContext.newCDPSession(p);
    const send=(type,touchPoints)=>client.send('Input.dispatchTouchEvent',{type,touchPoints});
    const before=await p.locator('#world').getAttribute('transform');
    await send('touchStart',[{id:1,x:180,y:340}]);
    for(const y of [310,270,230,190]) {await send('touchMove',[{id:1,x:180,y}]);await p.waitForTimeout(25);}
    // End with a stationary finger so native fling momentum does not race scrollTo.
    await p.waitForTimeout(200);
    await send('touchEnd',[]);
    await p.waitForFunction(()=>scrollY>40);
    assert(await p.locator('#world').getAttribute('transform')===before,'A one-finger vertical swipe reads the page, without panning the map');
    await p.evaluate(()=>scrollTo(0,0));
    await p.waitForTimeout(100);
    await send('touchStart',[{id:1,x:145,y:250},{id:2,x:225,y:250}]);
    await send('touchMove',[{id:1,x:105,y:250},{id:2,x:265,y:250}]);
    await send('touchEnd',[]);
    assert(await p.locator('#zoom-value').innerText()==='200%','Two-finger pinch still zooms the map');
    await p.locator('#fit').tap();
    await p.locator('#sheet-toggle').tap();
    assert(await p.locator('#sidebar-content').isHidden(),'Touch collapses the bottom sheet');
    await p.locator('#sheet-toggle').tap();
    await p.locator('[data-scenario="closed-door"]').tap();
    assert(await p.locator('#inspector h3').innerText()==='Follow the old notice','Touch selects a story while offline');
    assert(await p.evaluate(()=>scrollY)===0,'Panel interaction keeps the map in view');
  } finally {await touchContext.close();}
  return 'Both maps: full-window load, staggered ground-masked rise, 2-second panel delay, exact end state, interruption, reduced motion, no replay, mobile sheet/focus, narrow layouts and no-JS text. Offline emulated touch: swipe-to-read, pinch-to-200%, sheet toggle and story selection passed.';
}
