import { continueRender, delayRender, staticFile } from 'remotion';

type Slice = { file: string; range: string };

export const FONT_FAMILY = "'LXGW WenKai', 'WenQuanYi Micro Hei', sans-serif";

const handle = delayRender('lxgw-wenkai');

const load = async () => {
  const slices: Slice[] = await (await fetch(staticFile('fonts/manifest.json'))).json();
  const faces = slices.map(
    ({ file, range }) =>
      new FontFace('LXGW WenKai', `url(${staticFile(`fonts/${file}`)}) format('woff2')`, {
        unicodeRange: range,
      }),
  );
  await Promise.all(faces.map((f) => f.load()));
  faces.forEach((f) => (document.fonts as unknown as { add(face: FontFace): void }).add(f));
  await document.fonts.ready;
};

load()
  .catch(() => undefined)
  .finally(() => continueRender(handle));
