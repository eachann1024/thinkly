import fs from "node:fs";
import path from "node:path";

const SR = 48000;
const FPS = 60;
const BPM = 120;
const DURATION = 3360 / FPS;
const TOTAL = Math.round(SR * DURATION);
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const mix = new Float32Array(TOTAL);
const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);

function addTone(start, duration, render, gain) {
  const from = Math.max(0, Math.floor(start * SR));
  const to = Math.min(TOTAL, Math.floor((start + duration) * SR));
  for (let i = from; i < to; i += 1) mix[i] += render(i / SR - start) * gain;
}

function env(t, duration, attack = 0.008, release = 0.12) {
  if (t < attack) return t / attack;
  const left = duration - t;
  return left < release ? Math.max(0, left / release) : 1;
}

let seed = 20261019;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const CHORDS = [
  { bass: 41, tones: [57, 60, 64, 67] },
  { bass: 43, tones: [55, 59, 62, 67] },
  { bass: 45, tones: [57, 60, 64, 69] },
  { bass: 40, tones: [55, 59, 64, 67] },
];
const LEAD = [0, 2, 3, 1, 2, 3, 1, 2];

const bars = Math.ceil(DURATION / BAR);
for (let bar = 0; bar < bars; bar += 1) {
  const chord = CHORDS[bar % 4];
  const start = bar * BAR;
  const intro = bar < 2;
  const outro = start >= 3000 / FPS;

  // 柔和铺底：四个和弦音的正弦长音。
  for (const note of chord.tones) {
    const freq = midi(note);
    addTone(start, BAR, (t) => Math.sin(2 * Math.PI * freq * t) * env(t, BAR, 0.4, 0.6), 0.018);
  }
  // 三角波贝斯：1、3 拍。
  if (!intro) {
    for (const beat of [0, 2]) {
      const freq = midi(chord.bass);
      addTone(start + beat * BEAT, BEAT * 0.9, (t) => (4 * Math.abs(((t * freq) % 1) - 0.5) - 1) * env(t, BEAT * 0.9, 0.006, 0.22), 0.1);
    }
  }
  // 正弦八分音符走句。
  for (let step = 0; step < 8; step += 1) {
    if (intro && step % 2) continue;
    const freq = midi(chord.tones[LEAD[step]] + 12);
    const d = BEAT * 0.42;
    addTone(start + step * (BEAT / 2), d, (t) => Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 7) * env(t, d, 0.005, 0.1), outro ? 0.05 : 0.065);
  }
  // 反拍白噪声 hi-hat。
  if (!intro && !outro) {
    for (let step = 1; step < 8; step += 2) {
      addTone(start + step * (BEAT / 2), 0.04, (t) => (rand() * 2 - 1) * Math.exp(-t * 95), 0.028);
    }
  }
}

// 操作音：点击与落位，各一下 8ms 1200Hz 正弦。
const CLICKS = [
  400, 510, 568, 684,
  780, 948, 1142,
  1230, 1496,
  1754, 1826, 1962,
  2176, 2212, 2336, 2382, 2428, 2460,
  2628, 2670, 2740, 2812, 2884,
  3060,
];
for (const frame of CLICKS) {
  addTone(frame / FPS, 0.008, (t) => Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 700), 0.2);
}

let peak = 0;
const out = new Float32Array(TOTAL);
for (let i = 0; i < TOTAL; i += 1) {
  const fade = Math.min(1, (TOTAL - i) / (SR * 1.2));
  out[i] = Math.tanh(mix[i] * 1.1) * fade;
  peak = Math.max(peak, Math.abs(out[i]));
}
const gain = peak > 0 ? 0.55 / peak : 1;
const pcm = Buffer.alloc(TOTAL * 2);
for (let i = 0; i < TOTAL; i += 1) pcm.writeInt16LE(Math.round(out[i] * gain * 32767), i * 2);

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);

const file = path.resolve("public/audio/bed.wav");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, Buffer.concat([header, pcm]));
console.log(`${file} · ${(pcm.length / 1024 / 1024).toFixed(1)} MB`);
