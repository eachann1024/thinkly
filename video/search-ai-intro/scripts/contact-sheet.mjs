import { execFileSync } from "node:child_process";

const KEY = [120, 500, 760, 1120, 1540, 1900, 2370, 2640, 2879];
const frames = KEY.map((n) => `f${String(n).padStart(4, "0")}.jpg`);

const inputs = frames.flatMap((file) => ["-i", `qa/stills/${file}`]);
const cells = frames.map((_, i) => `[${i}:v]scale=540:960[c${i}]`);
const layout = frames.map((_, i) => `${(i % 3) * 540}_${Math.floor(i / 3) * 960}`).join("|");
const filter = `${cells.join(";")};${frames.map((_, i) => `[c${i}]`).join("")}xstack=inputs=${frames.length}:layout=${layout}`;

execFileSync("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  ...inputs,
  "-filter_complex",
  filter,
  "-frames:v",
  "1",
  "-q:v",
  "3",
  "qa/contact-sheet.jpg",
]);
console.log("qa/contact-sheet.jpg");
