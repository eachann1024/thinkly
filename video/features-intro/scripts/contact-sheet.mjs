import { execFileSync } from "node:child_process";

const KEY = process.argv.length > 2
  ? process.argv.slice(2).map(Number)
  : [130, 340, 700, 1060, 1380, 1770, 2090, 2420, 2660];
const frames = KEY.map((n) => `f${String(n).padStart(4, "0")}.jpg`);

const inputs = frames.flatMap((file) => ["-i", `qa/stills/${file}`]);
const cells = frames.map((_, i) => `[${i}:v]scale=640:360[c${i}]`);
const layout = frames.map((_, i) => `${(i % 3) * 640}_${Math.floor(i / 3) * 360}`).join("|");
const filter = `${cells.join(";")};${frames.map((_, i) => `[c${i}]`).join("")}xstack=inputs=${frames.length}:layout=${layout}`;

execFileSync("ffmpeg", [
  "-y", "-loglevel", "error",
  ...inputs,
  "-filter_complex", filter,
  "-frames:v", "1", "-q:v", "3",
  "qa/contact-sheet.jpg",
]);
console.log("qa/contact-sheet.jpg");
