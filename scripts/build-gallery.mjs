import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';

const docs = new URL('../docs/', import.meta.url);
const groups = JSON.parse(await readFile(new URL('screenshots.json', docs), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const images = groups.flatMap(group => group.images);
assert(images.length > 0);
assert.equal(new Set(images.map(image => image.file)).size, images.length, 'Screenshot paths must be unique');
for (const image of images) {
  assert(/^images\/[a-z0-9-]+\.webp$/.test(image.file));
  assert(/^images\/[a-z0-9-]+\.webp$/.test(image.thumbnail));
  assert(image.width > 0 && image.height > 0);
  await access(new URL(image.file, docs));
  await access(new URL(image.thumbnail, docs));
}

const featured = images.find(image => image.file === 'images/research-booking-step-2.webp');
const sections = groups.map((group, index) => `
    <section class="collection" id="${escape(group.id)}" aria-labelledby="heading-${escape(group.id)}">
      <header class="collection-heading">
        <span class="section-number">${String(index + 1).padStart(2, '0')}</span>
        <div><h2 id="heading-${escape(group.id)}">${escape(group.title)}</h2><p>${escape(group.description)}</p></div>
        <span class="collection-count">${group.images.length} captures</span>
      </header>
      <div class="grid">${group.images.map(image => `
        <figure class="card" data-search="${escape(`${group.title} ${image.title} ${image.source}`.toLowerCase())}">
          <a class="image-link" href="${escape(image.file)}" data-title="${escape(`${group.title} · ${image.title}`)}" aria-label="${escape(`Open ${group.title} — ${image.title}`)}">
            <img src="${escape(image.thumbnail)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async" alt="${escape(`${group.title}: ${image.title}`)}">
            <span class="expand" aria-hidden="true">↗</span>
          </a>
          <figcaption><span>${escape(image.title)}</span><span class="dimensions">${image.width} × ${image.height}</span></figcaption>
        </figure>`).join('')}
      </div>
    </section>`).join('');

await writeFile(new URL('index.html', docs), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Explore ${images.length} CityVisualizer screenshots: isometric worlds, connected stories, component studies and desktop and mobile reviews.">
  <meta name="theme-color" content="#f5f4ed">
  <title>CityVisualizer — The visual archive</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="gallery.css">
  <script src="gallery.js" defer></script>
</head>
<body>
  <a class="skip" href="#archive">Skip to screenshots</a>
  <header class="site-header wrap">
    <a class="brand" href="./"><span class="brand-icon" aria-hidden="true">◈</span> CITY<span>VISUALIZER</span></a>
    <a class="repo-link" href="https://github.com/espenbamberg/city-visualizer">Get the skill <span aria-hidden="true">↗</span></a>
  </header>
  <main class="wrap">
    <section class="hero" aria-labelledby="title">
      <div class="hero-copy">
        <p class="eyebrow"><span></span> THE VISUAL ARCHIVE</p>
        <h1 id="title">Small worlds.<br>Big explanations.</h1>
        <p class="intro">Turn a complex process into a place people can explore. CityVisualizer connects people, services and systems through illustrated maps and step-by-step stories.</p>
        <a class="browse" href="#archive">Explore the archive <span aria-hidden="true">↓</span></a>
        <div class="stats"><div><strong>${images.length}</strong><span>screenshots</span></div><div><strong>${groups.length}</strong><span>collections</span></div><div><strong>V1–V5</strong><span>and project studies</span></div></div>
      </div>
      <figure class="hero-image">
        <a href="${featured.file}" class="image-link" data-title="The repair district · Register the booking" aria-label="Open the repair district booking screenshot">
          <img src="${featured.file}" width="${featured.width}" height="${featured.height}" alt="The repair district: an isometric service map showing the booking journey through people, places and supporting systems." fetchpriority="high">
          <span class="expand" aria-hidden="true">↗</span>
        </a>
        <figcaption><span><span class="dot"></span> PROJECT SPOTLIGHT</span><span>The repair district / Booking</span></figcaption>
      </figure>
    </section>
    <section class="uses" aria-labelledby="uses-title">
      <p class="eyebrow">WHAT YOU CAN EXPLAIN</p>
      <h2 id="uses-title">Follow the people. Understand the process.</h2>
      <p class="uses-intro">Use the skill when a story crosses teams, places or systems. Readers can follow the journey, open a building to see the work inside, and discover what changes when something goes wrong.</p>
      <div class="grid">
        <article><h3>Customer journeys</h3><p>Show how people interact with a product or service over time. Make touchpoints, decisions and handoffs easy to follow.</p></article>
        <article><h3>Technical systems</h3><p>Show how components connect, exchange information and depend on each other. Let readers move from the overview into the details.</p></article>
        <article><h3>Complex issues</h3><p>Explain how people, organizations and resources influence an outcome. Explore different perspectives and show how a change in one area affects another.</p></article>
        <article><h3>Training &amp; onboarding</h3><p>Turn unfamiliar processes into guided, step-by-step explanations. Help people understand their role and how their work fits into the whole.</p></article>
        <article><h3>Workflows</h3><p>Show how work moves between people and teams. Make responsibilities, dependencies and bottlenecks visible.</p></article>
        <article><h3>Storytelling</h3><p>Create explorable settings where people, places and events connect. Let readers follow a story or discover the world at their own pace.</p></article>
      </div>
      <p class="uses-note">Bring a description, a process or source material. Get an interactive HTML page that works offline, with editable inputs for future revisions—ready for documentation, workshops, lessons and presentations.</p>
    </section>
    <div id="archive" class="archive-toolbar">
      <div><p class="eyebrow">THE COLLECTIONS</p><p id="result-count" role="status">${images.length} screenshots across ${groups.length} collections</p></div>
      <div class="filters" hidden>
        <label><span class="sr-only">Search screenshots</span><input id="search" type="search" placeholder="Search screenshots…"></label>
        <label><span class="sr-only">Filter collection</span><select id="collection"><option value="">All collections</option>${groups.map(group => `<option value="${escape(group.id)}">${escape(group.title)} (${group.images.length})</option>`).join('')}</select></label>
      </div>
    </div>
    <p id="empty" hidden>No screenshots match. Try another search or collection.</p>
    ${sections}
  </main>
  <footer class="wrap"><div><strong>CityVisualizer</strong><p>Created by Espen Bamberg. Geometry core by Ryan / Anatomy.<br>Inspired by <a href="https://www.linkedin.com/in/bo-meyer-65a0092/">Bo Meyer’s visual modelling work</a>, featured in <a href="https://podcasts.apple.com/it/podcast/bo-meyer-om-strategi-som-kunst/id1749310254?i=1000692304560">Knowit’s Forenklingspodden</a>.</p></div><p>Saved review captures · desktop, mobile &amp; detail studies<br><a href="https://github.com/espenbamberg/city-visualizer">Source &amp; credits ↗</a></p></footer>
  <dialog aria-labelledby="viewer-title">
    <div class="viewer-bar"><h2 id="viewer-title"></h2><button id="close" aria-label="Close screenshot">Close ×</button></div>
    <div class="viewer-image"><img id="full-image" alt=""></div>
    <div class="viewer-bottom"><button id="previous" aria-label="Previous screenshot">← Previous</button><a id="original" target="_blank" rel="noopener">Open image ↗</a><button id="next" aria-label="Next screenshot">Next →</button></div>
  </dialog>
</body>
</html>
`);
console.log(`Built gallery: ${images.length} screenshots in ${groups.length} collections. All image paths verified.`);
