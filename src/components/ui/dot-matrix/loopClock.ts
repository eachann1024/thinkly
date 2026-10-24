export function loopOffsets(name: string): readonly number[] {
  if (name === "goose-dm-glint") return [0, 0.14, 0.28, 0.34, 0.48, 0.68, 0.84, 1];
  if (name === "goose-cs-float-sm") return [0, 0.5, 1];
  if (name.startsWith("goose-cs-blink-twice")) return [0, 0.94, 0.96, 0.98, 1];
  if (name.startsWith("goose-cs-blink")) return [0, 0.98, 1];
  return [0, 0.25, 0.5, 0.75, 1];
}

export function nextLoopBoundary(time: number, duration: number, delay: number, offsets: readonly number[]) {
  if (time < delay) return delay;
  const cycle = Math.floor((time - delay) / duration);
  for (const offset of offsets) {
    const boundary = delay + (cycle + offset) * duration;
    if (boundary > time + 0.0001) return boundary;
  }
  return delay + (cycle + 1 + offsets[1]) * duration;
}

type Environment = {
  now(): number;
  schedule(callback: () => void, delay: number): unknown;
  cancel(timer: unknown): void;
};
type Input = { time: number; duration: number; delay: number; offsets: readonly number[]; write(time: number): void };
type Track = Input & { anchor: number; active: boolean; due: number };

export function createLoopClock(environment: Environment) {
  const tracks = new Set<Track>();
  let timer: unknown = null, batching = 0;
  const timeAt = (track: Track, now: number) => track.time + (track.active ? now - track.anchor : 0);
  function schedule() {
    if (batching) return;
    if (timer !== null) environment.cancel(timer);
    timer = null;
    let due = Infinity;
    for (const track of tracks) if (track.active) due = Math.min(due, track.due);
    if (Number.isFinite(due)) timer = environment.schedule(tick, Math.max(1, Math.ceil(due - environment.now())));
  }
  function tick() {
    timer = null;
    const now = environment.now();
    for (const track of tracks) {
      if (!track.active || track.due > now) continue;
      const time = timeAt(track, now);
      track.write(time);
      track.due = now + nextLoopBoundary(time, track.duration, track.delay, track.offsets) - time;
    }
    schedule();
  }
  return {
    batch(run: () => void) {
      batching++;
      try { run(); } finally { batching--; schedule(); }
    },
    add(input: Input) {
      const track: Track = { ...input, anchor: environment.now(), active: false, due: Infinity };
      const time = () => timeAt(track, environment.now());
      return {
        time,
        setActive(active: boolean) {
          if (track.active === active) return;
          const now = environment.now();
          track.time = timeAt(track, now);
          track.anchor = now;
          track.active = active;
          if (active) tracks.add(track); else tracks.delete(track);
          track.write(track.time);
          track.due = active ? now + nextLoopBoundary(track.time, track.duration, track.delay, track.offsets) - track.time : Infinity;
          schedule();
        },
        remove() { tracks.delete(track); track.active = false; schedule(); },
      };
    },
  };
}
