export type OrbitDot = {
  x: number;
  y: number;
  size: number;
  opacity: number;
};

export type OrbitComet = {
  x: number;
  y: number;
  opacity: number;
  delay: number;
};

export type OrbitPath = {
  duration: number;
  size: number;
  dots: OrbitComet[];
};

export type OrbitField = {
  rings: { delay: number; dots: OrbitDot[] }[];
  orbits: OrbitPath[];
  star: OrbitDot[];
  core: OrbitDot[];
};

const round = (value: number) => Math.round(value * 100) / 100;

function buildRings(): OrbitField["rings"] {
  const rings = Array.from({ length: 8 }, (_, index) => ({
    delay: round(index * 0.35),
    dots: [] as OrbitDot[],
  }));
  for (let y = -260; y <= 500; y += 20) {
    for (let x = -200; x <= 200; x += 20) {
      const distance = Math.hypot(x, y);
      if (distance < 170) continue;
      const index = Math.min(7, Math.floor((distance - 170) / 45));
      rings[index].dots.push({
        x,
        y,
        size: 2,
        opacity: round(Math.max(0.3, 1 - (distance - 170) / 520)),
      });
    }
  }
  return rings;
}

/** Lattice is centered on 0. The mockup phase (start at -R) never samples v < 0.3, so the core is empty. */
function buildStar(
  radius: number,
  step: number,
  coreBelow: number,
  sizeAt: (v: number) => number,
) {
  const star: OrbitDot[] = [];
  const core: OrbitDot[] = [];
  const start = -Math.floor(radius / step) * step;
  for (let y = start; y <= radius; y += step) {
    for (let x = start; x <= radius; x += step) {
      const v = Math.sqrt(Math.abs(x) / radius) + Math.sqrt(Math.abs(y) / radius);
      if (v > 1) continue;
      const dot = { x, y, size: sizeAt(v), opacity: round(1 - v * 0.6) };
      (v < coreBelow ? core : star).push(dot);
    }
  }
  return { star, core };
}

function buildOrbit(a: number, b: number, tilt: number, count: number, duration: number, size: number): OrbitPath {
  const rad = (tilt * Math.PI) / 180;
  const dots: OrbitComet[] = [];
  for (let i = 0; i < count; i += 1) {
    const theta = (i / count) * Math.PI * 2;
    const ex = a * Math.cos(theta);
    const ey = b * Math.sin(theta);
    dots.push({
      x: round(ex * Math.cos(rad) - ey * Math.sin(rad)),
      y: round(ex * Math.sin(rad) + ey * Math.cos(rad)),
      opacity: Math.sin(theta) > 0 ? 0.95 : 0.4,
      delay: round(-duration * (1 - i / count)),
    });
  }
  return { duration, size, dots };
}

export const IDLE_ORBIT_FIELD: OrbitField = {
  rings: buildRings(),
  orbits: [
    buildOrbit(92, 92 * 0.34, -18, 48, 5, 3),
    buildOrbit(122, 122 * 0.34, 30, 60, 7.5, 3),
    buildOrbit(150, 150 * 0.34, -64, 72, 10, 3),
  ],
  ...buildStar(44, 5, 0.5, (v) => (v < 0.3 ? 4 : v < 0.65 ? 3 : 2)),
};

export const RUN_ORBIT_MARK: OrbitField = {
  rings: [],
  orbits: [buildOrbit(15, 6, -24, 20, 1.4, 2)],
  ...buildStar(8, 2, 0.35, (v) => (v < 0.35 ? 2.4 : 1.6)),
};
