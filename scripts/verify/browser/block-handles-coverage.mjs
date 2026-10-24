const fs = await import('node:fs');
const task = await taskSpace(verificationConfig.task ? Number(verificationConfig.task) : 'Thinkly 全块把手覆盖验收');
const page = task.page(verificationConfig.page || 'p1');
const sequenceOnly = verificationConfig.scope !== 'all';
const proof = { checks: [], metrics: {}, stage: 'navigation', scope: verificationConfig.scope,
  selectedSequenceCases: verificationConfig.sequenceCases, paintVerified: false };
const saveProof = () => fs.writeFileSync(verificationConfig.proofPath, JSON.stringify(proof, null, 2));
const check = (name, passed, detail) => {
  proof.checks.push({ name, passed: Boolean(passed), detail });
  saveProof();
  console.log(`${passed ? '✓' : '✗'} ${name}`);
};
try {
  await page.goto(`${verificationConfig.origin || 'http://127.0.0.1:6001'}/?caret-gallery=1&caret-menu=1`);
  await page.waitForFunction(() => !!window.__gooseNoteEditor, undefined, { timeout: 15000 });
  await viewport(1280, 900);
  if (!sequenceOnly) {
  const registered = await page.evaluate(() => Object.keys(window.__gooseNoteEditor.schema.blockSchema).sort());
  check('覆盖表与实际已注册的17种块一致', JSON.stringify(registered) === JSON.stringify([...coverageTypes].sort()), registered);
  for (const type of coverageTypes.filter(type => type !== 'columnSection')) {
    proof.stage = `visible ${type}`;
    try {
      await seedType(type);
      await hoverBlock(`cov-${type}`);
      const handle = await page.evaluate(id => {
        const button = document.querySelector('.goose-block-handle [aria-label="块操作"]');
        const container = document.querySelector(`[data-node-type="blockContainer"][data-id="${id}"]`);
        const content = [...container.querySelectorAll('.bn-block-content')]
          .find(node => node.closest('[data-node-type="blockContainer"]') === container);
        const rect = button?.getBoundingClientRect(), target = content?.getBoundingClientRect();
        return { icons: button?.querySelectorAll('svg').length, count: document.querySelectorAll('.goose-block-handle [aria-label="块操作"]').length,
          plus: !!document.querySelector('.goose-block-handle [aria-label="添加块"]'), rect: rect?.toJSON(), target: target?.toJSON(),
          active: container?.closest('[data-node-type="blockOuter"]')?.dataset.gooseBlockHover,
          wrapper: content?.parentElement?.className };
      }, `cov-${type}`);
      check(`${type} 显示单一类型图标和六点把手`, handle.count === 1 && handle.icons === 2 && !handle.plus && handle.active && handle.rect?.height > 0, handle);
      await page.click('.goose-block-handle [aria-label="块操作"]');
      await page.waitForSelector('[data-goose-block-handle-menu]', { state: 'visible', timeout: 2000 });
      await settle();
      const menu = await page.evaluate(id => {
        const root = document.querySelector('[data-goose-block-handle-menu]');
        return { target: root?.dataset.gooseBlockHandleMenu, items: root?.querySelectorAll('[role="menuitem"]').length,
          owner: root?.dataset.gooseEditorOwner, suppressed: document.querySelector(`[data-node-type="blockOuter"][data-id="${id}"]`)?.dataset.gooseBlockToolsSuppressed };
      }, `cov-${type}`);
      check(`${type} 点击菜单归属于当前块并锁住工具栏`, menu.target === `cov-${type}` && menu.items >= 4 && !!menu.owner && menu.suppressed === 'true', menu);
      await page.mouse.move(2, 2);
      check(`${type} 菜单期间目标保持`, await page.evaluate(id => document.querySelector('[data-goose-block-handle-menu]')?.dataset.gooseBlockHandleMenu === id, `cov-${type}`));
      if (type === 'columnLayout') {
        const section = await page.evaluate(() => ({
          hidden: [...document.querySelectorAll('.bn-block-content[data-content-type="columnSection"]')].every(node => getComputedStyle(node).display === 'none'),
          count: window.__gooseNoteEditor.document.find(block => block.type === 'columnLayout')?.children.length,
          independent: !!document.querySelector('[data-goose-block-handle-menu="cov-section-a"]'),
        }));
        check('columnSection 保留为两列隐藏结构且不显示独立把手菜单', section.count === 2 && section.hidden && !section.independent, section);
        await page.keyboard.press('Escape');
        await hoverBlock('cov-child-a');
        await page.click('.goose-block-handle [aria-label="块操作"]');
        check('分栏正文仍打开自身把手菜单', await page.evaluate(() => document.querySelector('[data-goose-block-handle-menu]')?.dataset.gooseBlockHandleMenu === 'cov-child-a'));
      }
      await page.keyboard.press('Escape');
      await settle();
      check(`${type} Escape 关闭菜单`, await page.evaluate(() => !document.querySelector('[data-goose-block-handle-menu]')));
    } catch (error) { check(`${type} 实际鼠标流程完成`, false, String(error)); }
  }
  }
  for (const selection of verificationConfig.sequenceCases) {
    const { type } = selection;
    proof.stage = `sequence ${type}`;
    try {
      await seedType(type);
      const point = await pointFor(`cov-${type}`);
      await away();
      if (selection.steady) {
      await beginTrace(`cov-${type}`, type);
      await page.mouse.move(point.x, point.y);
      await pause(450);
      const trace = await endTrace();
      proof.metrics[type] = trace;
      const handle = trace.events.find(event => event.blockId === `cov-${type}` && event.phase === 'handle');
      const toolbar = trace.events.find(event => event.blockId === `cov-${type}` && event.phase === 'toolbar');
      check(`${type} DOM状态先把手后200ms工具栏且无提前可见`, !!handle && !!toolbar && toolbar.at - handle.at >= 190 &&
        toolbar.at - handle.at < 450 && trace.domHandleAt !== null && trace.domToolbarAt !== null &&
        trace.domToolbarAt > trace.domHandleAt && trace.domToolbarAt - handle.at >= 190 && !trace.prematureDomToolbar, trace);
      }
      if (selection.cancel) {
      await away();
      await beginTrace(`cov-${type}`, type);
      await rapidLeave(point);
      await pause(350);
      const cancelled = await endTrace();
      proof.metrics[`${type}Cancelled`] = cancelled;
      const enter = cancelled.pointerEvents.find(event => event.kind === 'enter');
      const leave = cancelled.pointerEvents.find(event => event.kind === 'leave' && event.at >= enter?.at);
      cancelled.actualHoverMs = enter && leave ? leave.at - enter.at : null;
      check(`${type} 真实鼠标快速离开取消待出现的工具栏`, !!enter?.trusted && !!leave?.trusted && cancelled.actualHoverMs >= 0 &&
        cancelled.actualHoverMs < 80 && cancelled.events.some(event => event.blockId === `cov-${type}` && event.phase === 'handle') &&
        !cancelled.events.some(event => event.blockId === `cov-${type}` && event.phase === 'toolbar') && cancelled.domToolbarAt === null, cancelled);
      }
    } catch (error) { check(`${type} 工具栏实际悬停流程完成`, false, String(error)); }
  }
  if (!sequenceOnly) {
  proof.stage = 'narrow menu';
  await viewport(360, 640);
  await seedType('paragraph');
  await hoverBlock('cov-paragraph');
  await page.click('.goose-block-handle [aria-label="块操作"]');
  await page.waitForSelector('[data-goose-block-handle-menu]', { state: 'visible', timeout: 2000 });
  await settle();
  const narrowMenu = await menuBounds();
  check('窄窗口菜单自动避让并保持在可视范围内', narrowMenu.fits, narrowMenu);
  await page.keyboard.press('Escape');
  proof.stage = 'empty hover insertion';
  await seed([{ id: 'cov-empty', type: 'paragraph', content: [] }]);
  const emptyPoint = await pointFor('cov-empty');
  await page.mouse.move(emptyPoint.x, emptyPoint.y);
  await settle();
  check('窄窗口空行仅显示加号，普通正文悬停无背景', await page.evaluate(() => !!document.querySelector('.goose-block-handle [aria-label="添加块"]') &&
    !document.querySelector('.goose-block-handle [aria-label="块操作"]') && !document.querySelector('[data-goose-empty-handle-hover]')));
  await page.hover('.goose-block-handle [aria-label="添加块"]');
  await page.waitForSelector('[data-notion-slash-root]', { state: 'visible', timeout: 2000 });
  const emptyMenu = await page.evaluate(() => {
    const slash = document.querySelector('[data-notion-slash-root]'), rect = slash?.getBoundingClientRect();
    const editor = window.__gooseNoteEditor;
    return { count: editor.document.length, id: editor.getTextCursorPosition().block.id,
      highlighted: !!document.querySelector('[data-node-type="blockOuter"][data-id="cov-empty"][data-goose-empty-handle-hover="true"]'),
      background: getComputedStyle(document.querySelector('[data-node-type="blockContainer"][data-id="cov-empty"] .bn-block-content')).backgroundColor,
      focused: editor.prosemirrorView.dom.contains(document.activeElement),
      fits: !!rect && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight };
  });
  check('加号悬停打开既有插入菜单，复用空段并保持焦点与高亮', emptyMenu.count === 1 && emptyMenu.id === 'cov-empty' && emptyMenu.highlighted && emptyMenu.focused, emptyMenu);
  check('空段外层Decoration实际使正文背景显色', emptyMenu.background !== 'rgba(0, 0, 0, 0)' && emptyMenu.background !== 'transparent', emptyMenu.background);
  check('窄窗口插入菜单保持在可视范围', emptyMenu.fits, emptyMenu);
  await page.hover('[data-notion-slash-root]');
  await pause(220);
  check('鼠标可从加号进入插入菜单且目标保持', await page.evaluate(() => !!document.querySelector('[data-notion-slash-root]') && !!document.querySelector('[data-goose-empty-handle-hover]')));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await away();
  check('插入菜单支持键盘关闭并清除空行高亮', await page.evaluate(() => !document.querySelector('[data-notion-slash-root]') && !document.querySelector('[data-goose-empty-handle-hover]')));
  await page.mouse.move(emptyPoint.x, emptyPoint.y);
  await settle();
  await page.click('.goose-block-handle [aria-label="添加块"]');
  await page.waitForSelector('[data-notion-slash-root]', { state: 'visible', timeout: 2000 });
  check('空行加号点击也打开同一插入菜单', await page.evaluate(() => window.__gooseNoteEditor.document.length === 1 && !!document.querySelector('[data-notion-slash-root]')));
  await page.keyboard.press('Escape');
  proof.stage = 'reduced motion';
  await page.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await seedType('paragraph');
  await hoverBlock('cov-paragraph');
  const reduced = await page.evaluate(() => ({ enabled: matchMedia('(prefers-reduced-motion: reduce)').matches,
    durations: getComputedStyle(document.querySelector('.goose-block-handle')).transitionDuration.split(',').map(Number.parseFloat) }));
  check('reduced-motion 下把手无过渡动画且仍可操作', reduced.enabled && reduced.durations.every(duration => duration === 0), reduced);
  await page.click('.goose-block-handle [aria-label="块操作"]');
  await page.waitForSelector('[data-goose-block-handle-menu="cov-paragraph"]', { state: 'visible', timeout: 2000 });
  check('reduced-motion 下点击仍能打开块菜单', await page.evaluate(() => !!document.querySelector('[data-goose-block-handle-menu="cov-paragraph"]')));
  }
} catch (error) {
  check('全块覆盖浏览器流程完整执行', false, `${proof.stage}: ${String(error)}`);
} finally {
  await page.evaluate(() => window.__blockCoverageTrace?.stop()).catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  await page.cdp('Emulation.setEmulatedMedia', { features: [] }).catch(() => {});
  await page.cdp('Emulation.clearDeviceMetricsOverride').catch(() => {});
  saveProof();
  if (!verificationConfig.task) await task.finish({ keep: [] });
}
