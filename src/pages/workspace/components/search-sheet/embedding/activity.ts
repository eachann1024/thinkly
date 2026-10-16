/** 后台索引的让路条件：用户输入、窗口隐藏、电池状态。 */
const INPUT_QUIET_MS = 2000;
const LOW_BATTERY = 0.2;

interface BatteryLike extends EventTarget { charging: boolean; level: number }

let lastInput = Date.now();
let armed = false;
let battery: BatteryLike | null = null;

export function armActivity() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const mark = () => { lastInput = Date.now(); };
  for (const type of ["keydown", "pointerdown", "pointermove", "wheel"]) window.addEventListener(type, mark, { capture: true, passive: true });
  const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryLike> }).getBattery;
  void getBattery?.call(navigator).then(manager => { battery = manager; }).catch(() => {});
}

export const idleMs = () => Date.now() - lastInput;

/** 当前是否应暂停后台索引。 */
export function shouldPause() {
  if (document.hidden || Date.now() - lastInput < INPUT_QUIET_MS) return true;
  return Boolean(battery && !battery.charging && battery.level < LOW_BATTERY);
}

/** 休眠倍数：基础为推理耗时的 2 倍（约 1/3 占空比），用电池时再翻倍（约 1/5）。 */
export function sleepFactor() {
  return battery && !battery.charging ? 4 : 2;
}

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function waitUntilRunnable() {
  while (shouldPause()) await sleep(1000);
}
