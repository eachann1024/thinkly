import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const FONT = ['/usr/share/fonts/truetype/wqy/wqy-microhei.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'].find(fs.existsSync);
const SHEET = [0, 100, 210, 330, 450, 560, 680, 800, 925, 1040, 1170, 1290, 1417, 1560, 1680, 1790];
const frames = SHEET.map((n) => `f${String(n).padStart(4, '0')}.jpg`);
const inputs = frames.flatMap((f) => ['-i', `qa/stills/${f}`]);
const cells = frames.map((f, i) => {
  const n = Number(f.slice(1, 5));
  return `[${i}:v]scale=480:270,drawtext=fontfile=${FONT}:text='${n}':x=8:y=8:fontsize=26:fontcolor=white:box=1:boxcolor=0x00000099:boxborderw=5[c${i}]`;
});
const layout = frames.map((_, i) => `${(i % 4) * 480}_${Math.floor(i / 4) * 270}`).join('|');
const filter = `${cells.join(';')};${frames.map((_, i) => `[c${i}]`).join('')}xstack=inputs=${frames.length}:layout=${layout}`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-frames:v', '1', '-q:v', '3', 'qa/contact-sheet.jpg']);
console.log('qa/contact-sheet.jpg');
