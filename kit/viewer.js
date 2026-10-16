(() => {
  'use strict';
  let { issue, scene } = JSON.parse(document.getElementById('map-data').textContent);
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const bundle = $('#view-data') ? JSON.parse($('#view-data').textContent) : null;
  let viewId=bundle?.root, navigation=null;
  const history=[];
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
  const svg = $('#city'), stage = $('#map-stage'), inspector = $('#inspector');
  let world = $('#world');
  let detailObjects=[...world.querySelectorAll('[data-lod-width]')];
  let entityById = new Map(issue.entities.map(e => [e.id,e]));
  let relationById = new Map(issue.relationships.map(r => [r.id,r]));
  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('role','status');
  stage.append(live);
  let scenarioId = null, stepIndex = 0, entityId = null;
  let autoPlaying = false, playbackTimer = 0, storyPaused = false;
  let scale = 1, panX = 0, panY = 0;
  let target = { scale, x: panX, y: panY }, frame = 0, lastFrame = 0;
  const velocity = { scale: 0, x: 0, y: 0 };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let zoomMoving = false, storyAnimation = null, storyKey = null, visible = true;
  let actors = $$('[data-actor]'), interiors = $$('[data-interior]');
  let axes = JSON.parse(svg.dataset.axes);
  const storyStatus = document.createElement('p');
  storyStatus.id = 'story-status';
  storyStatus.hidden = true;
  stage.append(storyStatus);
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const maxScale = () => Math.max(3.5,2/(Number(svg.dataset.projectionScale)*Math.min(svg.clientWidth/scene.width,svg.clientHeight/scene.height)));
  const workspace = $('.workspace'), sidebar = $('.sidebar'), sidebarContent = $('#sidebar-content');
  const sheetToggle = $('#sheet-toggle'), mobile = matchMedia('(max-width: 800px)');
  let riseItems = $$('.rise-slot').map(el => ({el,part:el.firstElementChild,distance:Number(el.dataset.rise),delay:Number(el.dataset.riseDelay)}));
  let intro = null, sheetOpen = true, panelHidden = false;
  const panelShow = $('#panel-show'), panelHide = $('#panel-hide');
  function finishPanel() {
    if (!panelHidden) {
      if (document.activeElement===panelShow) (sidebarContent.hidden ? sheetToggle : panelHide).focus({preventScroll:true});
      panelShow.hidden = true;
    }
  }
  function setPanel(hidden) {
    finishIntro();
    panelHidden = hidden;
    workspace.classList.toggle('panel-hidden',hidden);
    sidebar.inert = hidden;
    sidebar.setAttribute('aria-hidden',String(hidden));
    panelShow.hidden = false;
    panelShow.setAttribute('aria-expanded',String(!hidden));
    panelShow.setAttribute('aria-label',hidden ? 'Show panel' : 'Hide panel');
    panelShow.firstElementChild.textContent = hidden ? '<<' : '>>';
    panelHide.setAttribute('aria-expanded',String(!hidden));
    if (hidden) panelShow.focus({preventScroll:true});
    if (reducedMotion.matches) finishPanel();
    else requestAnimationFrame(()=>{ if(!panelHidden && !sidebar.getAnimations().some(a=>a.transitionProperty==='translate')) finishPanel(); });
  }
  panelHide.addEventListener('click',()=>setPanel(true));
  panelShow.addEventListener('click',()=>setPanel(!panelHidden));
  sidebar.addEventListener('transitionend',event=>{ if(event.propertyName==='translate') finishPanel(); });

  function setSheet(open) {
    sheetOpen = open;
    workspace.classList.toggle('sheet-collapsed',mobile.matches && !open);
    sidebarContent.hidden = mobile.matches && !open;
    sheetToggle.setAttribute('aria-expanded',String(!sidebarContent.hidden));
  }
  sheetToggle.addEventListener('click',() => setSheet(!sheetOpen));
  sidebar.addEventListener('keydown',event => {
    if (event.key==='Escape' && mobile.matches && sheetOpen) {
      if (bundle && (history.length || navigation || fullscreenDialog.open)) return;
      event.preventDefault(); setSheet(false); sheetToggle.focus({preventScroll:true});
    }
  });
  mobile.addEventListener('change',() => setSheet(sheetOpen));

  function finishIntro() {
    if (!intro) return;
    intro = null;
    for (const {el,part} of riseItems) { el.removeAttribute('clip-path'); part.removeAttribute('transform'); }
    $('#ground').removeAttribute('transform');
    $('#ground').style.removeProperty('opacity');
    $('#routes').style.removeProperty('opacity');
    $('#walking-routes').style.removeProperty('opacity');
    workspace.style.removeProperty('--panel-progress');
    workspace.style.removeProperty('--detail-progress');
    workspace.classList.remove('intro-active');
    sidebar.inert = false;
    workspace.dataset.intro = 'ready';
  }
  function animateIntro(now) {
    if (reducedMotion.matches) { finishIntro(); return; }
    const elapsed = Math.max(0,now-intro.started), progress = cityMotion.entranceProgress;
    for (const {el,part,distance,delay} of riseItems) {
      const amount = progress(elapsed,delay,1250);
      if (amount===1) { el.removeAttribute('clip-path'); part.removeAttribute('transform'); }
      else part.setAttribute('transform',`translate(0 ${distance*(1-amount)})`);
    }
    const base = progress(elapsed,0,420);
    $('#ground').setAttribute('transform',`translate(0 ${12*(1-base)})`);
    $('#ground').style.opacity = String(base);
    $('#routes').style.opacity = String(progress(elapsed,1450,500));
    $('#walking-routes').style.opacity = String(progress(elapsed,1450,500));
    workspace.style.setProperty('--detail-progress',progress(elapsed,1750,250));
    workspace.style.setProperty('--panel-progress',progress(elapsed,2000,600));
    if (elapsed>=2000) sidebar.inert = false;
    if (elapsed>=2600) finishIntro();
  }
  function startIntro() {
    clearTimeout(window.cityIntroFallback);
    const play = document.documentElement.classList.contains('intro-pending') && !reducedMotion.matches && !document.hidden && scrollY<10;
    if (play) {
      intro = {started:performance.now()};
      workspace.classList.add('intro-active');
      workspace.dataset.intro = 'rising';
      sidebar.inert = true;
      for (const {el} of riseItems) el.setAttribute('clip-path',el.dataset.riseClip);
      animateIntro(intro.started);
      runMotion();
    } else workspace.dataset.intro = 'ready';
    document.documentElement.classList.remove('intro-pending');
  }
  // The introduction never makes the reader wait for a control or a scroll.
  for (const type of ['pointerdown','keydown','wheel','focusin']) document.addEventListener(type,finishIntro,{capture:true,passive:true});
  window.addEventListener('scroll',finishIntro,{passive:true});

  function renderSelection() {
    const focusedAction = inspector.contains(document.activeElement) ? document.activeElement.dataset.action : null;
    const scenario = issue.scenarios.find(s => s.id === scenarioId);
    const storyButton = $$('[data-scenario]').find(el => el.dataset.scenario === scenarioId);
    stage.classList.toggle('has-story',Boolean(scenario));
    if (storyButton) stage.style.setProperty('--story-color',storyButton.style.getPropertyValue('--story-color'));
    else stage.style.removeProperty('--story-color');
    const step = scenario?.steps[stepIndex];
    const selected = entityById.get(entityId);
    const relations = selected ? issue.relationships.filter(r => r.from === entityId || r.to === entityId).map(r => r.id) : step?.relations ?? [];
    const relatedEntities = new Set(relations.flatMap(id => { const r = relationById.get(id); return [r.from,r.to]; }));
    if (selected) relatedEntities.add(selected.id);
    stage.classList.toggle('has-selection', Boolean(scenario || selected));
    $$('[data-entity]').forEach(el => {
      const active = relatedEntities.has(el.dataset.entity);
      el.classList.toggle('is-active',active);
      if (el.getAttribute('role') === 'button') el.setAttribute('aria-pressed',String(active));
    });
    $$('[data-relation]').forEach(el => el.classList.toggle('is-active',relations.includes(el.dataset.relation)));
    // Apply the selected walking route to the same polyline that drives the actor.
    $$('.route').forEach(el=>el.querySelectorAll('path').forEach(path=>path.setAttribute('d',el.dataset.defaultPath)));
    $$('[data-scenario]').forEach(el => el.setAttribute('aria-pressed',String(el.dataset.scenario === scenarioId)));
    $$('[data-select]').forEach(el => el.setAttribute('aria-pressed',String(el.dataset.select === entityId)));
    $$('[data-story]').forEach(el => {
      el.toggleAttribute('hidden',el.dataset.story !== scenarioId);
      el.querySelectorAll('[data-story-step]').forEach(node => {
        const index = Number(node.dataset.storyStep);
        node.classList.toggle('is-current',index === stepIndex);
        node.classList.toggle('is-visited',index < stepIndex);
        node.querySelector('[data-step]').setAttribute('aria-pressed',String(index === stepIndex));
        if (el.dataset.story===scenarioId && index===stepIndex && node.dataset.walkRoute) {
          $(`.route[data-relation="${node.dataset.walkRoute}"]`).querySelectorAll('path').forEach(path=>path.setAttribute('d',node.dataset.walkPath));
        }
      });
    });
    if (scenario) {
      inspector.innerHTML = `<span class="eyebrow">SCENARIO ${esc(scenario.number)} / STEP ${stepIndex+1} OF ${scenario.steps.length}</span><div class="step-progress" aria-hidden="true">${scenario.steps.map((_,i)=>`<span class="${i<stepIndex?'visited':i===stepIndex?'current':''}"></span>`).join('')}</div>${stepIndex===0?`<p><strong>Starting condition.</strong> ${esc(scenario.condition)}</p>`:''}${step.problem?'<span class="problem-flag">! &nbsp; A point of friction</span>':''}<h3>${esc(step.title)}</h3><p class="step-text">${esc(step.text)}</p>${stepIndex===scenario.steps.length-1?`<p class="constraint"><strong>Outcome.</strong> ${esc(scenario.outcome)}</p>`:''}<div class="step-controls"><button data-action="previous" ${stepIndex===0?'disabled':''}>← Previous</button><button data-action="next" ${stepIndex===scenario.steps.length-1?'disabled':''}>Next step →</button></div><button data-action="overview" class="overview-button">Back to the whole map</button>`;
      inspector.querySelector('.step-controls').insertAdjacentHTML('afterend','<button data-action="playback" class="overview-button"></button>');
      live.textContent = `${scenario.label}. Step ${stepIndex+1} of ${scenario.steps.length}: ${step.title}. ${step.text}`;
    } else if (selected) {
      const kindLabel = { place: 'LOCATION', system: 'SUPPORTING SERVICE', infrastructure: 'TECHNICAL COMPONENT',vehicle:'KJØRETØY',station:'ARBEIDSSTASJON' }[selected.kind];
      inspector.innerHTML = `<span class="eyebrow">${kindLabel} ${esc(selected.number)}</span><h3>${esc(selected.label)}</h3><span class="entity-role">${esc(selected.role)}</span><p class="step-text">${esc(selected.description)}</p><p class="constraint">${esc(selected.constraint)}</p><p class="eyebrow">CONNECTED RELATIONSHIPS</p><ul class="relations-list">${relations.map(id => { const r = relationById.get(id); return `<li>${esc(entityById.get(r.from).label)} → ${esc(entityById.get(r.to).label)}: ${esc(r.label)}</li>`; }).join('')}</ul><button data-action="overview" class="overview-button">Back to the whole map</button>`;
      live.textContent = `${selected.label}. ${selected.description}`;
    } else {
      inspector.innerHTML = '';
      live.textContent = 'Map overview. Choose a component or a story.';
    }
    if (!panelHidden && focusedAction && focusedAction !== 'overview') {
      const target = inspector.querySelector(`[data-action="${focusedAction}"]:not(:disabled)`) || inspector.querySelector('.step-controls button:not(:disabled)');
      target?.focus({preventScroll:true});
    }
    if (!panelHidden && (scenario || selected)) {
      sidebarContent.scrollTop += inspector.getBoundingClientRect().top - sidebarContent.getBoundingClientRect().top - $('.sidebar-tabs').offsetHeight - 12;
    }
    syncStory();
    syncParts();
    updateDetail();
    if (step?.handoff) inspector.querySelector('h3').insertAdjacentHTML('beforebegin',`<p class="handoff"><strong>Overlevering:</strong> ${esc(step.handoff)}</p>`);
    updatePlaybackControl();
    schedulePlayback();
  }

  function updatePlaybackControl() {
    const button = inspector.querySelector('[data-action="playback"]');
    const scenario = issue.scenarios.find(s => s.id===scenarioId);
    if (button) button.textContent = autoPlaying ? 'Pause story' : stepIndex===scenario.steps.length-1 && !storyAnimation ? 'Replay story' : 'Play story';
  }
  function syncParts() {
    const parts=scene.scenarioLayouts?.find(l=>l.scenario===scenarioId)?.steps[stepIndex]?.parts??[];
    const states=new Map(parts.map(p=>[`${p.entity}/${p.part}`,p.state]));
    world.querySelectorAll('[data-part]').forEach(el=>el.dataset.partState=states.get(el.dataset.part)??'idle');
  }
  function updateDetail() {
    stage.classList.toggle('adaptive-detail',!!scene.adaptiveDetail);
    if(!scene.adaptiveDetail)return;
    const pixels=scale*Math.min(svg.clientWidth/scene.width,svg.clientHeight/scene.height);
    for(const el of detailObjects) {
      const size=Number(el.dataset.lodWidth)*pixels,old=Number(el.dataset.lodTier??0);
      let tier=size>=180?2:size>=85?1:0;
      if(old===2&&size>=162)tier=2;
      if(old>=1&&tier===0&&size>=76)tier=1;
      if(el.classList.contains('is-active'))tier=Math.max(1,tier);
      el.dataset.lodTier=String(tier);
    }
  }
  function stopPlayback(pauseActor = false) {
    autoPlaying = false;
    clearTimeout(playbackTimer);
    storyPaused = pauseActor && Boolean(storyAnimation);
    updatePlaybackControl();
    if (storyAnimation && !storyPaused) runMotion();
  }
  function schedulePlayback() {
    clearTimeout(playbackTimer);
    if (!autoPlaying || storyAnimation || document.hidden || !visible) return;
    const scenario = issue.scenarios.find(s => s.id===scenarioId), step = scenario.steps[stepIndex];
    const copy = [step.title,step.text,stepIndex===0 ? scenario.condition : '',stepIndex===scenario.steps.length-1 ? scenario.outcome : ''].join(' ');
    // Allow reading at roughly 250 words/minute after the actor reaches its destination.
    const delay = Math.max(3000,copy.trim().split(/\s+/u).length*240);
    playbackTimer = setTimeout(() => {
      if (!autoPlaying || document.hidden || !visible) return;
      if (stepIndex===scenario.steps.length-1) { stopPlayback(); return; }
      stepIndex++;
      renderSelection();
    },delay);
  }
  function startScenario(id) {
    stopPlayback();
    scenarioId = id;
    stepIndex = 0;
    entityId = null;
    storyKey = undefined;
    storyAnimation = null;
    autoPlaying = true;
    setSheet(true);
    renderSelection();
  }
  function togglePlayback() {
    const scenario = issue.scenarios.find(s => s.id===scenarioId);
    if (!scenario) return;
    if (autoPlaying) { stopPlayback(true); return; }
    if (stepIndex===scenario.steps.length-1 && !storyAnimation) { startScenario(scenarioId); return; }
    autoPlaying = true;
    storyPaused = false;
    updatePlaybackControl();
    if (storyAnimation) runMotion();
    else schedulePlayback();
  }

  function placeActor(actor, point, kind, direction) {
    const [x,y,depth] = [0,1,2].map(i => point.reduce((n,v,j) => n+v*axes[j][i],0));
    actor.setAttribute('transform',`translate(${x} ${y})`);
    actor.dataset.position = JSON.stringify(point);
    const shapes=[...actor.querySelectorAll('[data-kind]')];
    shapes.forEach(el=>el.toggleAttribute('hidden',el.dataset.kind!==kind));
    if (direction && ['car','van','bicycle','plane'].includes(kind)) {
      const heading=(Math.round(Math.atan2(direction[1],direction[0])*8/Math.PI)+16)%16;
      actor.querySelectorAll(`[data-kind="${kind}"] [data-heading]`).forEach(el=>el.toggleAttribute('hidden',Number(el.dataset.heading)!==heading));
      actor.dataset.heading=String(heading);
    }
    let parent = $('#actor-storage');
    if (['person','car','van','bicycle','plane'].includes(kind)) {
      parent = (kind==='person' ? interiors.find(el => {
        const [px,py,w,d] = el.dataset.region.split(',').map(Number);
        return point[0]>=px && point[0]<=px+w && point[1]>=py && point[1]<=py+d;
      }) : null) ?? $('#bodies');
    }
    const before = [...parent.children].find(el => el!==actor && Number(el.dataset.depth)>depth) ?? null;
    if (actor.parentNode!==parent || actor.nextElementSibling!==before) parent.insertBefore(actor,before);
  }
  function finishStory() {
    if (!storyAnimation) return;
    const a = storyAnimation;
    placeActor(a.actor,a.path.at(-1),a.kind,a.path.length>1?a.path.at(-1).map((v,i)=>v-a.path.at(-2)[i]):undefined);
    a.actor.style.opacity = '1';
    a.actor.dataset.phase = 'settled';
    a.actor.dataset.place = a.state.at;
    storyStatus.textContent = `${a.label} · ${a.state.caption}`;
    live.textContent = storyStatus.textContent;
    storyAnimation = null;
    updatePlaybackControl();
    schedulePlayback();
  }
  function syncStory() {
    const scenario = issue.scenarios.find(s => s.id===scenarioId);
    const nextKey = scenario?.actor ? `${scenarioId}:${stepIndex}` : null;
    if (nextKey===storyKey) return;
    const previousActor = actors.find(el => !el.hasAttribute('hidden'));
    const previousPosition = previousActor?.dataset.position;
    const canTravel = (!storyKey && stepIndex===0) || (storyKey===`${scenarioId}:${stepIndex-1}` && !storyAnimation) || (storyKey?.split(':')[0]!==scenarioId && stepIndex===0);
    storyKey = nextKey;
    storyAnimation = null;
    for (const actor of actors) { actor.setAttribute('hidden',''); $('#actor-storage').append(actor); }
    $$('.map-object.actor-replaced').forEach(el=>el.classList.remove('actor-replaced'));
    $$('.entrance-open').forEach(el => el.removeAttribute('hidden'));
    $$('.entrance-closed').forEach(el => el.setAttribute('hidden',''));
    storyStatus.hidden = !nextKey;
    if (!nextKey) return;
    const step = scenario.steps[stepIndex], state = step.state;
    const placement = scene.scenarioLayouts.find(l => l.scenario===scenarioId).steps[stepIndex];
    const actor = actors.find(el => el.dataset.actor===scenarioId);
    const representation=cityMotion.actorAt(scenario,stepIndex);
    actor.dataset.kind=representation.kind;
    actor.removeAttribute('data-entity'); actor.removeAttribute('role'); actor.removeAttribute('tabindex'); actor.setAttribute('aria-hidden','true');
    if (representation.entity) {
      const entity=entityById.get(representation.entity);
      actor.dataset.entity=entity.id;
      actor.setAttribute('role','button');actor.setAttribute('tabindex','0');actor.removeAttribute('aria-hidden');
      actor.setAttribute('aria-label',`${entity.detailView?'Utforsk':'Inspect'} ${entity.label}`);
      $(`.map-object[data-entity="${entity.id}"]`)?.classList.add('actor-replaced');
    }
    actor.removeAttribute('hidden');
    actor.removeAttribute('data-place');
    actor.dataset.target = state.at;
    if (state.access) {
      const object = $(`.map-object[data-entity="${state.access.entity}"]`);
      object.querySelector('.entrance-open').toggleAttribute('hidden',state.access.value!=='open');
      object.querySelector('.entrance-closed').toggleAttribute('hidden',state.access.value!=='closed');
    }
    const moving = canTravel && placement.path.length>1;
    const path = moving ? placement.path : [placement.path.at(-1)];
    const length = path.slice(1).reduce((n,p,i) => n+Math.hypot(...p.map((v,j) => v-path[i][j])),0);
    const pace={person:7,document:5,car:3.5,van:4,bicycle:5,plane:2.5,data:3,electricity:2};
    storyAnimation = { actor, path, state, kind:representation.kind, label:representation.label, elapsed:0, duration:moving ? clamp(length*pace[representation.kind],1200,12000) : 180, moving };
    actor.dataset.phase = moving ? 'moving' : 'placing';
    actor.style.opacity = moving ? '1' : '0';
    placeActor(actor,path[0],representation.kind,path.length>1?path[1].map((v,i)=>v-path[0][i]):undefined);
    storyStatus.textContent = `${representation.label} · ${moving ? state.moving : state.caption}`;
    live.textContent = storyStatus.textContent;
    if (reducedMotion.matches || document.hidden || !visible || (previousActor===actor && path.length===1 && previousPosition===JSON.stringify(path[0]))) finishStory();
    else runMotion();
  }

  function selectEntity(id) {
    if (!entityById.has(id)) return;
    if (bundle && entityById.get(id).detailView) { openDetail(id); return; }
    if (navigation) cancelNavigation();
    stopPlayback();
    setSheet(true);
    scenarioId = null;
    entityId = id;
    renderSelection();
  }
  function selectStep(index) {
    if(navigation)cancelNavigation();
    const scenario = issue.scenarios.find(s => s.id === scenarioId);
    if (!scenario || !Number.isInteger(index) || index < 0 || index >= scenario.steps.length) return;
    stopPlayback();
    setSheet(true);
    stepIndex = index;
    renderSelection();
  }
  $('#stories').addEventListener('click',event=>{const id=event.target.closest('[data-scenario]')?.dataset.scenario;if(id){if(navigation)cancelNavigation();startScenario(id);}});
  $('#places').addEventListener('click',event=>{const id=event.target.closest('[data-select]')?.dataset.select;if(id)selectEntity(id);});
  inspector.addEventListener('click',event => {
    if(navigation)cancelNavigation();
    const action = event.target.closest('[data-action]')?.dataset.action;
    const scenario = issue.scenarios.find(s => s.id === scenarioId);
    if (action === 'playback') { togglePlayback(); return; }
    if (!['overview','previous','next'].includes(action)) return;
    stopPlayback();
    if (action === 'overview') { scenarioId = null; entityId = null; }
    else if (scenario && action === 'previous') stepIndex = Math.max(0,stepIndex-1);
    else if (scenario && action === 'next') stepIndex = Math.min(scenario.steps.length-1,stepIndex+1);
    else return;
    renderSelection();
    if (action === 'overview') $('#tab-stories').focus({preventScroll:true});
  });
  function tab(name) {
    ['stories','places'].forEach(id => {
      $(`#${id}`).hidden = id !== name;
      $(`#tab-${id}`).setAttribute('aria-pressed',String(id === name));
    });
    sidebarContent.scrollTop = 0;
  }
  $('#tab-stories').addEventListener('click',() => tab('stories'));
  $('#tab-places').addEventListener('click',() => tab('places'));
  $('#show-routes').addEventListener('change',event => stage.classList.toggle('hidden-routes',!event.target.checked));
  $('#show-labels').addEventListener('change',event => stage.classList.toggle('hidden-labels',!event.target.checked));

  const viewNav=document.createElement('nav');
  if(bundle) {
    viewNav.className='view-navigation';viewNav.setAttribute('aria-label','Nivåer i kartet');
    stage.append(viewNav);updateNavigation();
    viewNav.addEventListener('click',event=>{
      const b=event.target.closest('button');if(!b)return;
      if(b.dataset.back!==undefined) {if(navigation)cancelNavigation();else goBack(history.length-1);}
      else if(b.dataset.level!==undefined)goBack(Number(b.dataset.level));
    });
    workspace.addEventListener('keydown',event=>{
      if(event.key!=='Escape' || fullscreenDialog.open || (!history.length && !navigation))return;
      event.preventDefault();event.stopPropagation();
      if(navigation)cancelNavigation();else goBack(history.length-1);
    },true);
  }
  function updateNavigation() {
    workspace.dataset.view=viewId;
    viewNav.innerHTML=`<button data-back ${!history.length&&!navigation?'disabled':''} aria-label="Tilbake ett nivå">← Tilbake</button><div class="view-crumbs">${history.map((entry,i)=>`<button data-level="${i}">${esc(bundle.views[entry.view].issue.title)}</button><span aria-hidden="true">›</span>`).join('')}<span aria-current="page">${esc(issue.title)}</span></div>${history.length?'<button data-level="0" class="city-home">Hele kartet</button>':''}`;
  }
  function snapshot() {
    stopPlayback(true);finishIntro();
    return {markup:svg.innerHTML,scenarioId,stepIndex,entityId,storyKey,scale,panX,panY,
      animation:storyAnimation?{...storyAnimation,actor:storyAnimation.actor.dataset.actor}:null,
      status:storyStatus.textContent,tab:$('#places').hidden?'stories':'places',scroll:sidebarContent.scrollTop,
      routes:$('#show-routes').checked,labels:$('#show-labels').checked};
  }
  function mountView(id,saved) {
    stopPlayback(true);cancelAnimationFrame(frame);frame=0;zoomMoving=false;storyAnimation=null;
    viewId=id;
    const view=bundle.views[id];issue=view.issue;scene=view.scene;
    entityById=new Map(issue.entities.map(e=>[e.id,e]));relationById=new Map(issue.relationships.map(r=>[r.id,r]));
    const template=document.createElement('template');template.innerHTML=view.html.map;
    for(const name of ['viewBox','data-origin','data-projection-scale','data-axes','aria-label'])svg.setAttribute(name,template.content.firstElementChild.getAttribute(name));
    svg.innerHTML=saved?.markup ?? template.content.firstElementChild.innerHTML;
    world=$('#world');axes=JSON.parse(svg.dataset.axes);actors=$$('[data-actor]');interiors=$$('[data-interior]');riseItems=[];
    detailObjects=[...world.querySelectorAll('[data-lod-width]')];
    $('.scenario-list').innerHTML=view.html.scenarios;$('.entity-list').innerHTML=view.html.entityButtons;
    $('.map-stage .legend').innerHTML=view.html.legend;
    $('.map-corner h1').textContent=issue.title;
    $('.map-corner h1').tabIndex=-1;
    $('#stories .sidebar-heading h2').textContent=issue.presentation?.storyHeading ?? 'Prosessene her inne';
    $('#stories .sidebar-heading p').textContent=issue.summary;
    $('#view-boundaries')?.remove();
    if(view.boundaries) {
      const parent=bundle.views[history.at(-1).view];
      $('#stories .sidebar-heading').insertAdjacentHTML('beforeend',`<ul id="view-boundaries" class="boundary-list">${view.boundaries.map(b=>`<li><strong>${b.direction==='in'?'Inn':'Ut'}:</strong> ${esc(parent.issue.relationships.find(r=>r.id===b.relation).label)} · ${esc(entityById.get(b.entity).label)}</li>`).join('')}</ul>`);
    }
    inspector.innerHTML='';
    scenarioId=saved?.scenarioId ?? null;stepIndex=saved?.stepIndex ?? 0;entityId=saved?.entityId ?? null;
    storyKey=saved?.storyKey ?? null;storyPaused=!!saved?.animation;
    if(saved?.animation)storyAnimation={...saved.animation,actor:actors.find(a=>a.dataset.actor===saved.animation.actor)};
    storyStatus.textContent=saved?.status ?? '';storyStatus.hidden=!storyKey;
    scale=saved?.scale ?? 1;panX=saved?.panX ?? 0;panY=saved?.panY ?? 0;
    target={scale,x:panX,y:panY};velocity.scale=velocity.x=velocity.y=0;
    $('#show-routes').checked=saved?.routes ?? true;$('#show-labels').checked=saved?.labels ?? true;
    stage.classList.toggle('hidden-routes',!$('#show-routes').checked);stage.classList.toggle('hidden-labels',!$('#show-labels').checked);
    tab(saved?.tab ?? 'stories');renderSelection();sidebarContent.scrollTop=saved?.scroll ?? 0;
    drawViewport();updateNavigation();
    if(!reducedMotion.matches)svg.animate([{opacity:.35},{opacity:1}],{duration:180});
    live.textContent=`${issue.title}. ${issue.scenarios.length} prosesser. ${history.length?'Tilbake går ett nivå opp.':''}`;
  }
  function detailPose(id) {
    const actor=actors.find(a=>a.dataset.entity===id && !a.hasAttribute('hidden'));
    const el=actor ?? $(`.map-object[data-entity="${id}"]`);
    const full=el.dataset.fullBounds?.split(',').map(Number);
    const b=full?{x:full[0],y:full[1],width:full[2],height:full[3]}:el.getBBox();
    const transform=actor?.transform.baseVal.consolidate()?.matrix;
    const cx=b.x+b.width/2+(transform?.e ?? 0),cy=b.y+b.height/2+(transform?.f ?? 0);
    const panel=sidebar.getBoundingClientRect(),screen=svg.getBoundingClientRect();
    const availableWidth=panelHidden||mobile.matches?screen.width:Math.max(120,panel.left-screen.left-24);
    const availableHeight=panelHidden||!mobile.matches?screen.height:Math.max(150,panel.top-screen.top);
    const center=new DOMPoint(screen.left+availableWidth/2,screen.top+availableHeight*.57).matrixTransform(svg.getScreenCTM().inverse());
    const next=clamp(Math.min(scene.width*.48/Math.max(b.width,45),scene.height*.5/Math.max(b.height,45)),scale,maxScale());
    return {scale:next,x:center.x-cx*next,y:center.y-cy*next};
  }
  function openDetail(id) {
    const saved=navigation?.saved ?? snapshot();
    navigation={entity:id,next:entityById.get(id).detailView,saved,pose:detailPose(id)};
    updateNavigation();moveViewport(navigation.pose);
    if(reducedMotion.matches)completeNavigation();
  }
  function completeNavigation() {
    const entry=navigation;if(!entry)return;
    navigation=null;history.push({view:viewId,entity:entry.entity,state:entry.saved,pose:entry.pose});
    mountView(entry.next);$('.map-corner h1').focus({preventScroll:true});
  }
  function cancelNavigation() {
    const entry=navigation;if(!entry)return;
    navigation=null;moveViewport({scale:entry.saved.scale,x:entry.saved.panX,y:entry.saved.panY});updateNavigation();
  }
  function goBack(index) {
    if(navigation)cancelNavigation();
    if(index<0 || index>=history.length)return;
    const entry=history[index];history.splice(index);
    mountView(entry.view,entry.state);
    if(!reducedMotion.matches) {
      moveViewport(entry.pose,false);
      moveViewport({scale:entry.state.scale,x:entry.state.panX,y:entry.state.panY});
    }
    const focus=actors.find(a=>a.dataset.entity===entry.entity && !a.hasAttribute('hidden')) ?? $(`.map-object[data-entity="${entry.entity}"]`);
    focus?.focus({preventScroll:true});
  }

  function drawViewport() {
    panX = clamp(panX,scene.width*(1-scale)-scene.width*.12,scene.width*.12);
    panY = clamp(panY,scene.height*(1-scale)-scene.height*.12,scene.height*.12);
    world.setAttribute('transform',`translate(${panX} ${panY}) scale(${scale})`);
    $('#zoom-value').textContent = `${Math.round(scale*100)}%`;
    $('#zoom-out').disabled = scale <= 1;
    $('#zoom-in').disabled = scale >= maxScale();
    updateDetail();
  }
  function stopMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    zoomMoving = false;
    target = { scale, x: panX, y: panY };
    velocity.scale = velocity.x = velocity.y = 0;
    if ((storyAnimation && !storyPaused) || intro) runMotion();
  }
  function runMotion() {
    if (!frame && !document.hidden && visible) { lastFrame=performance.now(); frame=requestAnimationFrame(animateViewport); }
  }
  function animateViewport(now) {
    const dt = Math.min(.05,Math.max(0,now-lastFrame)/1000);
    lastFrame = now;
    if (intro) animateIntro(now);
    if (zoomMoving) {
      const values = {scale, x:panX, y:panY};
      for (const key of ['scale','x','y']) {
        const s = reducedMotion.matches ? {x:target[key],v:0} : cityMotion.spring({x:values[key],v:velocity[key]},target[key],dt);
        values[key] = s.x; velocity[key] = s.v;
      }
      scale = clamp(values.scale,1,maxScale()); panX=values.x; panY=values.y;
      if (scale !== values.scale) velocity.scale = 0;
      zoomMoving = !(scale===target.scale && panX===target.x && panY===target.y);
      drawViewport();
    }
    if (storyAnimation && !storyPaused) {
      const a = storyAnimation;
      a.elapsed += dt*1000;
      const t = Math.min(1,a.elapsed/a.duration), progress=t*t*(3-2*t);
      const point=cityMotion.pointAlong(a.path,progress),ahead=cityMotion.pointAlong(a.path,Math.min(1,progress+.001));
      placeActor(a.actor,point,a.kind,ahead.some((v,i)=>v!==point[i])?ahead.map((v,i)=>v-point[i]):undefined);
      if (!a.moving) a.actor.style.opacity=String(progress);
      if (t===1 || reducedMotion.matches) finishStory();
    }
    frame = zoomMoving || (storyAnimation && !storyPaused) || intro ? requestAnimationFrame(animateViewport) : 0;
    if (navigation && !zoomMoving) completeNavigation();
  }
  function moveViewport(next, smooth = true) {
    target = {
      scale: next.scale,
      x: clamp(next.x,scene.width*(1-next.scale)-scene.width*.12,scene.width*.12),
      y: clamp(next.y,scene.height*(1-next.scale)-scene.height*.12,scene.height*.12)
    };
    if (!smooth || reducedMotion.matches) {
      scale=target.scale; panX=target.x; panY=target.y;
      stopMotion();
      drawViewport();
    } else {
      zoomMoving = true;
      runMotion();
    }
  }
  function zoom(factor,anchor={x:scene.width/2,y:scene.height/2},smooth=true) {
    const next = clamp((zoomMoving ? target.scale : scale)*factor,1,maxScale());
    velocity.x = -(anchor.x-panX)/scale*velocity.scale;
    velocity.y = -(anchor.y-panY)/scale*velocity.scale;
    moveViewport({ scale:next, x:anchor.x-(anchor.x-panX)*next/scale, y:anchor.y-(anchor.y-panY)*next/scale },smooth);
  }
  function fit() { if(navigation)cancelNavigation();moveViewport({scale:1,x:0,y:0}); }
  new ResizeObserver(()=>{
    if ((zoomMoving ? target.scale : scale)>maxScale()) zoom(1,undefined,false);
    else drawViewport();
    if(navigation && !zoomMoving)completeNavigation();
  }).observe(svg);
  reducedMotion.addEventListener('change',() => { if (reducedMotion.matches) { finishIntro(); finishPanel(); finishStory(); moveViewport(zoomMoving ? target : {scale,x:panX,y:panY},false);if(navigation)completeNavigation(); } });
  function suspendMotion() {
    if (bundle) {
      stopPlayback(true);finishIntro();
      if(navigation) cancelNavigation();
      if(zoomMoving)moveViewport(target,false);
      cancelAnimationFrame(frame);frame=0;
      return;
    }
    stopPlayback();
    finishIntro();
    finishStory();
    if (zoomMoving) moveViewport(target,false);
    cancelAnimationFrame(frame); frame=0;
  }
  document.addEventListener('visibilitychange',() => { if (document.hidden) suspendMotion(); });
  new IntersectionObserver(entries => {
    visible=entries.at(-1).isIntersecting;
    if (!visible) suspendMotion();
  }).observe(stage);
  $('#zoom-in').addEventListener('click',() => {if(navigation)cancelNavigation();zoom(1.25);});
  $('#zoom-out').addEventListener('click',() => {if(navigation)cancelNavigation();zoom(.8);});
  $('#fit').addEventListener('click',fit);

  const fullscreenButton = $('#fullscreen');
  const fullscreenDialog = document.createElement('dialog');
  fullscreenDialog.className = 'map-fullscreen';
  fullscreenDialog.setAttribute('aria-label','Full-screen map');
  document.body.append(fullscreenDialog);
  const stageSlot = document.createElement('div');
  stageSlot.hidden = true;
  workspace.before(stageSlot);
  let savedScroll = 0;
  let nativeFullscreen = false;
  function closeFullscreen() {
    if (!fullscreenDialog.open) return;
    if (document.fullscreenElement === workspace) document.exitFullscreen().catch(() => {});
    fullscreenDialog.close();
    restoreFullscreen();
  }
  function restoreFullscreen() {
    if (workspace.parentNode!==fullscreenDialog) return;
    stageSlot.after(workspace);
    stageSlot.hidden = true;
    fullscreenButton.textContent = '⛶';
    fullscreenButton.setAttribute('aria-label','Full screen');
    fullscreenButton.title = 'Full screen';
    fullscreenButton.setAttribute('aria-expanded','false');
    nativeFullscreen = false;
    document.body.classList.remove('map-expanded');
    window.scrollTo(0,savedScroll);
    fullscreenButton.focus({preventScroll:true});
  }
  fullscreenDialog.addEventListener('close',restoreFullscreen);
  fullscreenDialog.addEventListener('cancel',event => { event.preventDefault(); closeFullscreen(); });
  document.addEventListener('fullscreenchange',() => {
    if (document.fullscreenElement === workspace) nativeFullscreen = true;
    else if (nativeFullscreen) closeFullscreen();
  });
  fullscreenButton.addEventListener('click',() => {
    if(navigation)cancelNavigation();
    if (fullscreenDialog.open) { closeFullscreen(); return; }
    stopMotion();
    savedScroll = scrollY;
    stageSlot.style.height = `${workspace.getBoundingClientRect().height}px`;
    stageSlot.hidden = false;
    fullscreenDialog.append(workspace);
    fullscreenDialog.showModal();
    document.body.classList.add('map-expanded');
    fullscreenButton.textContent = '×';
    fullscreenButton.setAttribute('aria-label','Exit full screen');
    fullscreenButton.title = 'Exit full screen';
    fullscreenButton.setAttribute('aria-expanded','true');
    fullscreenButton.focus({preventScroll:true});
    // The modal fills the browser viewport when native fullscreen is unavailable or denied.
    if (document.fullscreenEnabled && workspace.requestFullscreen) workspace.requestFullscreen().catch(() => {});
  });
  const local = event => new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  stage.addEventListener('wheel',event => {
    if (!event.ctrlKey && !event.metaKey) return;
    if(navigation)cancelNavigation();
    event.preventDefault();
    const pixels = event.deltaY * (event.deltaMode===1 ? 16 : event.deltaMode===2 ? svg.clientHeight : 1);
    zoom(Math.exp(-clamp(pixels,-120,120)*.0025),local(event));
  },{passive:false});
  svg.addEventListener('keydown',event => {
    if (event.key==='Escape' && fullscreenDialog.open) return;
    if(navigation && !['Enter',' '].includes(event.key))cancelNavigation();
    const marker = event.target.closest('[data-step]');
    if (marker && ['Enter',' '].includes(event.key)) { event.preventDefault(); selectStep(Number(marker.dataset.step)); return; }
    const id = event.target.closest('[data-entity]')?.dataset.entity;
    if (id && ['Enter',' '].includes(event.key)) { event.preventDefault(); selectEntity(id); return; }
    if (event.key===' ' && scenarioId) { event.preventDefault(); togglePlayback(); return; }
    if (['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(event.key)) event.preventDefault();
    else return;
    if (event.key==='+' || event.key==='=') zoom(1.25);
    else if (event.key==='-') zoom(.8);
    else if (event.key==='0') fit();
    else if (event.key==='Escape') { stopPlayback(); scenarioId=null; entityId=null; renderSelection(); if (marker) svg.focus({preventScroll:true}); }
    else {
      stopMotion();
      panX += event.key==='ArrowLeft'?50:event.key==='ArrowRight'?-50:0;
      panY += event.key==='ArrowUp'?50:event.key==='ArrowDown'?-50:0;
      drawViewport();
    }
  });
  const pointers = new Map();
  let dragged = false, tappedId = null, tappedStep = null, start = null;
  const pair = () => {
    const [a,b] = [...pointers.values()];
    return { x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y) };
  };
  svg.addEventListener('pointerdown',event => {
    if (event.button!==0) return;
    if(navigation)cancelNavigation();
    stopMotion();
    if (pointers.size===0) {
      dragged=false; tappedId=event.target.closest('[data-entity]')?.dataset.entity;
      tappedStep=event.target.closest('[data-step]')?.dataset.step ?? null;
      start={x:event.clientX,y:event.clientY};
    } else dragged=true;
    pointers.set(event.pointerId,local(event));
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove',event => {
    if (!pointers.has(event.pointerId)) return;
    const point=local(event), previous=pointers.get(event.pointerId);
    if (pointers.size>=2) {
      const before=pair();
      pointers.set(event.pointerId,point);
      const after=pair();
      if (before.distance>1) zoom(after.distance/before.distance,before,false);
      panX+=after.x-before.x; panY+=after.y-before.y;
      dragged=true;
    } else {
      if (event.pointerType==='touch' && !fullscreenDialog.open && Math.abs(event.clientY-start.y)>Math.abs(event.clientX-start.x)) return;
      if (!dragged && Math.hypot(event.clientX-start.x,event.clientY-start.y)<5) return;
      dragged=true;
      panX+=point.x-previous.x; panY+=point.y-previous.y;
      pointers.set(event.pointerId,point);
    }
    svg.classList.add('dragging');
    drawViewport();
  });
  function finish(event,cancelled=false) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size===0) {
      svg.classList.remove('dragging');
      if (!cancelled && !dragged) {
        if (tappedStep !== null) selectStep(Number(tappedStep));
        else if (tappedId) selectEntity(tappedId);
      }
    }
  }
  svg.addEventListener('pointerup',event => finish(event));
  svg.addEventListener('pointercancel',event => finish(event,true));
  svg.addEventListener('lostpointercapture',event => finish(event,true));
  // Assistive technologies may activate a button without generating pointer events.
  svg.addEventListener('click',event => {
    if (event.detail !== 0) return;
    const marker = event.target.closest('[data-step]');
    if (marker) selectStep(Number(marker.dataset.step));
    else selectEntity(event.target.closest('[data-entity]')?.dataset.entity);
  });
  drawViewport();
  setSheet(true);
  startIntro();
})();
