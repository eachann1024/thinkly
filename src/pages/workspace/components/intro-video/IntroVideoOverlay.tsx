import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import { useIntroVideo } from "@/stores/introVideo";
import "./intro-video.css";

const EXIT_MS = 360;
const POSTER_FALLBACK_MS = 600;
const base = import.meta.env.BASE_URL;

function IntroVideoLayer() {
  const hide = useIntroVideo((state) => state.hide);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(false);
  const [closing, setClosing] = useState(false);
  const exitTimer = useRef<number | undefined>(undefined);

  const markReady = useCallback(() => setReady(true), []);

  const close = useCallback(() => {
    if (exitTimer.current !== undefined) return;
    setClosing(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    exitTimer.current = window.setTimeout(hide, reduced ? 0 : EXIT_MS);
  }, [hide]);

  useEffect(() => {
    closeRef.current?.focus();
    const fallback = window.setTimeout(markReady, POSTER_FALLBACK_MS);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.clearTimeout(fallback);
      window.clearTimeout(exitTimer.current);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [close, markReady]);

  return (
    <div
      className="intro-video-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="欢迎视频"
      data-ready={ready}
      data-closing={closing}
    >
      <video
        className="intro-video-media"
        src={`${base}intro/goose-intro.mp4`}
        poster={`${base}intro/goose-intro-poster.jpg`}
        autoPlay
        muted
        playsInline
        onCanPlay={markReady}
        onPlaying={markReady}
        onEnded={close}
        onError={hide}
      />
      <Button
        ref={closeRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label="关闭"
        className="intro-video-close"
        onClick={close}
      >
        <GooseIcons.X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function IntroVideoOverlay() {
  const open = useIntroVideo((state) => state.open);
  return open ? <IntroVideoLayer /> : null;
}
