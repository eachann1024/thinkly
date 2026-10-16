// Original 60-second pastoral score, synthesized locally without media downloads.
let preparedContext: AudioContext | undefined;

/** Call directly from the onboarding completion click to unlock Web Audio. */
export function prepareIntroMusic(): void {
  try {
    if (!preparedContext || preparedContext.state === "closed") {
      preparedContext = new AudioContext();
    }
    void preparedContext.resume().catch(() => undefined);
  } catch {
    // Audio is optional: unsupported devices must still enter the workspace.
  }
}

type Note = { at: number; duration: number; midi: number; volume: number; bell: boolean };
const BEAT = 0.75;
const BAR = BEAT * 4;
const chords = [
  [48, 55, 59, 64], // Cmaj7
  [45, 52, 55, 60], // Am7
  [41, 48, 52, 57], // Fmaj7
  [43, 50, 55, 59], // G
];
const melodies = [
  [76, 79, 81, 79, 76, 74],
  [72, 76, 79, 76, 74, 72],
  [69, 72, 76, 79, 76, 72],
  [71, 74, 79, 81, 79, 74],
  [76, 79, 84, 81, 79, 76],
  [72, 76, 81, 79, 76, 72],
  [69, 72, 76, 74, 72, 69],
  [71, 74, 79, 76, 74, 72],
];

function makeScore(): Note[] {
  const notes: Note[] = [];
  for (let bar = 0; bar < 20; bar += 1) {
    const chord = bar === 19 ? chords[0] : chords[bar % chords.length];
    chord.forEach((midi, index) => notes.push({
      at: bar * BAR + index * 0.04,
      duration: 3.4,
      midi,
      volume: index === 0 ? 0.18 : 0.1,
      bell: false,
    }));
    // Leave space between phrases and resolve softly in the final bar.
    const melody = bar === 19 ? [76, 72] : melodies[bar % melodies.length];
    const offsets = [0.5, 1, 1.5, 2.5, 3, 3.5];
    melody.forEach((midi, index) => notes.push({
      at: bar * BAR + offsets[index] * BEAT,
      duration: 1.7,
      midi,
      volume: index % 3 === 0 ? 0.24 : 0.18,
      bell: true,
    }));
  }
  return notes.sort((a, b) => a.at - b.at);
}

const score = makeScore();

/** Follow actual video playback, including buffering, pauses, seeks and dismissal. */
export function startIntroMusic(video: HTMLVideoElement): () => void {
  if (!preparedContext || preparedContext.state === "closed") prepareIntroMusic();
  const context = preparedContext;
  if (!context) return () => undefined;
  preparedContext = undefined;

  const output = context.createGain();
  output.gain.value = 0;
  output.connect(context.destination);
  const voices = new Set<OscillatorNode>();
  let interval: number | undefined;
  let cursor = 0;
  let disposed = false;
  let generation = 0;

  function playNote(note: Note, when: number): void {
    const envelope = context!.createGain();
    const length = note.duration / video.playbackRate;
    const fadeIn = Math.min(1, note.at / 1.5);
    const fadeOut = Math.max(0, Math.min(1, (60 - note.at) / 4));
    const peak = note.volume * fadeIn * fadeOut;
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(peak, when + (note.bell ? 0.012 : 0.18));
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
    envelope.connect(output);
    let remaining = 2;
    [1, 2].forEach((harmonic) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 440 * 2 ** ((note.midi - 69) / 12) * harmonic;
      gain.gain.value = harmonic === 1 ? 1 : note.bell ? 0.14 : 0.07;
      oscillator.connect(gain);
      gain.connect(envelope);
      voices.add(oscillator);
      oscillator.onended = () => {
        voices.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
        remaining -= 1;
        if (!remaining) envelope.disconnect();
      };
      oscillator.start(when);
      oscillator.stop(when + length + 0.02);
    });
  }

  function pause(): void {
    generation += 1;
    window.clearInterval(interval);
    interval = undefined;
    const now = context!.currentTime;
    output.gain.cancelScheduledValues(now);
    output.gain.setValueAtTime(output.gain.value, now);
    output.gain.linearRampToValueAtTime(0, now + 0.12);
    voices.forEach((oscillator) => {
      try { oscillator.stop(now + 0.13); } catch { /* Already stopped. */ }
    });
  }

  function schedule(): void {
    if (disposed || video.paused || video.ended || video.playbackRate <= 0) return;
    const position = video.currentTime;
    while (cursor < score.length && score[cursor].at < position + 0.4 * video.playbackRate) {
      const note = score[cursor++];
      if (note.at >= position - 0.06) {
        playNote(note, context!.currentTime + Math.max(0, (note.at - position) / video.playbackRate));
      }
    }
  }

  function play(): void {
    pause();
    const request = generation;
    void context!.resume().then(() => {
      if (disposed || request !== generation || video.paused || video.ended) return;
      cursor = score.findIndex((note) => note.at >= video.currentTime - 0.06);
      if (cursor < 0) cursor = score.length;
      const now = context!.currentTime;
      output.gain.cancelScheduledValues(now);
      output.gain.setValueAtTime(0, now);
      output.gain.linearRampToValueAtTime(0.22, now + 0.5);
      schedule();
      interval = window.setInterval(schedule, 100);
    }).catch(() => undefined);
  }

  const pauseEvents = ["pause", "waiting", "seeking", "ended", "error"] as const;
  const playEvents = ["playing", "seeked", "ratechange"] as const;
  pauseEvents.forEach((event) => video.addEventListener(event, pause));
  playEvents.forEach((event) => video.addEventListener(event, play));
  if (!video.paused && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) play();

  return () => {
    if (disposed) return;
    disposed = true;
    pauseEvents.forEach((event) => video.removeEventListener(event, pause));
    playEvents.forEach((event) => video.removeEventListener(event, play));
    pause();
    window.setTimeout(() => {
      output.disconnect();
      void context.close().catch(() => undefined);
    }, 160);
  };
}
