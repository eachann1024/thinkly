import fs from "node:fs";
import path from "node:path";

const SR = 48000;
const BPM = 120;
const DURATION = 32;
const TOTAL = SR * DURATION;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const mix = new Float32Array(TOTAL);
const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);

function addTone(start, duration, render, gain) {
  const from = Math.max(0, Math.floor(start * SR));
  const to = Math.min(TOTAL, Math.floor((start + duration) * SR));
  for (let i = from; i < to; i += 1) {
    const t = i / SR - start;
    mix[i] += render(t) * gain;
  }
}

function attackRelease(t, duration, attack = 0.008, release = 0.12) {
  if (t < attack) return t / attack;
  const left = duration - t;
  if (left < release) return Math.max(0, left / release);
  return 1;
}

const CHORDS = [
  { bass: 36, tones: [60, 64, 67, 71] },
  { bass: 45, tones: [57, 60, 64, 67] },
  { bass: 41, tones: [53, 57, 60, 64] },
  { bass: 43, tones: [55, 59, 62, 64] },
];

const LEAD_PATTERN = [0, 2, 1, 3, 2, 1, 3, 2];

function renderLoop(loopStart) {
  for (let bar = 0; bar < 4; bar += 1) {
    const chord = CHORDS[bar];
    const barStart = loopStart + bar * BAR;

    // 三角波贝斯：每小节第 1、3 拍，落拍即走。
    for (const beat of [0, 2]) {
      const freq = midi(chord.bass);
      const start = barStart + beat * BEAT;
      addTone(
        start,
        BEAT * 0.92,
        (t) => {
          const phase = (t * freq) % 1;
          const tri = 4 * Math.abs(phase - 0.5) - 1;
          return tri * attackRelease(t, BEAT * 0.92, 0.006, 0.24);
        },
        0.11,
      );
    }

    // 正弦主音：四小节循环的八分音符走句。
    for (let step = 0; step < 8; step += 1) {
      const note = chord.tones[LEAD_PATTERN[step]] + 12;
      const freq = midi(note);
      const start = barStart + step * (BEAT / 2);
      const duration = BEAT * 0.46;
      addTone(
        start,
        duration,
        (t) => Math.sin(2 * Math.PI * freq * t) * attackRelease(t, duration, 0.01, 0.16),
        0.075,
      );
    }

    // 白噪声 hi-hat：反拍，短促收尾。
    for (let step = 0; step < 8; step += 1) {
      if (step % 2 === 0) continue;
      const start = barStart + step * (BEAT / 2);
      addTone(
        start,
        0.04,
        (t) => (Math.random() * 2 - 1) * Math.exp(-t * 90),
        0.032,
      );
    }
  }
}

// 固定随机序列，保证重渲染一致。
let seed = 20261017;
Math.random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

for (let loop = 0; loop < DURATION / (BAR * 4); loop += 1) {
  renderLoop(loop * BAR * 4);
}

// 强调落位与品牌定格：8ms 1200Hz 正弦 click。
for (const frame of [1640, 1800]) {
  const start = frame / 60;
  addTone(
    start,
    0.008,
    (t) => Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 900),
    0.22,
  );
}

// 软限幅，硬切收尾，不做淡出。
const samples = new Float32Array(TOTAL);
let peak = 0;
for (let i = 0; i < TOTAL; i += 1) {
  samples[i] = Math.tanh(mix[i] * 1.15);
  peak = Math.max(peak, Math.abs(samples[i]));
}

const gain = peak > 0 ? 0.55 / peak : 1;
const pcm = Buffer.alloc(TOTAL * 2);
for (let i = 0; i < TOTAL; i += 1) {
  pcm.writeInt16LE(Math.round(samples[i] * gain * 32767), i * 2);
}

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

const out = path.resolve("public/audio/bed.wav");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, pcm]));
console.log(`${out} · ${(pcm.length / 1024 / 1024).toFixed(1)} MB · peak ${peak.toFixed(2)}`);
