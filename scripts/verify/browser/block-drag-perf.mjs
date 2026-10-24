const fs = await import('node:fs');
const task = await taskSpace(verificationConfig.task ? Number(verificationConfig.task) : 'Thinkly 持续原生拖动性能');
const page = task.page(verificationConfig.page || 'p1');
const proofPath = '/tmp/thinkly-block-drag-perf.json';
const proof = { checks: [], metrics: {}, stage: 'navigation', measurement: 'native-drag-active-scope', paintVerified: false };
const save = () => fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
const check = (name, passed, detail) => {
  proof.checks.push({ name, passed: Boolean(passed), detail });
  save(); console.log(`${passed ? '✓' : '✗'} ${name}`);
};
try {
  await page.goto(`${verificationConfig.origin || 'http://127.0.0.1:6011'}/?caret-gallery=1&caret-menu=1`);
  await page.waitForFunction(() => !!window.__gooseNoteEditor, undefined, { timeout: 15000 });
  await viewport(1280, 900);
  await seed([{ id: 'perf-a', type: 'paragraph', content: '持续拖动性能落点正文 target' },
    { id: 'perf-b', type: 'paragraph', content: '持续原生拖动正文 source' },
    { id: 'perf-c', type: 'paragraph', content: '保留末尾正文 tail' }]);
  await hoverBlock('perf-b');
  const rects = await page.evaluate(() => ({
    handle: document.querySelector('.goose-block-handle [aria-label="块操作"]').getBoundingClientRect().toJSON(),
    target: document.querySelector('[data-node-type="blockContainer"][data-id="perf-a"]').getBoundingClientRect().toJSON(),
  }));
  await page.evaluate(() => {
    const perf = { events: [], scopeStart: null, scopeEnd: null, frameTimes: [], frameIntervalsMs: [],
      boundaryGapsMs: [], longTasks: [], indicatorSeen: false, longTaskSupported: false };
    const listeners = [];
    for (const type of ['dragstart', 'dragover', 'drop', 'dragend']) {
      const listener = event => perf.events.push({ type, at: performance.now(), trusted: event.isTrusted,
        x: event.clientX, y: event.clientY });
      document.addEventListener(type, listener, true); listeners.push([type, listener]);
    }
    let observer, frame, timer, lastFrame;
    if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      observer = new PerformanceObserver(list => perf.longTasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration }))));
      observer.observe({ type: 'longtask', buffered: false }); perf.longTaskSupported = true;
    }
    perf.startScope = () => {
      perf.scopeStart = performance.now();
      const sampleFrame = timestamp => {
        const now = performance.now();
        if (perf.scopeEnd !== null) return;
        if (lastFrame === undefined) perf.boundaryGapsMs.push(now - perf.scopeStart);
        else perf.frameIntervalsMs.push(now - lastFrame);
        perf.frameTimes.push({ at: now, rafTimestamp: timestamp }); lastFrame = now;
        frame = requestAnimationFrame(sampleFrame);
      };
      const sampleIndicator = () => {
        if (perf.scopeEnd !== null) return;
        perf.indicatorSeen ||= !!document.querySelector('.goose-column-drop-indicator');
        timer = setTimeout(sampleIndicator, 16);
      };
      frame = requestAnimationFrame(sampleFrame); timer = setTimeout(sampleIndicator, 16);
    };
    perf.endScope = () => {
      if (perf.scopeStart === null || perf.scopeEnd !== null) return;
      perf.scopeEnd = performance.now();
      perf.boundaryGapsMs.push(perf.scopeEnd - (lastFrame ?? perf.scopeStart));
      perf.indicatorSeen ||= !!document.querySelector('.goose-column-drop-indicator');
      cancelAnimationFrame(frame); clearTimeout(timer);
    };
    perf.stop = () => {
      perf.endScope();
      if (observer) {
        perf.longTasks.push(...observer.takeRecords().map(entry => ({ start: entry.startTime, duration: entry.duration })));
        observer.disconnect();
      }
      for (const [type, listener] of listeners) document.removeEventListener(type, listener, true);
    };
    window.__nativeDragPerf = perf;
  });
  proof.stage = 'native drag start';
  const start = { x: rects.handle.x + rects.handle.width / 2, y: rects.handle.y + rects.handle.height / 2 };
  const initial = { x: start.x + 12, y: start.y };
  const target = { x: rects.target.right - 4, y: rects.target.top + Math.min(15, rects.target.height / 2) };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(initial.x, initial.y, { steps: 4 });
  const nativeStart = await page.evaluate(() => window.__nativeDragPerf.events.some(event => event.type === 'dragstart' && event.trusted));
  check('把手真实鼠标启动可信原生dragstart', nativeStart);
  if (!nativeStart) throw new Error('未启动原生拖动，停止性能采样，不替换为合成拖动');
  proof.stage = 'continuous raw CDP drag';
  await page.evaluate(() => window.__nativeDragPerf.startScope());
  const commands = [], driverStart = Date.now();
  for (let index = 0; index < 51; index++) {
    // Never bunch delayed commands to catch up with an old schedule.
    const due = commands.length ? driverStart + commands.at(-1).sentAtMs + 20 : driverStart;
    if (due > Date.now()) await new Promise(resolve => setTimeout(resolve, due - Date.now()));
    const progress = index / 50;
    const point = { x: initial.x + (target.x - initial.x) * progress, y: initial.y + (target.y - initial.y) * progress };
    const sentAtMs = Date.now() - driverStart;
    await page.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point, button: 'none', buttons: 1, pointerType: 'mouse' });
    commands.push({ index, sentAtMs, completedAtMs: Date.now() - driverStart, ...point });
  }
  await page.evaluate(() => window.__nativeDragPerf.endScope());
  const commandIntervalsMs = commands.slice(1).map((command, index) => command.sentAtMs - commands[index].sentAtMs);
  const cadenceValid = commandIntervalsMs.every(interval => interval >= 16 && interval <= 25);
  proof.metrics.driver = { requestedIntervalMs: 20, requestedDurationMs: 1000, actualDurationMs: Date.now() - driverStart,
    commandIntervalsMs, cadenceValid, commands };
  save();
  proof.stage = 'native drop';
  // Synchronize EGO's mouse state once after the measured raw-input interval, then release normally.
  await page.mouse.move(target.x, target.y);
  await page.mouse.up();
  await settle();
  const result = await page.evaluate(() => {
    const perf = window.__nativeDragPerf; perf.stop();
    const { startScope, endScope, stop, ...result } = perf;
    result.clean = !document.querySelector('.goose-column-drop-indicator');
    result.document = window.__gooseNoteEditor.document;
    return result;
  });
  proof.metrics.activeDrag = result;
  const active = result.events.filter(event => event.trusted && event.type === 'dragover' && event.at >= result.scopeStart && event.at <= result.scopeEnd);
  const spread = active.length > 1 ? active.at(-1).at - active[0].at : 0;
  const duration = result.scopeEnd - result.scopeStart;
  const continuous = commands.length === 51 && cadenceValid && duration >= 900 && duration < 1700 && active.length >= 20 && spread >= 700;
  check('raw CDP与原生拖动兼容，可信dragover分布在持续约1秒区间', continuous,
    { commandCount: commands.length, durationMs: duration, commandIntervalsMs, cadenceValid,
      trustedDragovers: active.length, dragoverSpreadMs: spread });
  const intervals = [...result.frameIntervalsMs, ...result.boundaryGapsMs].sort((a, b) => a - b);
  const p95 = intervals.length ? intervals[Math.floor(intervals.length * .95)] : null;
  proof.metrics.frames = { scopeStart: result.scopeStart, scopeEnd: result.scopeEnd, samples: result.frameTimes.length,
    intervalP95Ms: p95, maxObservedGapMs: intervals.length ? Math.max(...intervals) : null,
    allScopedIntervalsMs: result.frameIntervalsMs, boundaryGapsMs: result.boundaryGapsMs,
    note: 'Only active raw-input scope; boundary gaps retained; no slow frame removed; rAF is not paint-complete proof.' };
  check('持续原生拖动期间至少30个rAF样本且间隔P95小于34ms', continuous && result.frameTimes.length >= 30 && p95 !== null && p95 < 34, proof.metrics.frames);
  const longTasks = result.longTasks.filter(entry => entry.start < result.scopeEnd && entry.start + entry.duration > result.scopeStart);
  check('持续拖动区间没有超过50ms长任务', result.longTaskSupported && !longTasks.some(entry => entry.duration > 50), { supported: result.longTaskSupported, longTasks });
  check('原生拖动落点指示器实际出现且结束后清理', result.indicatorSeen && result.clean, { appeared: result.indicatorSeen, clean: result.clean });
  check('原生drop和dragend可信且实际完成分栏落点', ['drop', 'dragend'].every(type => result.events.some(event => event.type === type && event.trusted)) && result.document[0]?.type === 'columnLayout', result.events.filter(event => event.type !== 'dragover'));
} catch (error) {
  check('持续原生拖动性能流程完成；不兼容时保留失败证据', false, `${proof.stage}: ${String(error)}`);
} finally {
  await page.mouse.up().catch(() => {});
  await page.evaluate(() => window.__nativeDragPerf?.stop()).catch(() => {});
  await page.cdp('Emulation.clearDeviceMetricsOverride').catch(() => {});
  save();
  if (!verificationConfig.task) await task.finish({ keep: [] });
}
