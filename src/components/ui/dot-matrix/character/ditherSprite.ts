import { BAYER, ditherGray } from "./ditherCore";
import type { CharacterRect } from "./registry";

/**
 * 点阵出图：有灰度源时在目标物理尺寸上现场抖动；否则把 1-bit 素材按目标格数重抖。
 * 结果以 data URL 缓存，同一 key 只算一次。
 */

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("character asset failed to load"));
    image.src = src;
  });
}

function paint(image: HTMLImageElement, cols: number, crop: CharacterRect): string {
  const [cx, cy, cw, ch] = crop;
  const sw = image.naturalWidth * cw;
  const sh = image.naturalHeight * ch;
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = cols;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return image.src;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, image.naturalWidth * cx, image.naturalHeight * cy, sw, sh, 0, 0, cols, cols);
  // 原尺寸或放大：只裁切，不重抖。
  if (cols >= sw) return canvas.toDataURL("image/png");
  const frame = ctx.getImageData(0, 0, cols, cols);
  const data = frame.data;
  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      // 墨点不透明、背景透明：覆盖率即墨量，略提对比度保住轮廓。
      const ink = Math.min(1, Math.max(0, (data[i + 3] / 255 - 0.02) * 1.18));
      data[i + 3] = ink > BAYER[(y & 7) * 8 + (x & 7)] ? 255 : 0;
    }
  }
  ctx.putImageData(frame, 0, 0);
  return canvas.toDataURL("image/png");
}

/** 与 1-bit 素材同色：浅色纯墨，深色浅灰。 */
const INK = { light: [0, 0, 0], dark: [0xe6, 0xe6, 0xe6] } as const;

/** 灰度源在目标物理尺寸上重采样后再抖动；源不够大时按源尺寸出图。 */
function paintGray(image: HTMLImageElement, px: number, dark: boolean): string {
  const side = Math.max(8, Math.min(px, image.naturalWidth));
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return image.src;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, side, side);
  const frame = ctx.getImageData(0, 0, side, side);
  const data = frame.data;
  const n = side * side;
  const L = new Float32Array(n);
  const A = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    A[i] = data[i * 4 + 3] / 255;
    L[i] = data[i * 4] / 255;
  }
  const bits = ditherGray(L, A, side, side, dark);
  const [r, g, b] = dark ? INK.dark : INK.light;
  for (let i = 0; i < n; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = bits[i] ? 255 : 0;
  }
  ctx.putImageData(frame, 0, 0);
  return canvas.toDataURL("image/png");
}

export function cachedSprite(key: string): string | undefined {
  return cache.get(key);
}

export type SpriteSource =
  | { kind: "gray"; px: number; dark: boolean }
  | { kind: "bits"; cols: number; crop: CharacterRect };

export function renderSprite(key: string, load: () => Promise<string>, source: SpriteSource): Promise<string> {
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(key);
  if (inflight) return inflight;
  const task = load()
    .then(loadImage)
    .then((image) => {
      const url =
        source.kind === "gray" ? paintGray(image, source.px, source.dark) : paint(image, source.cols, source.crop);
      cache.set(key, url);
      return url;
    })
    .finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
