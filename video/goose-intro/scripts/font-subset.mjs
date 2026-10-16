import fs from 'node:fs';
import path from 'node:path';

const pkg = 'node_modules/lxgw-wenkai-webfont';
const out = 'public/fonts';
const css = fs.readFileSync(`${pkg}/lxgwwenkai-regular.css`, 'utf8');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
const text = walk('src')
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('');
const codes = new Set([...text].map((c) => c.codePointAt(0)).filter((c) => c > 127));
for (const c of '0123456789 ⌥⌘⇧N.，。「」') codes.add(c.codePointAt(0));

const inRange = (code, range) =>
  range.split(',').some((part) => {
    const [a, b] = part.trim().replace(/U\+/gi, '').split('-').map((h) => parseInt(h, 16));
    return code >= a && code <= (b ?? a);
  });

const blocks = [...css.matchAll(/url\('\.\/files\/([^']+)'\)[^}]*?unicode-range:\s*([^}]+)\}/g)];
fs.mkdirSync(out, { recursive: true });
const manifest = [];
for (const [, file, range] of blocks) {
  if ([...codes].some((c) => inRange(c, range))) {
    fs.copyFileSync(`${pkg}/files/${file}`, `${out}/${file}`);
    manifest.push({ file, range: range.trim() });
  }
}
fs.copyFileSync(`${pkg}/OFL.txt`, `${out}/OFL.txt`);
fs.writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log(`slices: ${manifest.length}`);
