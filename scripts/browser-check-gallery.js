async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('http://127.0.0.1:8877/');
  const catalog = await page.evaluate(async () => (await fetch('screenshots.json')).json());
  const total = catalog.reduce((sum, group) => sum + group.images.length, 0);
  assert(await page.locator('.card').count() === total, 'Every screenshot must appear');
  assert(await page.locator('.collection').count() === catalog.length, 'Every collection must appear');
  await page.locator('.hero-image img').evaluate(image => image.decode());
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  assert(await fits(), 'Desktop must not overflow horizontally');

  await page.locator('#collection').selectOption('v5');
  const v5 = catalog.find(group => group.id === 'v5');
  assert(await page.locator('.card:visible').count() === v5.images.length, 'Collection filter must match catalog');
  await page.locator('#search').fill('phone');
  assert(await page.locator('.card:visible').count() === 3, 'Search must intersect with collection');
  await page.locator('#search').fill('no-such-screenshot');
  assert(await page.locator('#empty').isVisible(), 'Empty search needs feedback');
  await page.locator('#search').fill('');
  await page.locator('#collection').selectOption('');
  assert(await page.locator('.card:visible').count() === total, 'Reset must restore all screenshots');

  const first = page.locator('.card .image-link').first();
  await first.click();
  assert(await page.locator('dialog').isVisible(), 'Screenshot viewer must open');
  await page.locator('#full-image').evaluate(image => image.decode());
  assert(await page.locator('#previous').isDisabled(), 'Previous must stop at first screenshot');
  const firstTitle = await page.locator('#viewer-title').textContent();
  await page.keyboard.press('ArrowRight');
  assert(await page.locator('#viewer-title').textContent() !== firstTitle, 'ArrowRight must navigate');
  await page.keyboard.press('ArrowLeft');
  assert(await page.locator('#viewer-title').textContent() === firstTitle, 'ArrowLeft must return');
  await page.keyboard.press('Escape');
  assert(!await page.locator('dialog').isVisible(), 'Escape must close');
  assert(await first.evaluate(link => link === document.activeElement), 'Closing must return focus');
  await page.locator('.card .image-link').last().click();
  assert(await page.locator('#next').isDisabled(), 'Next must stop at last screenshot');
  await page.locator('#close').click();

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert(await fits(), `${width}px layout must not overflow`);
    await page.locator('#collection').selectOption('mos-eisley-cantina');
    await page.locator('.card:visible .image-link').first().click();
    assert(await page.locator('dialog').isVisible(), 'Mobile viewer must open');
    await page.locator('#full-image').evaluate(image => image.decode());
    assert(await fits(), 'Mobile viewer must not overflow');
    await page.locator('#close').click();
  }
  const noJS = await page.context().browser().newContext({ javaScriptEnabled: false });
  try {
    const fallback = await noJS.newPage();
    await fallback.goto('http://127.0.0.1:8877/');
    assert(await fallback.locator('.card').count() === total, 'Archive must work without JavaScript');
    assert(!await fallback.locator('.filters').isVisible(), 'Inactive filters must be hidden without JavaScript');
    const href = await fallback.locator('.card .image-link').first().getAttribute('href');
    assert((await fallback.request.get(`http://127.0.0.1:8877/${href}`)).ok(), 'Image fallback link must work');
  } finally {
    await noJS.close();
  }
  assert(errors.length === 0, `Browser errors: ${errors.join(', ')}`);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.locator('#collection').selectOption('');
  await page.evaluate(() => scrollTo(0, 0));
  return { screenshots: total, collections: catalog.length, checks: 'Catalog coverage, filters, search, empty state, image decoding, keyboard navigation, viewer boundaries, focus restoration, desktop/390px/320px layouts, no-JavaScript fallback and console errors.' };
}
