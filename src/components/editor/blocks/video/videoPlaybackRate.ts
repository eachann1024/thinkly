export const VIDEO_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;
export const VIDEO_HOLD_DELAY_MS = 200;
export type VideoPlaybackRateState = { selectedRate: number; boosting: boolean };

export function createVideoPlaybackRateController(
  media: Pick<HTMLVideoElement, "playbackRate">,
  notify: (state: VideoPlaybackRateState) => void,
  scheduler: { schedule: (callback: () => void, delay: number) => number; cancel: (id: number) => void },
  initialRate = 1,
) {
  let selectedRate = initialRate;
  let boosting = false;
  let timer: number | null = null;
  const publish = () => notify({ selectedRate, boosting });
  const apply = () => { media.playbackRate = boosting ? 3 : selectedRate; };
  const endHold = () => {
    if (timer !== null) scheduler.cancel(timer);
    timer = null;
    boosting = false;
    apply();
    publish();
  };
  apply();
  return {
    beginHold() {
      if (timer !== null || boosting) return;
      timer = scheduler.schedule(() => {
        timer = null;
        boosting = true;
        apply();
        publish();
      }, VIDEO_HOLD_DELAY_MS);
    },
    endHold,
    selectRate(rate: number) {
      if (!(VIDEO_PLAYBACK_RATES as readonly number[]).includes(rate)) return;
      selectedRate = rate;
      apply();
      publish();
    },
    syncRate() {
      if (boosting) {
        if (media.playbackRate !== 3) apply();
      } else if (Number.isFinite(media.playbackRate) && media.playbackRate > 0) {
        selectedRate = media.playbackRate;
        publish();
      }
    },
    getState: () => ({ selectedRate, boosting }),
  };
}
