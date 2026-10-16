async function checkV3(browserPage) {
  const context=await browserPage.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],report=[];
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  page.on('pageerror',e=>errors.push(e.message));
  const shape=()=>page.locator('.map-object').evaluateAll(nodes=>nodes.map(n=>[n.dataset.entity,...Array.from(n.querySelectorAll('.face'),p=>p.getAttribute('d'))]));
  const open=async id=>{await page.locator(`.map-object[data-entity="${id}"]`).focus();await page.keyboard.press('Enter');};
  try {
    for(const [preview,count] of [['v3',8],['v3-scale',33]]) {
      await page.setViewportSize({width:1440,height:1000});
      const began=Date.now();await page.goto(`http://127.0.0.1:8765/${preview}/`);const loadMs=Date.now()-began;
      assert(await page.locator('.map-object').count()===count,'Every mixed-size object renders');
      assert(await page.locator('#world').evaluate(el=>{
        const b=el.getBBox(),v=document.querySelector('#city').viewBox.baseVal;
        return b.x>=0 && b.y>=0 && b.x+b.width<=v.width && b.y+b.height<=v.height;
      }),'The mixed-size landscape fits its canvas');
      const original=JSON.stringify(await shape());
      await page.locator('[data-scenario="visit"]').click();
      assert(JSON.stringify(await shape())===original,'Selecting a story leaves all physical geometry stable');
      await open('workshop');
      const local=JSON.stringify(await shape());
      const dimensions=await page.locator('#view-data').evaluate(el=>{
        const {scene}=JSON.parse(el.textContent).views.workshop;
        return Object.fromEntries(scene.instances.map(a=>[a.entity,a.w*a.d]));
      });
      assert(dimensions.diagnosis>dimensions.intake*4 && dimensions.diagnosis>dimensions.parts*4,'Diagnosis visibly owns more working area');
      await open('diagnosis');await page.locator('[data-back]').click();
      assert(JSON.stringify(await shape())===local,'Returning from a deeper level preserves the local sizes');
      await page.locator('[data-back]').click();
      assert(JSON.stringify(await shape())===original,'Returning to the city preserves every object size');
      const nodeCount=await page.locator('#city *').count();
      for(let i=0;i<4;i++){await open('booking');await open('validate');await page.locator('.city-home').click();}
      assert(await page.locator('#city *').count()===nodeCount,'Navigation does not accumulate SVG nodes');
      await page.locator('#panel-hide').click();
      const timings=await page.evaluate(async()=>{
        const samples=[];let before=performance.now();
        for(let i=0;i<30;i++) {
          await new Promise(requestAnimationFrame);const now=performance.now();samples.push(now-before);before=now;
          document.querySelector('#city').dispatchEvent(new KeyboardEvent('keydown',{key:i%2?'ArrowLeft':'ArrowRight',bubbles:true}));
        }
        return samples.sort((a,b)=>a-b);
      });
      await page.setViewportSize({width:390,height:844});await page.locator('#fit').click();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Phone layout has no horizontal overflow');
      if(preview==='v3') {
        const target=await page.locator('.map-object[data-entity="booking"] .object-hit').evaluate(el=>{
          const p=el.getPointAtLength(0),center=new DOMPoint(p.x,p.y).matrixTransform(el.getScreenCTM());
          return {x:center.x,y:center.y,stroke:getComputedStyle(el).strokeWidth,effect:getComputedStyle(el).vectorEffect};
        });
        assert(target.stroke==='44px' && target.effect==='non-scaling-stroke','Compact objects retain a screen-space target');
        await page.mouse.click(target.x,target.y);
        assert(await page.locator('.workspace').getAttribute('data-view')==='booking','A compact object opens by pointer on a phone-size map');
        await page.locator('#panel-show').click();await page.locator('#tab-places').click();
        await page.locator('[data-select="validate"]').click();
        assert(await page.locator('.workspace').getAttribute('data-view')==='validation','The object list reaches a deeper main process');
      }
      report.push({preview,objects:count,svgNodes:nodeCount,loadMs,panMedianMs:timings[15],panP95Ms:timings[28]});
    }
    assert(!errors.length,errors.join('; '));
    return ['Mixed sizes, stable geometry, complete framing, exact return, compact pointer target and object-list access.',...report];
  } finally {await context.close();}
}
