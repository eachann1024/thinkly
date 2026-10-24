const fs = await import('node:fs');
const task = await taskSpace(verificationConfig.task ? Number(verificationConfig.task) : 'Thinkly 块交互验收');
const page = task.page(verificationConfig.page || 'p1');
const proof = { checks: [], metrics: {}, stage: 'navigation' };
const check = (name, passed, detail) => {
  proof.checks.push({ name, passed: Boolean(passed), detail });
  console.log(`${passed ? '✓' : '✗'} ${name}`);
};
const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const blockSelector = id => `[data-node-type="blockContainer"][data-id="${id}"]`;
async function seed(blocks) {
  await page.keyboard.press('Escape');
  await page.mouse.move(1100, 700);
  await page.evaluate(blocks => { const e = window.__gooseNoteEditor; e.replaceBlocks(e.document, blocks); }, blocks);
  await settle();
}
async function hover(id) {
  const selector = `${blockSelector(id)} > .bn-block-content`;
  await page.hover(selector);
  const rect = await page.evaluate(id => {
    const content = document.querySelector(`[data-node-type="blockContainer"][data-id="${id}"] > .bn-block-content`);
    const inline = content.querySelector('.bn-inline-content');
    return (inline ?? content).getBoundingClientRect().toJSON();
  }, id);
  await page.mouse.move(rect.x + Math.min(45, rect.width / 2), rect.y + Math.min(14, rect.height / 2));
  await settle();
}
async function drag(sourceId, targetId, side = 'right') {
  await hover(sourceId);
  const handle = await page.evaluate(() => document.querySelector('[aria-label="块操作"]')?.getBoundingClientRect().toJSON());
  if (!handle) throw new Error(`No handle for ${sourceId}`);
  const target = await page.evaluate(id => document.querySelector(`[data-node-type="blockContainer"][data-id="${id}"]`).getBoundingClientRect().toJSON(), targetId);
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 12, handle.y + handle.height / 2, { steps: 4 });
  await page.mouse.move(side === 'right' ? target.right - 4 : target.left + 4, target.top + Math.min(15, target.height / 2), { steps: 30 });
  await settle();
  const indicator = await page.evaluate(() => !!document.querySelector('.goose-column-drop-indicator'));
  await page.mouse.up();
  await settle();
  return indicator;
}
try {
  await page.goto(`${verificationConfig.origin || 'http://127.0.0.1:6001'}/?caret-gallery=1&caret-menu=1`);
  await page.waitForFunction(() => !!window.__gooseNoteEditor, undefined, { timeout: 15000 });
  proof.stage = 'seed';
  await seed([{ id: 'eval-a', type: 'paragraph', content: '左栏内容' }, { id: 'eval-b', type: 'paragraph', content: '拖动内容' }, { id: 'eval-c', type: 'paragraph', content: '末尾内容' }]);
  proof.stage = 'handle hover';
  await hover('eval-b');
  const handle = await page.evaluate(() => ({ count: document.querySelectorAll('.bn-side-menu [aria-label="块操作"]').length, plus: !!document.querySelector('.bn-side-menu [aria-label="添加块"]'), rect: document.querySelector('.goose-block-handle')?.getBoundingClientRect().toJSON() }));
  check('非空块只有类型把手，位置与当前块对齐', handle.count === 1 && !handle.plus && handle.rect?.top > 100, handle);
  await page.click('[aria-label="块操作"]');
  await page.waitForSelector('[data-goose-block-handle-menu]', { state: 'visible' });
  check('单击把手打开当前块菜单', await page.evaluate(() => document.querySelector('[data-goose-block-handle-menu]')?.dataset.gooseBlockHandleMenu === 'eval-b'));
  await page.keyboard.press('Escape');
  await settle();
  check('Escape 关闭菜单', await page.evaluate(() => !document.querySelector('[data-goose-block-handle-menu]')));
  proof.metrics.control = await page.evaluate(() => new Promise(resolve => {
    const frames = []; let last = performance.now(); const start = last;
    function frame(now) { frames.push(now - last); last = now;
      if (now - start < 500) requestAnimationFrame(frame);
      else resolve({ frames, visible: document.visibilityState, focused: document.hasFocus() }); }
    requestAnimationFrame(frame);
  }));
  await page.evaluate(() => {
    window.__blockPerf = { frames: [], longTasks: [], dragEvents: [], events: [] };
    let last = performance.now(); window.__blockPerfRun = true;
    function frame(now) { if (!window.__blockPerfRun) return; window.__blockPerf.frames.push(now - last); last = now; requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
    window.__blockObserver = new PerformanceObserver(list => window.__blockPerf.longTasks.push(...list.getEntries().map(e => e.duration)));
    window.__blockObserver.observe({ type: 'longtask', buffered: false });
    for (const type of ['dragstart', 'drop', 'dragend']) window.addEventListener(type, () => window.__blockPerf.dragEvents.push(type), { once: true, capture: true });
    window.__dragTiming = event => {
      if (!window.__blockPerfRun) return;
      const entry = { type: event.type, at: performance.now() };
      window.__blockPerf.events.push(entry);
      if (event.type === 'dragover' || event.type === 'drop') requestAnimationFrame(() => {
        entry.frameLatency = performance.now() - entry.at;
        entry.indicator = !!document.querySelector('.goose-column-drop-indicator');
      });
    };
    for (const type of ['dragstart', 'dragover', 'drop', 'dragend']) window.addEventListener(type, window.__dragTiming, true);
  });
  proof.stage = 'native drag';
  const indicator = await drag('eval-b', 'eval-a');
  const columnResult = await page.evaluate(() => {
    const e = window.__gooseNoteEditor; window.__blockPerfRun = false; window.__blockObserver.disconnect();
    for (const type of ['dragstart', 'dragover', 'drop', 'dragend']) window.removeEventListener(type, window.__dragTiming, true);
    return { doc: e.document, perf: window.__blockPerf, clean: !document.querySelector('.goose-column-drop-indicator') };
  });
  const layout = columnResult.doc[0];
  check('原生鼠标右拖显示落点并创建两栏', indicator && layout.type === 'columnLayout' && layout.children.length === 2, columnResult.doc);
  check('拖动保持块 ID 与顺序且结束清理指示器', layout.children?.[0]?.children?.[0]?.id === 'eval-a' && layout.children?.[1]?.children?.[0]?.id === 'eval-b' && columnResult.clean);
  check('原生 dragstart/drop/dragend 链路完整', ['dragstart', 'drop', 'dragend'].every(t => columnResult.perf.dragEvents.includes(t)), columnResult.perf.dragEvents);
  const frames = columnResult.perf.frames.filter(t => t > 0).sort((a, b) => a - b);
  proof.metrics.drag = { samples: frames.length, frameP95Ms: frames[Math.floor(frames.length * .95)], frames, longTasks: columnResult.perf.longTasks, events: columnResult.perf.events };
  check('本次拖动帧间隔 P95 小于 34ms，无超过 50ms 长任务', frames.length >= 10 && proof.metrics.drag.frameP95Ms < 34 && !columnResult.perf.longTasks.length, proof.metrics.drag);
  await page.keyboard.press('Meta+z'); await settle();
  const undone = await page.evaluate(() => window.__gooseNoteEditor.document);
  check('一次键盘撤销还原三个块', undone.map(b => b.id).join(',') === 'eval-a,eval-b,eval-c', undone);
  await page.keyboard.press('Meta+Shift+z'); await settle();
  check('键盘重做恢复分栏', await page.evaluate(() => window.__gooseNoteEditor.document[0].type === 'columnLayout'));
  const section = await page.evaluate(() => window.__gooseNoteEditor.document[0].children[1].id);
  await drag('eval-c', section);
  check('原生拖动扩展已有分栏', await page.evaluate(() => window.__gooseNoteEditor.document[0].children.length === 3));
  proof.stage = 'empty paragraph';
  await seed([{ id: 'empty', type: 'paragraph', content: [] }]);
  await hover('empty');
  check('空段显示加号且普通悬停无背景', await page.evaluate(() => !!document.querySelector('[aria-label="添加块"]') && !document.querySelector('[data-goose-empty-handle-hover]')));
  await page.hover('[aria-label="添加块"]');
  await page.waitForFunction(() => !!document.querySelector('[data-goose-empty-handle-hover]'), undefined, { timeout: 2000 });
  await page.waitForSelector('[data-notion-slash-root]', { state: 'visible', timeout: 3000 });
  check('悬停加号打开插入菜单并复用空段', await page.evaluate(() => window.__gooseNoteEditor.document.length === 1 && !!document.querySelector('[data-goose-empty-handle-hover]')));
} catch (error) {
  check('浏览器流程完整执行', false, `${proof.stage}: ${String(error)}`);
} finally {
  fs.writeFileSync('/tmp/thinkly-block-handles-browser.json', JSON.stringify(proof, null, 2));
  if (!verificationConfig.task) await task.finish({ keep: [] });
}
