import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/imageExport/serializer/styles/decorations/contributionQr.ts#localMessages:1">`
zh-Hans:
  siteQr: "贡献图点阵，暗含二维码，扫码打开 note.cooool.top"
en:
  siteQr: "Contribution dots hiding a QR code for note.cooool.top"
ja:
  siteQr: "コントリビューショングラフに note.cooool.top の QR を隠しています"
`;
const uiText = createTranslator(localMessages);

const QR =
  "1111111000110100001100111111110000010011110111110101000001101110100110100100010010111011011101001001001110010101110110111010111000110001001011101100000100100000001111010000011111111010101010101010111111100000000110000000111000000000001100111011100010001110100001010110101000101101111111000101011011000010001010001011010100100000001010111101001100011011011110111111100101010011110011100001100111001001101101111011101111111111110101110111111000010110000010111001101100101111111001110101100111011010000011001110100101001001001000111011111101110000110110000000001001100111000011011100011110101001001010011111111000000000010100100101010001101111111110100010110101101010100100000100000111001001000100111011101001110111011011111110010111010100001011111000011010101110101111000000001001001011000001001110101111110101101011111110011111010101101100010";

const DARK = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];

function dotColors(
  rows: number,
  cols: number,
  ramp: boolean,
  qr: boolean,
  seed: number,
): string[] {
  const out: string[] = [];
  const q0 = qr ? cols - 37 : cols;
  let state = seed;
  const next = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const v = next();
      const u = next();
      if (x >= q0) {
        const qx = x - q0 - 4;
        const qy = y - 4;
        const bit =
          qx >= 0 &&
          qx < 29 &&
          qy >= 0 &&
          qy < 29 &&
          QR.charAt(qy * 29 + qx) === "1";
        out.push(bit ? (u < 0.6 ? DARK[4] : DARK[3]) : v < 0.14 ? DARK[1] : DARK[0]);
      } else {
        const density = ramp
          ? 0.03 + 0.37 * Math.pow(x / Math.max(1, q0), 1.6)
          : 0.2;
        out.push(v < density ? DARK[1 + Math.floor(u * 4)] : DARK[0]);
      }
    }
  }
  return out;
}

function cells(colors: string[]): string {
  return colors.map((color) => `<span style="background:${color}"></span>`).join("");
}

function field(
  className: string,
  style: string,
  colors: string[],
  label?: string,
): string {
  const role = label
    ? ` role="img" aria-label="${label.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`
    : ` aria-hidden="true"`;
  return `<div class="gooseshot-contrib ${className}"${role} style="${style}">${cells(colors)}</div>`;
}

export function buildGithubDarkContributionQr(
  width: number,
  padX: number,
): { css: string; html: string } {
  const cell = Math.max(2, Math.round((3 * width) / 680));
  const pitch = cell + 1;
  const cols = Math.max(37, Math.floor((width - 2 * padX + 1) / pitch));
  const inset = Math.max(4, Math.round((padX - 2 * pitch) / 2));
  const topCols = Math.round(cols * 0.7);
  const grid = (count: number) =>
    `display:grid;grid-template-columns:repeat(${count},${cell}px);grid-auto-rows:${cell}px;gap:1px`;
  const mask = (image: string) =>
    `;-webkit-mask-image:${image};mask-image:${image}`;
  const radius = cell > 2 ? 1 : 0.5;
  const fadeAt = Math.round(((cols - 37) / cols) * 100);
  const css = `.gooseshot-contrib{pointer-events:none}.gooseshot-contrib span{display:block;width:${cell}px;height:${cell}px;border-radius:${radius}px}`;
  const html = [
    field(
      "gooseshot-contrib-top",
      `position:absolute;top:${inset}px;right:${padX}px;${grid(topCols)}${mask("linear-gradient(90deg,transparent,#000 75%)")}`,
      dotColors(2, topCols, false, false, 11),
    ),
    field(
      "gooseshot-contrib-side",
      `position:absolute;top:${padX}px;right:${inset}px;${grid(2)}${mask("linear-gradient(#000 25%,transparent)")}`,
      dotColors(48, 2, false, false, 23),
    ),
    field(
      "gooseshot-contrib-band",
      `position:relative;z-index:1;margin-top:24px;justify-content:end;${grid(cols)}${mask(`linear-gradient(90deg,transparent,#000 ${fadeAt}%)`)}`,
      dotColors(37, cols, true, true, 20260517),
      uiText("siteQr"),
    ),
  ].join("");
  return { css, html };
}
