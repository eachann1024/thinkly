// Concatenated by block-handles-coverage.ts; browser interaction uses EGO's real mouse.
const coverageTypes = ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem',
  'toggleListItem', 'quote', 'callout', 'divider', 'table', 'codeBlock', 'image', 'video', 'audio',
  'file', 'columnLayout', 'columnSection'];
const picture = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><rect width="240" height="120" fill="#a7b8cd"/></svg>')}`;
function fixture(type, id = `cov-${type}`) {
  const block = { id, type };
  if (['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'callout'].includes(type)) block.content = '覆盖验收正文 coverage';
  if (type === 'heading') block.props = { level: 2 };
  if (type === 'codeBlock') Object.assign(block, { props: { language: 'javascript' }, content: 'const coverage = 1;' });
  if (type === 'image') block.props = { url: picture, name: 'coverage.svg', previewWidth: 240, showPreview: true };
  if (type === 'file') block.props = { url: 'data:text/plain;charset=utf-8,coverage', name: 'coverage.txt' };
  if (type === 'table') block.content = { type: 'tableContent', columnWidths: [160, 160], rows: [
    { cells: [[{ type: 'text', text: '名称', styles: {} }], [{ type: 'text', text: '值', styles: {} }]] },
    { cells: [[{ type: 'text', text: '甲', styles: {} }], [{ type: 'text', text: '乙', styles: {} }]] },
  ] };
  if (type === 'columnLayout') Object.assign(block, { props: { widths: '50,50' }, children: ['a', 'b'].map(key => ({
    id: `cov-section-${key}`, type: 'columnSection', children: [{ id: `cov-child-${key}`, type: 'paragraph', content: `分栏正文 ${key}` }],
  })) });
  return block;
}
const blockSelector = id => `[data-node-type="blockContainer"][data-id="${id}"]`;
const pause = ms => page.evaluate(ms => new Promise(resolve => setTimeout(resolve, ms)), ms);
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function seed(blocks) {
  await page.keyboard.press('Escape');
  await page.mouse.move(2, 2);
  await page.evaluate(blocks => {
    const editor = window.__gooseNoteEditor;
    editor.replaceBlocks(editor.document, blocks);
  }, blocks);
  await settle();
}
async function seedType(type) {
  await seed([{ id: 'cov-title', type: 'heading', props: { level: 1 }, content: '验收标题' }, fixture(type),
    { id: 'cov-tail', type: 'paragraph', content: '末尾焦点正文 coverage' }]);
  // Keep media and file actions out of their existing selected/focus state.
  await page.click(`${blockSelector('cov-tail')} .bn-inline-content`);
  if (type === 'image') await page.waitForFunction(() => {
    const image = document.querySelector('[data-id="cov-image"] img');
    return image?.complete && image.naturalWidth > 0;
  }, undefined, { timeout: 3000 });
}
async function pointFor(id) {
  await page.hover(blockSelector(id));
  return page.evaluate(id => {
    const container = document.querySelector(`[data-node-type="blockContainer"][data-id="${id}"]`);
    const content = [...container.querySelectorAll('.bn-block-content')]
      .find(node => node.closest('[data-node-type="blockContainer"]') === container);
    if (!content) throw new Error(`Missing own block content: ${id}`);
    const cell = content.dataset.contentType === 'table' ? content.querySelector('td, th') : null;
    if (cell) {
      const rect = cell.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    const inline = content.querySelector('.bn-inline-content');
    let rect = content.getBoundingClientRect();
    if (inline) {
      const range = document.createRange(); range.selectNodeContents(inline);
      rect = [...range.getClientRects()].find(item => item.width > 0 && item.height > 0) ?? inline.getBoundingClientRect();
    }
    return { x: rect.x + Math.min(12, rect.width / 2), y: rect.y + Math.min(12, rect.height / 2) };
  }, id);
}
async function hoverBlock(id) {
  const point = await pointFor(id);
  await page.mouse.move(point.x, point.y);
  await settle();
  await page.waitForSelector('.goose-block-handle [aria-label="块操作"]', { state: 'visible', timeout: 1500 });
}
async function away() {
  await page.mouse.move(2, 2);
  await pause(350);
}
async function beginTrace(id, type) {
  await page.evaluate(({ id, type }) => {
    const root = window.__gooseNoteEditor.prosemirrorView.dom;
    const selector = type === 'image' ? `[data-goose-image-toolbar][data-goose-block-id="${id}"]`
      : type === 'codeBlock' ? `[data-id="${id}"] .goose-code-hover-actions`
        : type === 'file' ? `[data-id="${id}"] .goose-file-block-actions`
          : '.goose-table-chrome-left, .goose-table-chrome-top';
    const visible = element => {
      if (!element || !element.getBoundingClientRect().width || !element.getBoundingClientRect().height) return false;
      for (let node = element; node instanceof Element; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < .01) return false;
      }
      return true;
    };
    const trace = { events: [], pointerEvents: [], domHandleAt: null, domToolbarAt: null, prematureDomToolbar: false,
      domSamples: 0, running: true, paintVerified: false,
      raf: { startedAt: performance.now(), firstFrameDelayMs: null, intervalsMs: [] } };
    const listener = event => trace.events.push({ ...event.detail, at: performance.now() });
    let pointerInside = false;
    const pointer = event => {
      const container = event.target instanceof Element ? event.target.closest('[data-node-type="blockContainer"]') : null;
      const inside = !!container && root.contains(container) && container.dataset.id === id;
      if (inside !== pointerInside) trace.pointerEvents.push({ kind: inside ? 'enter' : 'leave', at: performance.now(),
        trusted: event.isTrusted, x: event.clientX, y: event.clientY });
      pointerInside = inside;
    };
    root.addEventListener('goose:block-hover', listener);
    document.addEventListener('pointermove', pointer, true);
    let timer, frame, lastFrame;
    trace.stop = () => {
      trace.running = false; clearTimeout(timer); cancelAnimationFrame(frame);
      root.removeEventListener('goose:block-hover', listener);
      document.removeEventListener('pointermove', pointer, true);
    };
    const sample = () => {
      if (!trace.running) return;
      trace.domSamples++;
      const now = performance.now();
      const target = root.querySelector(`[data-node-type="blockOuter"][data-id="${id}"]`);
      const phase = target?.dataset.gooseBlockHover;
      if (phase && visible(document.querySelector('.goose-block-handle [aria-label="块操作"]')) && trace.domHandleAt === null) trace.domHandleAt = now;
      if ([...document.querySelectorAll(selector)].some(visible)) {
        if (trace.domToolbarAt === null) trace.domToolbarAt = now;
        if (phase !== 'toolbar') trace.prematureDomToolbar = true;
      }
      timer = setTimeout(sample, 16);
    };
    const sampleFrame = now => {
      if (!trace.running) return;
      if (trace.raf.firstFrameDelayMs === null) trace.raf.firstFrameDelayMs = now - trace.raf.startedAt;
      if (lastFrame !== undefined) trace.raf.intervalsMs.push(now - lastFrame);
      lastFrame = now;
      frame = requestAnimationFrame(sampleFrame);
    };
    window.__blockCoverageTrace = trace;
    timer = setTimeout(sample, 16);
    frame = requestAnimationFrame(sampleFrame);
  }, { id, type });
}
async function endTrace() {
  return page.evaluate(() => {
    const trace = window.__blockCoverageTrace; trace.stop();
    const { stop, running, ...result } = trace;
    const intervals = [...trace.raf.intervalsMs].sort((a, b) => a - b);
    result.raf.sampleCount = intervals.length;
    result.raf.intervalP95Ms = intervals.length ? intervals[Math.floor(intervals.length * .95)] : null;
    result.raf.status = intervals.length ? 'recorded-without-performance-verdict' : 'insufficient-interval-samples';
    delete window.__blockCoverageTrace;
    return result;
  });
}
async function rawMouseMove(x, y) {
  await page.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0, pointerType: 'mouse' });
}
async function rapidLeave(point) {
  await rawMouseMove(point.x, point.y);
  await new Promise(resolve => setTimeout(resolve, 20));
  await rawMouseMove(2, 2);
}
async function viewport(width, height) {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await settle();
}
async function menuBounds() {
  return page.evaluate(() => {
    const menu = document.querySelector('[data-goose-block-handle-menu]');
    const rect = menu?.getBoundingClientRect();
    return { rect: rect?.toJSON(), fits: !!rect && rect.left >= 7 && rect.top >= 7 && rect.right <= innerWidth - 7 && rect.bottom <= innerHeight - 7 };
  });
}
