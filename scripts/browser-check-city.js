async function checkCity(browserPage) {
  const context=await browserPage.context().browser().newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage(),errors=[],report=[];
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto('http://127.0.0.1:8765/heat/');
    await page.locator('[data-scenario="hot-afternoon"]').click();
    await page.locator('[data-action="playback"]').click();
    const camera=await page.locator('#world').getAttribute('transform');
    const bounds=await page.locator('#city').boundingBox();
    const samples=await page.evaluate(async()=>{
      const sidebar=document.querySelector('.sidebar'),button=document.querySelector('#panel-hide');
      const start=sidebar.getBoundingClientRect().left,points=[];
      button.click();const began=performance.now();
      while(performance.now()-began<520){await new Promise(requestAnimationFrame);points.push([performance.now()-began,sidebar.getBoundingClientRect().left-start]);}
      return points;
    });
    const at=ms=>samples.reduce((a,b)=>Math.abs(b[0]-ms)<Math.abs(a[0]-ms)?b:a)[1];
    assert(at(225)>0 && at(225)<at(450)*.4,'Panel starts slowly and covers most distance in the second half');
    assert(await page.locator('.sidebar').evaluate(el=>el.inert && el.getBoundingClientRect().left>=innerWidth),'Hidden panel leaves the viewport and focus order');
    assert(await page.locator('#panel-show').evaluate(el=>el===document.activeElement),'Focus moves to the island');
    assert(JSON.stringify(await page.locator('#city').boundingBox())===JSON.stringify(bounds),'Hiding never resizes the canvas');
    assert(await page.locator('#world').getAttribute('transform')===camera,'Hiding never moves the camera');
    await page.locator('#panel-show').click();
    await page.waitForFunction(()=>document.querySelector('#panel-show').hidden);
    assert(await page.locator('#panel-hide').evaluate(el=>el===document.activeElement),'Expanding restores focus');
    await page.evaluate(async()=>{
      document.querySelector('#panel-hide').click();
      await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
      const b=document.querySelector('.sidebar').getBoundingClientRect().left;
      document.querySelector('#panel-show').click();
      const a=document.querySelector('.sidebar').getBoundingClientRect().left;
      if(Math.abs(a-b)>1)throw Error('Interrupted panel jumped');
    });
    await page.waitForFunction(()=>document.querySelector('#panel-show').hidden);

    await page.evaluate(()=>{document.querySelector('#panel-hide').click();document.querySelector('#panel-show').click();});
    await page.waitForFunction(()=>document.querySelector('#panel-show').hidden);
    await page.locator('[data-action="playback"]').click();
    await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>document.fullscreenElement?.id==='map-workspace');
    assert(await page.locator('#map-workspace .sidebar').isVisible(),'Fullscreen includes the real panel');
    assert(await page.locator('[data-action="playback"]').innerText()==='Pause story','Entering fullscreen preserves playback');
    await page.locator('[data-action="playback"]').click();
    await page.locator('#panel-hide').click();
    await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>!document.querySelector('.map-fullscreen').open);
    assert(await page.locator('.workspace').evaluate(el=>el.classList.contains('panel-hidden')),'Exit preserves hidden-panel state');
    await page.locator('#panel-show').click();
    await page.waitForFunction(()=>document.querySelector('#panel-show').hidden);

    const {issue}=await page.locator('#map-data').evaluate(el=>JSON.parse(el.textContent));
    for (const scenario of issue.scenarios) {
      await page.locator(`[data-scenario="${scenario.id}"]`).click();
      for (const [i,step] of scenario.steps.entries()) {
        if(i) await page.locator('[data-action="next"]').click();
        if(step.state.via) {
          const deviations=await page.evaluate(async({scenario,relation})=>{
            const actor=document.querySelector(`[data-actor="${scenario}"]`),line=document.querySelector(`.route[data-relation="${relation}"] .route-line`);
            const origin=document.querySelector('#city').dataset.origin.split(',').map(Number),out=[];
            for(let n=0;n<18;n++) {
              await new Promise(requestAnimationFrame);
              const foot=new DOMPoint(...origin).matrixTransform(actor.getScreenCTM());
              const numbers=line.getAttribute('d').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number),points=[];
              for(let j=0;j<numbers.length;j+=2)points.push(new DOMPoint(numbers[j],numbers[j+1]).matrixTransform(line.getScreenCTM()));
              let distance=Infinity;
              for(let j=1;j<points.length;j++) {
                const a=points[j-1],b=points[j],dx=b.x-a.x,dy=b.y-a.y;
                const t=Math.max(0,Math.min(1,((foot.x-a.x)*dx+(foot.y-a.y)*dy)/(dx*dx+dy*dy||1)));
                distance=Math.min(distance,Math.hypot(foot.x-a.x-t*dx,foot.y-a.y-t*dy));
              }
              out.push(distance);
            }
            return out;
          },{scenario:scenario.id,relation:step.state.via});
          assert(deviations.every(d=>d<=1),'Moving feet track the actually rendered route within one pixel');
        }
        await page.waitForFunction(id=>document.querySelector(`[data-actor="${id}"]`).dataset.phase==='settled',scenario.id);
      }
    }
    const profiles=await page.locator('[data-actor] [data-person-profile]').evaluateAll(nodes=>nodes.map(n=>n.dataset.personProfile));
    assert(profiles[0]===profiles[1],'Same resident has the same appearance in both stories');
    report.push('Shared route/foot alignment, stable cast, accelerating/reversible panel, native fullscreen and preserved state.');

    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:false}));
    await page.setViewportSize({width:390,height:844});
    await page.locator('#fullscreen').click();
    assert(await page.locator('.map-fullscreen .sidebar').isVisible(),'Mobile fallback includes the sheet');
    await page.locator('#panel-hide').click();
    assert(await page.locator('#panel-show').isVisible(),'Mobile leaves an expansion island');
    assert(await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().left>=innerWidth),'Reduced motion hides immediately');
    await page.locator('#panel-show').click();
    await page.locator('#city').focus();await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('.map-fullscreen').open);
    report.push('Mobile full-window fallback, panel focus and reduced motion.');

    for(const [path,count] of [['reading-day',5],['library-network',38]]) {
      await page.setViewportSize({width:1440,height:1000});
      const start=Date.now();await page.goto(`http://127.0.0.1:8765/${path}/`);
      const loadMs=Date.now()-start;
      assert(await page.locator('.map-object').count()===count,'All composed objects rendered');
      const overflow=await page.locator('#world').evaluate(el=>{
        const b=el.getBBox(),s=document.querySelector('#city').viewBox.baseVal;
        return b.x<0||b.y<0||b.x+b.width>s.width||b.y+b.height>s.height;
      });
      assert(!overflow,'Complete city geometry fits its viewBox');
      const genders=await page.locator('[data-person-profile]').evaluateAll(nodes=>[...new Set(nodes.map(n=>JSON.parse(n.dataset.personProfile).gender))]);
      assert(genders.length>1,'City has a varied cast');
      await page.locator('[data-scenario]').first().click();
      await page.locator('#panel-hide').click();
      for(let n=0;n<12 && await page.locator('#zoom-in').isEnabled();n++)await page.locator('#zoom-in').click();
      assert(parseInt(await page.locator('#zoom-value').innerText())>=(count>5?351:350),'Cities permit readable close-ups beyond the old limit when needed');
      const timings=await page.evaluate(async()=>{const out=[];let previous=performance.now();for(let i=0;i<30;i++){await new Promise(requestAnimationFrame);const now=performance.now();out.push(now-previous);previous=now;document.querySelector('#city').dispatchEvent(new KeyboardEvent('keydown',{key:i%2?'ArrowLeft':'ArrowRight',bubbles:true}));}return out.sort((a,b)=>a-b);});
      await page.locator('#fit').click();
      await page.setViewportSize({width:390,height:844});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Phone has no horizontal document overflow');
      report.push({path,objects:count,svgNodes:await page.locator('#city *').count(),loadMs,frameMedianMs:timings[15],frameP95Ms:timings[28]});
    }
    assert(errors.length===0,errors.join('; '));
    return report;
  } finally {await context.close();}
}
