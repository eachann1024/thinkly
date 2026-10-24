const fs = await import('node:fs');
const task = await taskSpace(verificationConfig.task ? Number(verificationConfig.task) : 'Thinkly 转换菜单验收');
const page = task.page('p1');
const proof = { checks: [] };
const check = (name, passed, detail) => {
  proof.checks.push({ name, passed: Boolean(passed), detail });
  console.log(`${passed ? '✓' : '✗'} ${name}`);
};
const ordinary = ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'callout'];
try {
  await page.goto(`${verificationConfig.origin || 'http://127.0.0.1:6001'}/?caret-gallery=1&caret-menu=1`);
  await page.waitForFunction(() => !!window.__gooseNoteEditor, undefined, { timeout: 20000 });
  for (const type of verificationConfig.types ?? [...ordinary, 'codeBlock', 'table', 'image', 'video', 'audio', 'file', 'divider']) {
    await seedType(type);
    await hoverBlock(`cov-${type}`);
    await page.click('.goose-block-handle [aria-label="块操作"]');
    await page.waitForSelector(`[data-goose-block-handle-menu="cov-${type}"]`, { state: 'visible', timeout: 2500 });
    const texts = await page.evaluate(id => [...document.querySelectorAll(`[data-goose-block-handle-menu="${id}"] [role="menuitem"]`)]
      .map(item => item.textContent.trim()), `cov-${type}`);
    check(`${type} 真实把手菜单${ordinary.includes(type) ? '保留' : '隐藏'}转换入口`, texts.includes('转换为') === ordinary.includes(type), texts);
    if (type === 'paragraph') {
      await page.hover('[data-goose-block-handle-menu="cov-paragraph"] [role="menuitem"]:text-is("转换为")');
      await page.click('[data-goose-block-handle-menu="cov-paragraph"] [role="menuitem"]:text-is("二级标题")');
      await page.waitForFunction(() => window.__gooseNoteEditor.getBlock('cov-paragraph')?.type === 'heading', undefined, { timeout: 2000 });
      const result = await page.evaluate(() => window.__gooseNoteEditor.getBlock('cov-paragraph'));
      check('普通正文通过真实菜单转换为二级标题且保留文字', result.props.level === 2 && JSON.stringify(result.content).includes('覆盖验收正文'), result);
    }
    await page.keyboard.press('Escape');
  }
} catch (error) {
  check('转换菜单浏览器流程完整执行', false, String(error));
} finally {
  fs.writeFileSync(verificationConfig.proofPath, JSON.stringify(proof, null, 2));
  if (!verificationConfig.task && proof.checks.every(item => item.passed)) await task.finish({ keep: [] });
}
