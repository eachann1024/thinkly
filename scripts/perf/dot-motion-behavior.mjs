export async function verifyDotMotion(page, dotInput) {
const checks = [];
const check = (label, ok, detail) => checks.push({ label, ok: Boolean(ok), detail });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = async (predicate) => page.waitForFunction(predicate, undefined, { timeout: 3000 }).then(() => true, () => false);
const install = async (css) => page.evaluate((text) => {
  document.getElementById("dot-verify-style")?.remove();
  const style = document.createElement("style");
  style.id = "dot-verify-style";
  style.textContent = text;
  document.head.append(style);
}, css);
try {
  await install(dotInput.before);
  const geometry = await page.evaluate(() => [...document.querySelectorAll("button,input")].map((node) => {
    const { x, y, width, height } = node.getBoundingClientRect();
    return { x, y, width, height };
  }));
  await install(dotInput.after);
  await sleep(700);
  check("现有按钮与输入框位置、尺寸完全一致", await page.evaluate((before) => {
    const after = [...document.querySelectorAll("button,input")].map((node) => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height };
    });
    return before.length > 0 && JSON.stringify(before) === JSON.stringify(after);
  }, geometry));
  const fixture = await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "dot-verify-fixture";
    host.style.cssText = "position:fixed;left:0;top:0;pointer-events:none";
    const roots = ["main", "small", "corner"];
    const loops = ["breathe", "ripple", "glint", "flow", "wave", "progress", "alert"];
    host.innerHTML = roots.map((size) => `<svg class="goose-dm goose-dm-${size}" data-dm-phase="in" data-dm-played width="40" height="40" viewBox="0 0 40 40">${loops.map((loop) => `<g class="goose-dm-${loop}"><circle cx="20" cy="20" r="2"/></g>`).join("")}</svg>`).join("");
    document.body.append(host);
    const all = [...host.querySelectorAll("svg,g")];
    const result = all.map((node) => {
      const animations = node.getAnimations().filter((animation) => animation.animationName !== "goose-dm-shake");
      const loop = animations[0];
      if (!loop) return { name: node.getAttribute("class"), valid: false };
      const { duration, iterations } = loop.effect.getTiming();
      loop.pause();
      const values = [];
      for (let index = 0; index < 16; index++) {
        loop.currentTime = Number(duration) * index / 16;
        const style = getComputedStyle(node);
        values.push(`${style.opacity}:${style.transform}`);
      }
      return {
        name: node.getAttribute("class"),
        valid: iterations === Infinity && new Set(values).size > 1
          && getComputedStyle(node).animationTimingFunction.includes("steps(2)"),
      };
    });
    host.remove();
    return result;
  });
  check("三类根动画与七类循环持续变化且使用低频采样", fixture.length === 24 && fixture.every((item) => item.valid), fixture);
  const characters = await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "dot-verify-characters";
    host.style.cssText = "position:fixed;left:0;top:0;pointer-events:none";
    host.innerHTML = ["", 'data-cs-size="sm" data-cs-twice', "data-cs-still"].map((attributes) =>
      `<div class="goose-cs" data-dm-phase="in" ${attributes} style="width:40px;height:40px"><div class="goose-cs-float"><div class="goose-cs-open"></div><div class="goose-cs-shut"></div></div></div>`).join("");
    document.body.append(host);
    const samples = [...host.children].map((root) => root.getAnimations({ subtree: true }).map((animation) => {
      animation.pause();
      const target = animation.effect.target, timing = animation.effect.getTiming();
      const values = [0, 0.25, 0.5, 0.75, 0.94, 0.96, 0.98, 0.999].map((offset) => {
        animation.currentTime = timing.duration * offset;
        const style = getComputedStyle(target);
        return animation.animationName.includes("blink") ? style.opacity : style.transform;
      });
      return { name: animation.animationName, values, duration: timing.duration, infinite: timing.iterations === Infinity };
    }));
    host.remove();
    return samples;
  });
  const originalLoops = characters.slice(0, 2).flat();
  check("角色大小浮动及单双眨眼保持原离散节奏", originalLoops.length === 6
    && new Set(originalLoops.map((item) => item.name)).size === 6
    && originalLoops.every((item) => item.infinite && new Set(item.values).size > 1)
    && originalLoops.filter((item) => item.name.includes("float")).every((item) => item.duration === 8000)
    && originalLoops.filter((item) => item.name.includes("blink")).every((item) => {
      const closed = item.name.endsWith("-open") ? "0" : "1", open = closed === "0" ? "1" : "0";
      const expected = item.name.includes("twice") ? [open, open, open, open, closed, open, closed, closed]
        : [open, open, open, open, open, open, closed, closed];
      return JSON.stringify(item.values) === JSON.stringify(expected);
    }), characters);
  check("CSS 静止浮动规则不会误停独立眨眼层", characters[2]?.length === 2
    && characters[2].every((item) => item.infinite && item.name.startsWith("goose-cs-blink")));
  const offscreen = await page.evaluate(() => {
    const node = document.querySelector("svg.goose-dm");
    if (!node) return false;
    node.setAttribute("data-verify-translate", node.style.translate);
    node.setAttribute("data-verify-target", "");
    node.style.translate = "-100000px 0";
    return true;
  });
  await settle(() => document.querySelector("[data-verify-target]")?.hasAttribute("data-dm-paused"));
  check("真实离屏触发暂停", offscreen && await page.evaluate(() => {
    const node = document.querySelector("[data-verify-target]");
    return node?.hasAttribute("data-dm-paused")
      && node.getAnimations({ subtree: true }).every((item) => item.playState === "paused");
  }));
  const hiddenTimes = () => page.evaluate(() => document.querySelector("[data-verify-target]")
    ?.getAnimations({ subtree: true }).filter((animation) => animation.effect.getTiming().iterations === Infinity)
    .map((animation) => animation.currentTime));
  await sleep(100);
  const frozen = await hiddenTimes();
  await sleep(800);
  check("离屏时逻辑时钟冻结，无后台推进", frozen?.length > 0 && JSON.stringify(frozen) === JSON.stringify(await hiddenTimes()));
  await page.evaluate(() => {
    const node = document.querySelector("[data-verify-target]");
    window.__dotVerifyCancelled = node.getAnimations({ subtree: true });
    node.style.translate = node.getAttribute("data-verify-translate");
  });
  await settle(() => !document.querySelector("[data-verify-target]")?.hasAttribute("data-dm-paused"));
  check("回到视口恢复循环且不重播入场", await page.evaluate(() => {
    const node = document.querySelector("[data-verify-target]");
    return node?.getAttribute("data-dm-phase") === "in"
      && node.hasAttribute("data-dm-played") && !node.hasAttribute("data-dm-paused")
      && node.getAnimations({ subtree: true }).every((item) => item.animationName !== "goose-dm-enter");
  }));
  const beforeDisplay = await hiddenTimes();
  await page.evaluate(() => {
    const node = document.querySelector("[data-verify-target]");
    node.setAttribute("data-verify-display", node.style.display);
    node.style.display = "none";
  });
  await settle(() => document.querySelector("[data-verify-target]")?.hasAttribute("data-dm-paused"));
  const cancelled = await page.evaluate(() => {
    const node = document.querySelector("[data-verify-target]");
    return node.getAnimations({ subtree: true }).length === 0
      && window.__dotVerifyCancelled.length > 0
      && window.__dotVerifyCancelled.every((animation) => animation.playState === "idle");
  });
  await sleep(250);
  await page.evaluate(() => {
    const node = document.querySelector("[data-verify-target]");
    node.style.display = node.getAttribute("data-verify-display");
  });
  await settle(() => !document.querySelector("[data-verify-target]")?.hasAttribute("data-dm-paused"));
  const afterDisplay = await hiddenTimes();
  const replaced = await page.evaluate(() => {
    const animations = document.querySelector("[data-verify-target]").getAnimations({ subtree: true });
    return window.__dotVerifyCancelled.every((old) => animations.some((current) => current !== old
      && current.animationName === old.animationName && current.effect.target === old.effect.target));
  });
  check("容器隐藏确实取消并重建 CSSAnimation，恢复原相位", cancelled && replaced && beforeDisplay?.length > 0
    && beforeDisplay.length === afterDisplay?.length
    && afterDisplay.every((time, index) => time >= beforeDisplay[index] && time - beforeDisplay[index] < 1000), { beforeDisplay, afterDisplay });
  await page.cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await settle(() => [...document.querySelectorAll(".goose-dm,.goose-cs")].every((node) => node.getAttribute("data-dm-phase") === "static"));
  check("减少动态效果时实际动画全部停止", await page.evaluate(() => {
    const nodes = [...document.querySelectorAll(".goose-dm,.goose-cs")];
    return nodes.length > 0 && nodes.every((node) => node.getAttribute("data-dm-phase") === "static"
      && node.getAnimations({ subtree: true }).length === 0);
  }));
  await page.cdp("Emulation.setEmulatedMedia", { features: [] });
  await settle(() => [...document.querySelectorAll("svg.goose-dm")].every((node) => node.getAttribute("data-dm-phase") === "in"));
  check("退出减少动态效果后恢复已播放状态", await page.evaluate(() => [...document.querySelectorAll("svg.goose-dm")].every((node) => node.getAttribute("data-dm-phase") === "in" && node.hasAttribute("data-dm-played"))));
  if (checks.some((item) => !item.ok)) {
    return checks;
  }
  const state = () => page.evaluate(() => [...document.querySelectorAll(".goose-dm,.goose-cs")].flatMap((node) =>
    node.getAnimations({ subtree: true }).filter((animation) => animation.effect.getTiming().iterations === Infinity).map((animation) => {
      const style = getComputedStyle(animation.effect.target);
      return { name: animation.animationName, kind: node.classList.contains("goose-cs") ? "character" : "dot",
        duration: animation.effect.getTiming().duration, time: animation.currentTime, state: animation.playState,
        picture: `${style.transform}:${style.opacity}` };
    })));
  const started = await state();
  const duration = Math.max(4500, ...started.map((item) => item.duration
    * (item.name.startsWith("goose-cs-blink") ? 0.98 : 0.5) + 250));
  const pictures = [];
  for (let elapsed = 0; elapsed < duration;) {
    const step = Math.min(900, duration - elapsed);
    await sleep(step);
    pictures.push(await state());
    elapsed += step;
  }
  const advanced = pictures.at(-1);
  check("共享时钟接管实际点阵和角色，CSS暂停但画面持续循环变化", started.length > 0 && started.length === advanced.length
    && advanced.every((item, index) => item.state === "paused" && item.name === started[index].name
      && item.time > started[index].time)
    && pictures.every((snapshot) => snapshot.length === started.length
      && snapshot.every((item, index) => item.name === started[index].name))
    && ["dot", "character"].every((kind) => pictures.some((snapshot) => snapshot.some((item, index) => item.kind === kind
      && item.picture !== started[index].picture))), { started, advanced });
  const dynamic = await page.evaluate(() => {
    const root = document.querySelector("svg.goose-dm");
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.id = "dot-verify-dynamic";
    group.setAttribute("class", "goose-dm-wave");
    group.style.setProperty("--dm-period", "1s");
    group.innerHTML = '<circle cx="20" cy="20" r="1"/>';
    root?.append(group);
    return Boolean(root);
  });
  await sleep(100);
  const dynamicTime = () => page.evaluate(() => {
    const animation = document.getElementById("dot-verify-dynamic")?.getAnimations()[0];
    return animation ? { time: animation.currentTime, state: animation.playState, duration: animation.effect.getTiming().duration,
      delay: animation.effect.getTiming().delay ?? 0 } : null;
  });
  const dynamicBefore = await dynamicTime();
  await sleep(400);
  const dynamicAfter = await dynamicTime();
  check("动态新增循环也被接管且继续推进", dynamic && dynamicBefore?.state === "paused"
    && dynamicAfter?.state === "paused" && dynamicAfter.time > dynamicBefore.time, { dynamicBefore, dynamicAfter });
  await page.evaluate(() => document.getElementById("dot-verify-dynamic")?.style.setProperty("--dm-period", "2s"));
  await sleep(100);
  const updated = await dynamicTime();
  const next = updated ? updated.delay + (Math.floor((updated.time - updated.delay) / 500) + 1) * 500 : 0;
  await sleep(Math.max(0, next - (updated?.time ?? 0) - 180));
  const held = await dynamicTime();
  await sleep(250);
  const continued = await dynamicTime();
  check("周期更新撤掉旧频率，在新边界继续推进", updated?.duration === 2000
    && updated.state === "paused" && held?.time === updated.time
    && continued?.state === "paused" && continued.time > updated.time, { updated, held, continued });
  await page.evaluate(() => document.getElementById("dot-verify-dynamic")?.remove());
  return checks;
} finally {
  await page.cdp("Emulation.setEmulatedMedia", { features: [] });
  await page.evaluate(() => {
    document.getElementById("dot-verify-style")?.remove();
    document.getElementById("dot-verify-fixture")?.remove();
    document.getElementById("dot-verify-characters")?.remove();
    document.getElementById("dot-verify-dynamic")?.remove();
    delete window.__dotVerifyCancelled;
    const node = document.querySelector("[data-verify-target]");
    if (node) {
      node.style.translate = node.getAttribute("data-verify-translate") ?? "";
      if (node.hasAttribute("data-verify-display")) node.style.display = node.getAttribute("data-verify-display");
      node.removeAttribute("data-verify-target");
      node.removeAttribute("data-verify-translate");
      node.removeAttribute("data-verify-display");
    }
  });
}

}
