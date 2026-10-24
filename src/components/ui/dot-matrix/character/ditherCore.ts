
export const BAYER = (() => {
  const m = [[0, 2], [3, 1]];
  let b = m;
  for (let n = 2; n < 8; n *= 2) {
    const next: number[][] = [];
    for (let y = 0; y < n * 2; y++) {
      next[y] = [];
      for (let x = 0; x < n * 2; x++) next[y][x] = 4 * b[y % n][x % n] + m[(y / n) | 0][(x / n) | 0];
    }
    b = next;
  }
  return Float32Array.from(b.flat(), (v) => (v + 0.5) / 64);
})();

const DIFFUSE_BELOW = 120;

function range(L: Float32Array, A: Float32Array): [number, number] {
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 0; i < L.length; i++) {
    if (A[i] < 0.5) continue;
    hist[Math.min(255, (L[i] * 255) | 0)]++;
    n++;
  }
  let lo = 0;
  let hi = 255;
  for (let c = 0; lo < 255 && (c += hist[lo]) < n * 0.01; lo++);
  for (let c = 0; hi > 0 && (c += hist[hi]) < n * 0.01; hi--);
  return hi - lo < 16 ? [0, 1] : [lo / 255, hi / 255];
}

function blur(L: Float32Array, A: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(L.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      let c = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy < 0 || xx < 0 || yy >= h || xx >= w) continue;
          const j = yy * w + xx;
          if (A[j] < 0.5) continue;
          s += L[j];
          c++;
        }
      }
      out[y * w + x] = c ? s / c : L[y * w + x];
    }
  }
  return out;
}

function isEdge(A: Float32Array, w: number, h: number, x: number, y: number): boolean {
  if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return false;
  return A[y * w + x - 1] < 0.5 || A[y * w + x + 1] < 0.5 || A[(y - 1) * w + x] < 0.5 || A[(y + 1) * w + x] < 0.5;
}

export function ditherGray(L: Float32Array, A: Float32Array, w: number, h: number, dark: boolean): Uint8Array {
  const n = w * h;
  const small = Math.min(w, h) < DIFFUSE_BELOW;
  const [lo, hi] = range(L, A);
  const soft = blur(L, A, w, h);
  const sharpen = small ? 1.1 : 0.7;
  const ink = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (A[i] < 0.5) {
      ink[i] = -1;
      continue;
    }
    const sharp = L[i] + sharpen * (L[i] - soft[i]);
    const v = Math.min(1, Math.max(0, (sharp - lo) / (hi - lo)));
    ink[i] = dark ? 0.14 + 0.86 * Math.pow(v, small ? 1.6 : 1.35) : Math.pow(1 - v, small ? 1.5 : 1.3);
  }
  const out = new Uint8Array(n);
  if (small) {
    const err = Float32Array.from(ink, (v) => Math.max(0, v));
    const spread = (x: number, y: number, e: number) => {
      if (x < 0 || x >= w || y >= h || ink[y * w + x] < 0) return;
      err[y * w + x] += e;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (ink[i] < 0) continue;
        const on = err[i] > 0.5;
        out[i] = on ? 1 : 0;
        const e = (err[i] - (on ? 1 : 0)) / 8;
        spread(x + 1, y, e);
        spread(x + 2, y, e);
        spread(x - 1, y + 1, e);
        spread(x, y + 1, e);
        spread(x + 1, y + 1, e);
        spread(x, y + 2, e);
      }
    }
  } else {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        out[i] = ink[i] > BAYER[(y & 7) * 8 + (x & 7)] ? 1 : 0;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (ink[y * w + x] >= 0 && isEdge(A, w, h, x, y)) out[y * w + x] = 1;
    }
  }
  return out;
}
