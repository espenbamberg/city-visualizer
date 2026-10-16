const sections = [...document.querySelectorAll('.collection')];
const search = document.querySelector('#search');
const collection = document.querySelector('#collection');
const count = document.querySelector('#result-count');
const dialog = document.querySelector('dialog');
const fullImage = document.querySelector('#full-image');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
let activeLinks = [];
let activeIndex = 0;

function filter() {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  let collections = 0;
  for (const section of sections) {
    let matches = 0;
    for (const card of section.querySelectorAll('.card')) {
      card.hidden = Boolean(collection.value && section.id !== collection.value) || !card.dataset.search.includes(query);
      if (!card.hidden) matches++;
    }
    section.hidden = matches === 0;
    section.querySelector('.collection-count').textContent = `${matches} captures`;
    visible += matches;
    if (matches) collections++;
  }
  count.textContent = `${visible} screenshot${visible === 1 ? '' : 's'} across ${collections} collection${collections === 1 ? '' : 's'}`;
  document.querySelector('#empty').hidden = visible !== 0;
}

function show(index) {
  activeIndex = index;
  const link = activeLinks[index];
  fullImage.src = link.href;
  fullImage.alt = link.dataset.title;
  document.querySelector('#viewer-title').textContent = link.dataset.title;
  document.querySelector('#original').href = link.href;
  previous.disabled = index === 0;
  next.disabled = index === activeLinks.length - 1;
}

search.addEventListener('input', filter);
collection.addEventListener('change', filter);
document.querySelector('.filters').hidden = false;
document.querySelectorAll('.image-link').forEach(link => {
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    activeLinks = [...document.querySelectorAll('.card:not([hidden]) .image-link')];
    if (!activeLinks.includes(link)) activeLinks = [link];
    show(activeLinks.indexOf(link));
    dialog.showModal();
  });
});
document.querySelector('#close').addEventListener('click', () => dialog.close());
previous.addEventListener('click', () => show(activeIndex - 1));
next.addEventListener('click', () => show(activeIndex + 1));
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' && activeIndex > 0) { event.preventDefault(); show(activeIndex - 1); }
  if (event.key === 'ArrowRight' && activeIndex < activeLinks.length - 1) { event.preventDefault(); show(activeIndex + 1); }
});
