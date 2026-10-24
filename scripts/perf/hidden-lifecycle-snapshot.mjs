export const snapshotSource = `(() => {
    window.__thinklyDiagIds ||= new WeakMap(); window.__thinklyDiagNextId ||= 0;
    const id = object => { if (!window.__thinklyDiagIds.has(object)) window.__thinklyDiagIds.set(object, ++window.__thinklyDiagNextId); return window.__thinklyDiagIds.get(object); };
    const splitList = value => { const parts = []; let depth = 0, from = 0;
      for (let i = 0; i < value.length; i++) { if (value[i] === '(') depth++; if (value[i] === ')') depth--;
        if (value[i] === ',' && !depth) { parts.push(value.slice(from, i).trim()); from = i + 1; } }
      parts.push(value.slice(from).trim()); return parts;
    };
    const easing = a => { const target = a.effect?.target; if (!(target instanceof Element)) return null;
      const css = getComputedStyle(target), names = splitList(css.animationName), curves = splitList(css.animationTimingFunction);
      return curves[Math.max(0, names.indexOf(a.animationName)) % curves.length];
    };
    const animations = document.getAnimations();
    const states = animations.reduce((out, a) => {
      out[a.playState] = (out[a.playState] || 0) + 1; return out;
    }, {});
    return {
      now: performance.now(), hidden: document.hidden, visibility: document.visibilityState, focused: document.hasFocus(),
      readyState: document.readyState, rootChildren: document.getElementById('root')?.childElementCount || 0,
      title: document.title, text: document.body.innerText.slice(0, 180),
      animations: animations.length, animationStates: states,
      userAgent: navigator.userAgent, devicePixelRatio: devicePixelRatio, randomFixture: window.__thinklyDiagRandom,
      animationTimes: animations.map(a => ({
        id: id(a), targetId: a.effect?.target ? id(a.effect.target) : null,
        duration: a.effect?.getTiming().duration, delay: a.effect?.getTiming().delay,
        iterations: a.effect?.getTiming().iterations === Infinity ? "infinite" : a.effect?.getTiming().iterations,
        keyframeEasings: a.effect?.getKeyframes().map(frame => frame.easing),
        name: a.animationName || a.id || a.constructor.name, state: a.playState, playbackRate: a.playbackRate,
        time: typeof a.currentTime === 'number' ? a.currentTime : null,
        target: a.effect?.target?.getAttribute?.('class')?.slice(0, 90) || null,
        group: a.effect?.target?.closest?.('.goose-dm') ? 'dot' : a.effect?.target?.closest?.('.goose-cs') ? 'character' : 'other',
        easing: easing(a),
        visual: a.effect?.target instanceof Element ? { opacity: getComputedStyle(a.effect.target).opacity,
          transform: getComputedStyle(a.effect.target).transform } : null
      })),
      geometry: {
        svgCount: document.querySelectorAll('.goose-dm').length,
        shapes: document.querySelectorAll('.goose-dm rect, .goose-dm circle, .goose-dm path').length,
        primitives: [...document.querySelectorAll('.goose-dm, .goose-dm *')].map(el => ({ id: id(el), tag: el.tagName,
          attributes: Object.fromEntries([...el.attributes].filter(a => /^(viewBox|x|y|x1|x2|y1|y2|width|height|r|rx|ry|cx|cy|d|points|transform)$/.test(a.name)).map(a => [a.name, a.value])) })),
        viewBoxes: [...document.querySelectorAll('.goose-dm')].map(el => el.getAttribute('viewBox')),
        zoom: [...document.querySelectorAll('.goose-dm')].map(el => {
          const ancestors = []; for (let node = el; node; node = node.parentElement) {
            ancestors.push({ tag: node.tagName, class: node.getAttribute('class'), zoom: getComputedStyle(node).zoom,
              width: node.clientWidth, height: node.clientHeight });
          } return ancestors;
        })
      },
      dots: [...document.querySelectorAll('[data-dm-phase]')].map(el => {
        const rect = el.getBoundingClientRect(), css = getComputedStyle(el); return {
        id: id(el), clock: el.getAttribute('data-dm-clock'), kind: el.classList.contains('goose-dm') ? 'dot' : 'character', width: rect.width, height: rect.height, opacity: css.opacity,
        inViewport: rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight,
        phase: el.getAttribute('data-dm-phase'), paused: el.hasAttribute('data-dm-paused'),
        played: el.hasAttribute('data-dm-played'), display: css.display
      }; }),
      visibilityEvents: window.__thinklyDiagVisibility || []
    };
  })()`;
