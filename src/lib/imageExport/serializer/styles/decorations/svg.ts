
const XMLNS = "http://www.w3.org/2000/svg";

export function svgUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function svg(width: number, height: number, body: string, extra = ""): string {
  return `<svg xmlns='${XMLNS}' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'${extra}>${body}</svg>`;
}

function round(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hexToUnitRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return [0, 0, 0];
  const n = parseInt(match[1], 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const GRAIN_TILE = 180;

export function grainSvg(tone: string, opacity: number, fibers = false): string {
  const [r, g, b] = hexToUnitRgb(tone).map(round);
  const k = round(opacity * 4);
  const offset = round(-opacity * 1.8);
  const frequency = fibers ? "0.006 0.7" : "0.85";
  const octaves = fibers ? 3 : 2;
  return svg(
    GRAIN_TILE,
    GRAIN_TILE,
    `<filter id='g' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='${octaves}' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${k} 0 0 0 ${offset}'/></filter><rect width='100%' height='100%' filter='url(#g)'/>`,
  );
}

export function halftoneSvg(color: string, size: number): string {
  const step = 11;
  const maxRadius = 4.4;
  let dots = "";
  for (let y = step / 2; y < size; y += step) {
    for (let x = step / 2; x < size; x += step) {
      const distance = Math.hypot(size - x, y) / size;
      const radius = maxRadius * (1 - distance);
      if (radius > 0.4) dots += `<circle cx='${round(x)}' cy='${round(y)}' r='${round(radius)}'/>`;
    }
  }
  return svg(size, size, `<g fill='${color}'>${dots}</g>`);
}

export const CONTRIBUTION_SIZE = { cols: 26, rows: 5, cell: 7, gap: 2 } as const;

export function contributionSvg(colors: readonly string[]): string {
  const { cols, rows, cell, gap } = CONTRIBUTION_SIZE;
  const next = seeded(20260517);
  const levels = [0, 0, 0, 1, 1, 1, 2, 2, 3, 4];
  let cells = "";
  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      const level = levels[Math.floor(next() * levels.length)];
      cells += `<rect x='${col * (cell + gap)}' y='${row * (cell + gap)}' width='${cell}' height='${cell}' rx='1.5' fill='${colors[level]}'/>`;
    }
  }
  const width = cols * (cell + gap) - gap;
  const height = rows * (cell + gap) - gap;
  return svg(width, height, cells);
}

export const PALETTE_DOT = { radius: 4, gap: 7 } as const;

export function paletteDotsSvg(colors: readonly string[]): string {
  const { radius, gap } = PALETTE_DOT;
  const pitch = radius * 2 + gap;
  const dots = colors
    .map((color, index) => `<circle cx='${radius + index * pitch}' cy='${radius}' r='${radius}' fill='${color}'/>`)
    .join("");
  return svg(colors.length * pitch - gap, radius * 2, dots);
}

export const STAR_TILE = 220;

export function starfieldSvg(color: string): string {
  const next = seeded(1987);
  let stars = "";
  for (let index = 0; index < 18; index += 1) {
    const r = 0.45 + next() * 0.65;
    const opacity = 0.18 + next() * 0.5;
    stars += `<circle cx='${round(next() * STAR_TILE)}' cy='${round(next() * STAR_TILE)}' r='${round(r)}' fill-opacity='${round(opacity)}'/>`;
  }
  return svg(STAR_TILE, STAR_TILE, `<g fill='${color}'>${stars}</g>`);
}

export function coffeeRingSvg(color: string): string {
  return svg(
    140,
    140,
    `<g fill='none' stroke='${color}'>` +
      `<circle cx='70' cy='70' r='56' stroke-width='3.2' stroke-opacity='0.32'/>` +
      `<circle cx='70' cy='70' r='53.6' stroke-width='1' stroke-opacity='0.2' stroke-dasharray='120 18 60 30'/>` +
      `<circle cx='71' cy='69' r='58.4' stroke-width='1.4' stroke-opacity='0.14' stroke-dasharray='40 90 26 140'/>` +
      `</g>`,
  );
}

export const HORIZON_HEIGHT = 170;

export function horizonSvg(color: string): string {
  const width = 680;
  const height = HORIZON_HEIGHT;
  let lines = `<line x1='0' y1='0.5' x2='${width}' y2='0.5'/>`;
  for (let i = 1; i <= 8; i += 1) {
    const y = height * (i / 8) ** 1.8;
    lines += `<line x1='0' y1='${round(y)}' x2='${width}' y2='${round(y)}'/>`;
  }
  for (let k = -9; k <= 9; k += 1) {
    lines += `<line x1='${width / 2 + k * 14}' y1='0' x2='${width / 2 + k * 96}' y2='${height}'/>`;
  }
  return svg(
    width,
    height,
    `<g stroke='${color}' stroke-width='1' vector-effect='non-scaling-stroke'>${lines}</g>`,
    " preserveAspectRatio='none'",
  );
}

export function sunSvg(color: string): string {
  const cuts = [
    [50, 2],
    [62, 3],
    [75, 4],
    [89, 5],
    [104, 6],
    [120, 7],
  ]
    .map(([y, h]) => `<rect x='0' y='${y}' width='160' height='${h}' fill='black'/>`)
    .join("");
  return svg(
    160,
    160,
    `<mask id='m'><rect width='160' height='160' fill='white'/>${cuts}</mask><circle cx='80' cy='80' r='72' fill='${color}' mask='url(#m)'/>`,
  );
}

export function plusSvg(color: string): string {
  return svg(
    15,
    15,
    `<g stroke='${color}' stroke-width='1'><line x1='7.5' y1='0' x2='7.5' y2='15'/><line x1='0' y1='7.5' x2='15' y2='7.5'/></g>`,
  );
}

export function wavySvg(color: string): string {
  return svg(
    124,
    10,
    `<path d='M2 6 Q 12 1 22 6 T 42 6 T 62 6 T 82 6 T 102 6 T 122 6' fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round'/>`,
  );
}
