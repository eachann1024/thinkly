// The review drawings are geometry, not product components.
export const path = (d, opts = {}) => ({ d, tone: "ink", alpha: .6, width: 2.5, gap: 4.5, ...opts });
export const poly = (points, opts) => path(points.map((p, i) => `${i ? "L" : "M"}${p.join(" ")}`).join(" "), opts);
export const line = (x, y, x2, y2, opts) => poly([[x, y], [x2, y2]], opts);
export const dot = (x, y, r = 1.4, opts = {}) => ({ x, y, r, tone: "accent", alpha: 1, ...opts });
export const circle = (x, y, r, opts) => path(`M${x-r} ${y}a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 ${-r*2} 0`, opts);
export const arc = (x, y, rx, ry, start, end, opts) => {
  const p = [];
  for (let a = start; a <= end + .01; a += (end-start)/36) {
    const t = a * Math.PI / 180;
    p.push([+(x + Math.cos(t)*rx).toFixed(2), +(y + Math.sin(t)*ry).toFixed(2)]);
  }
  return poly(p, opts);
};
export const rect = (x, y, w, h, opts) => path(`M${x+4} ${y}H${x+w-4}Q${x+w} ${y} ${x+w} ${y+4}V${y+h-4}Q${x+w} ${y+h} ${x+w-4} ${y+h}H${x+4}Q${x} ${y+h} ${x} ${y+h-4}V${y+4}Q${x} ${y} ${x+4} ${y}`, opts);
export const plus = (x, y, size = 7, opts = {}) => [line(x-size, y, x+size, y, { tone: "accent", ...opts }), line(x, y-size, x, y+size, { tone: "accent", ...opts })];
export const paper = (x, y, w, h, fold = 12, opts = {}) => [
  path(`M${x+3} ${y}H${x+w-fold}L${x+w} ${y+fold}V${y+h-3}Q${x+w} ${y+h} ${x+w-3} ${y+h}H${x+3}Q${x} ${y+h} ${x} ${y+h-3}V${y+3}Q${x} ${y} ${x+3} ${y}`, opts),
  poly([[x+w-fold, y+3], [x+w-fold, y+fold], [x+w-3, y+fold]], opts),
];
export const folder = (x, y, w, h, open = false, opts = {}) => {
  const edge = y + (open ? 22 : h);
  const back = path(`M${x} ${edge}V${y+5}Q${x} ${y} ${x+5} ${y}H${x+w*.38}L${x+w*.49} ${y+9}H${x+w-4}Q${x+w} ${y+9} ${x+w} ${y+13}V${edge}${open ? "" : "Z"}`, opts);
  return open ? [back, poly([[x-5, y+23], [x+w+6, y+23], [x+w-3, y+h], [x+4, y+h], [x-5, y+23]], { ...opts, alpha: opts.alpha ?? .7 })] : [back, line(x+5, y+19, x+w-5, y+19, { ...opts, alpha: .32 })];
};
export const alert = (x, y, r = 11) => [
  circle(x, y, r, { tone: "danger", alpha: .85, width: 2.5, gap: 4.3 }),
  line(x, y-5, x, y, { tone: "danger", alpha: .95, gap: 3.8 }),
  dot(x, y+5, 1.4, { tone: "danger" }),
];
export const question = (x, y, size = 9) => [
  path(`M${x-size*.65} ${y-size*.45}Q${x-size*.6} ${y-size*1.1} ${x} ${y-size*1.1}Q${x+size*.9} ${y-size*1.1} ${x+size*.7} ${y-size*.3}Q${x+size*.7} ${y+size*.1} ${x} ${y+size*.3}V${y+size*.5}`, { tone: "accent", alpha: .95, width: 2.5, gap: 4.1 }),
  dot(x, y+size*.98, 1.4),
];
export const group = (parts, motion = null, phase = 0, opts = {}) => ({ parts: [parts].flat(Infinity), motion, phase, period: 12, low: .55, amplitude: 1.2, origin: [160, 104], ...opts });
export const ink = (parts, motion = null, phase = 0, opts = {}) => group(parts, motion, phase, { low: .8, origin: [64, 48], ...opts });
export const signal = (parts, phase = 0, opts = {}) => ink(parts, "breathe", phase, { low: .55, period: 6, ...opts });
