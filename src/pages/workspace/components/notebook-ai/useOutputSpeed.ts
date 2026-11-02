import { useEffect, useRef, useState } from "react";

export interface SpeedPoint { at: number; rate: number }
export interface OutputSpeed { live: number; average: number; peak: number; total: number; points: SpeedPoint[] }

const WINDOW = 3;
const MAX_SAMPLES = 600;

function summarize(samples: Array<{ at: number; chars: number }>): OutputSpeed | null {
  const last = samples[samples.length - 1];
  // Baseline = the sample just before output first grew, so remounting mid-run never inflates the average.
  const growth = samples.findIndex((sample, i) => i > 0 && sample.chars > samples[i - 1].chars);
  if (!last || growth < 0) return null;
  const base = samples[growth - 1];
  const raw: SpeedPoint[] = [];
  for (let i = 1; i < samples.length; i++) {
    const seconds = (samples[i].at - samples[i - 1].at) / 1000;
    if (seconds > 0) raw.push({ at: samples[i].at, rate: Math.max(0, samples[i].chars - samples[i - 1].chars) / seconds });
  }
  // A moving window keeps chunky streams from making the readout jump every tick.
  const points = raw.map((point, i) => {
    const slice = raw.slice(Math.max(0, i - WINDOW + 1), i + 1);
    return { at: point.at, rate: slice.reduce((sum, item) => sum + item.rate, 0) / slice.length };
  });
  const span = (last.at - base.at) / 1000;
  return {
    live: points[points.length - 1]?.rate ?? 0,
    average: span > 0 ? (last.chars - base.chars) / span : 0,
    peak: points.reduce((max, point) => Math.max(max, point.rate), 0),
    total: last.chars,
    points,
  };
}

/** Samples generated characters once per tick; `now` is the caller's 1s clock. */
export function useOutputSpeed(chars: number, now: number, running: boolean) {
  const samples = useRef<Array<{ at: number; chars: number }>>([]);
  const latest = useRef(chars);
  latest.current = chars;
  const [speed, setSpeed] = useState<OutputSpeed | null>(null);
  useEffect(() => {
    if (!running) return;
    const list = samples.current;
    if (list[list.length - 1]?.at === now) return;
    list.push({ at: now, chars: latest.current });
    if (list.length > MAX_SAMPLES) list.splice(0, list.length - MAX_SAMPLES);
    setSpeed(summarize(list));
  }, [now, running]);
  return speed;
}
