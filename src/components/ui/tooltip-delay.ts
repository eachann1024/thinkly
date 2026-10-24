export const TOOLTIP_DELAY_MS = 400;

export function resolveTooltipDelayDuration(delayDuration: number): number {
  if (delayDuration === 0 || delayDuration === 600) return TOOLTIP_DELAY_MS;
  return delayDuration;
}
