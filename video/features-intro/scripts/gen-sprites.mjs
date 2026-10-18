// 构建期：把项目人物素材重新半调成统一网点（调幅圆点，只有墨／纸两值），输出 src/sprites.ts。
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("../..");
const sharp = createRequire(path.join(ROOT, "package.json"))("sharp");
const SRC = path.join(ROOT, "src/assets/characters");

const PITCH = 4;
const MIN_R = 0.9;
const MAX_R = 2.3;

/** 每个点的半径以 0.1px 为单位编码成一个字符，'0' 表示无点。 */
const encode = (r) => String.fromCharCode(48 + Math.round(r * 10));

async function shrink(tone, info, cells, sigma) {
  const { data } = await sharp(tone, { raw: { width: info.width, height: info.height, channels: 1 } })
    .blur(sigma)
    .resize(cells, cells, { kernel: "lanczos3" })
    .extractChannel(0)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

/** 返回网格灰度（墨的覆盖率）与人物轮廓（轮廓内的留白区也补最小点，避免衣服镂空）。 */
async function densityGrid(file, cells) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const tone = Buffer.alloc(info.width * info.height);
  for (let i = 0; i < tone.length; i += 1) {
    const a = data[i * 4 + 3] / 255;
    tone[i] = Math.round(255 * a);
  }
  return {
    tone: await shrink(tone, info, cells, 1.6),
    shape: await shrink(tone, info, cells, 3),
    shapeCut: 0.1,
  };
}

/** 轮廓二值化后从上、左、右三边泛洪（半身像底边被画框裁切），未被触及的留白（衣服、脸上的高光）都算轮廓内。 */
function fillShape(shape, cells, cut) {
  const outside = new Uint8Array(cells * cells);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= cells || y >= cells) return;
    const i = y * cells + x;
    if (outside[i] || shape[i] / 255 > cut) return;
    outside[i] = 1;
    stack.push(i);
  };
  for (let k = 0; k < cells; k += 1) {
    push(k, 0);
    push(0, k);
    push(cells - 1, k);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % cells;
    const y = (i - x) / cells;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return outside;
}

function toRows({ tone, shape, shapeCut }, cells, curve) {
  const outside = fillShape(shape, cells, shapeCut);
  const rows = [];
  for (let y = 0; y < cells; y += 1) {
    let row = "";
    for (let x = 0; x < cells; x += 1) {
      const i = y * cells + x;
      const d = curve(Math.min(1, Math.max(0, tone[i] / 255)));
      const inside = !outside[i];
      const r = Math.max(inside ? MIN_R : 0, PITCH * Math.sqrt(d / Math.PI) * 1.14);
      row += r < MIN_R ? "0" : encode(Math.min(MAX_R, r));
    }
    rows.push(row.replace(/0+$/, ""));
  }
  return rows;
}

const inkCurve = (d) => Math.min(1, Math.max(0, (d - 0.03) / 0.72));
const BODY = 96;

const jobs = [];
for (const pose of ["main", "blink", "open", "fail", "wave"]) {
  jobs.push({ key: `a-${pose}`, file: `a-${pose}-light.png`, cells: BODY });
  jobs.push({ key: `a-${pose}-dark`, file: `a-${pose}-dark.png`, cells: BODY });
}
for (const id of ["b", "g"]) {
  jobs.push({ key: `${id}-main`, file: `${id}-main-light.png`, cells: BODY });
  jobs.push({ key: `${id}-wave`, file: `${id}-wave-light.png`, cells: BODY });
}

const out = {};
for (const job of jobs) {
  const grid = await densityGrid(path.join(SRC, job.file), job.cells);
  out[job.key] = { cells: job.cells, rows: toRows(grid, job.cells, inkCurve) };
}

const body = `// 由 scripts/gen-sprites.mjs 生成，勿手改。网点间距 ${PITCH}px；每字符 = 点半径 × 10 + 48，'0' 为空。
export const SPRITE_PITCH = ${PITCH};
export const SPRITES = ${JSON.stringify(out)} as const;
export type SpriteKey = keyof typeof SPRITES;
`;
fs.writeFileSync("src/sprites.ts", body);
console.log(`src/sprites.ts · ${jobs.length} sprites · ${(body.length / 1024).toFixed(0)} KB`);
