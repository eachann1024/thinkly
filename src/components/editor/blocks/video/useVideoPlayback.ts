import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { videoPlaybackReducer } from "./videoPlaybackState";

export function useVideoPlayback(src: string) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const pointerCleanupRef = useRef<(() => void) | null>(null);
  const soundRef = useRef({ muted: false, volume: 1 });

  const [media, dispatch] = useReducer(videoPlaybackReducer, { phase: "loading", source: src });
  const sourceRef = useRef(src);
  sourceRef.current = src;
  const ready = media.source === src && media.phase === "ready";
  const playing = ready && media.playback === "playing";
  const current = ready ? media.current : 0;
  const duration = ready ? media.duration : 0;
  const loadError = media.source === src && media.phase === "error";
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [seeking, setSeeking] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  useLayoutEffect(() => {
    dispatch({ type: "source-changed", source: src });
    clearHideTimer();
    pointerCleanupRef.current?.();
    setSeeking(false);
    setControlsVisible(true);
    const video = videoRef.current;
    if (video) {
      video.muted = soundRef.current.muted;
      video.volume = soundRef.current.volume;
    }
    return () => pointerCleanupRef.current?.();
  }, [src, clearHideTimer]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    if (!playing) return;
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 2200);
  }, [clearHideTimer, playing]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    return () => clearHideTimer();
  }, [clearHideTimer]);

  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const isCurrent = () => videoRef.current === video && sourceRef.current === src;
    const onPlay = () => {
      if (isCurrent() && !video.error && !video.paused) dispatch({ type: "played", source: src });
    };
    const onPause = () => {
      if (!isCurrent()) return;
      dispatch({ type: "paused", source: src });
      setControlsVisible(true);
      clearHideTimer();
    };
    const onTime = () => {
      if (isCurrent() && !seeking) dispatch({ type: "time-updated", source: src, current: video.currentTime });
    };
    const onMeta = () => {
      if (!isCurrent() || video.error || video.readyState < 1) return;
      dispatch({ type: "metadata-loaded", source: src, duration: video.duration || 0,
        current: video.currentTime, playing: !video.paused });
    };
    const onVolume = () => {
      if (!isCurrent()) return;
      soundRef.current = { muted: video.muted, volume: video.volume };
      setMuted(video.muted);
      setVolume(video.volume);
    };
    const onEnded = () => {
      if (!isCurrent()) return;
      dispatch({ type: "ended", source: src });
      setControlsVisible(true);
      clearHideTimer();
    };
    const onError = () => {
      if (!isCurrent()) return;
      dispatch({ type: "failed", source: src });
      setControlsVisible(true);
      clearHideTimer();
    };
    const listeners = { play: onPlay, pause: onPause, timeupdate: onTime,
      loadedmetadata: onMeta, volumechange: onVolume, ended: onEnded, error: onError };
    for (const [event, handler] of Object.entries(listeners)) video.addEventListener(event, handler);
    return () => {
      for (const [event, handler] of Object.entries(listeners)) video.removeEventListener(event, handler);
    };
  }, [clearHideTimer, seeking, src]);

  useEffect(() => {
    const onFsChange = () => {
      const el = rootRef.current;
      setIsFullscreen(Boolean(el && document.fullscreenElement === el));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    revealControls();
    try {
      if (video.paused) await video.play();
      else video.pause();
    } catch {
    }
  }, [revealControls]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) {
      video.volume = 0.9;
    }
    revealControls();
  }, [revealControls]);

  const toggleFullscreen = useCallback(async () => {
    const root = rootRef.current;
    if (!root) return;
    try {
      if (document.fullscreenElement === root) {
        await document.exitFullscreen();
      } else {
        await root.requestFullscreen();
      }
    } catch {
    }
    revealControls();
  }, [revealControls]);

  const seekToClientX = useCallback(
    (clientX: number, target: HTMLElement) => {
      const video = videoRef.current;
      if (!video || !duration || sourceRef.current !== src) return;
      const rect = target.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (clientX - rect.left) / rect.width),
      );
      const next = ratio * duration;
      video.currentTime = next;
      dispatch({ type: "time-updated", source: src, current: next });
    },
    [duration, src],
  );

  const onProgressPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      pointerCleanupRef.current?.();
      const track = event.currentTarget;
      setSeeking(true);
      seekToClientX(event.clientX, track);
      track.setPointerCapture(event.pointerId);

      const onMove = (e: PointerEvent) => seekToClientX(e.clientX, track);
      const onUp = (e: PointerEvent) => {
        setSeeking(false);
        seekToClientX(e.clientX, track);
        cleanup();
        revealControls();
      };
      const pointerId = event.pointerId;
      const cleanup = () => {
        if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
        track.removeEventListener("pointermove", onMove);
        track.removeEventListener("pointerup", onUp);
        track.removeEventListener("pointercancel", onUp);
        pointerCleanupRef.current = null;
      };
      pointerCleanupRef.current = cleanup;
      track.addEventListener("pointermove", onMove);
      track.addEventListener("pointerup", onUp);
      track.addEventListener("pointercancel", onUp);
    },
    [revealControls, seekToClientX],
  );

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || !duration || sourceRef.current !== src) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + delta));
    dispatch({ type: "time-updated", source: src, current: video.currentTime });
    revealControls();
  }, [duration, revealControls, src]);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return {
    rootRef,
    videoRef,
    playing,
    current,
    seekBy,
    duration,
    muted,
    volume,
    controlsVisible,
    setControlsVisible,
    isFullscreen,
    ready,
    loadError,
    revealControls,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    onProgressPointerDown,
    progress,
  };
}
