import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/intro-video/IntroVideoOverlay.tsx#localMessages:1">`
zh-Hans:
  welcomeVideo: "欢迎视频"
  closeWelcomeAnimation: "关闭欢迎动画"
  closeWelcomeAnimationEsc: "关闭欢迎动画（Esc）"
en:
  welcomeVideo: "Welcome video"
  closeWelcomeAnimation: "Close welcome animation"
  closeWelcomeAnimationEsc: "Close welcome animation (Esc)"
`;
const uiText = createTranslator(localMessages);
import { useCallback, useEffect, useRef, useReducer, useState } from "react";
import { createPortal } from "react-dom";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { startIntroMusic } from "./introMusic";
import { Button } from "@/components/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import { useIntroVideo } from "@/stores/introVideo";
import "./intro-video.css";
import { introVideoReducer } from "./introVideoState";

const EXIT_MS = 360;
const POSTER_FALLBACK_MS = 600;
const base = import.meta.env.BASE_URL;

function IntroVideoLayer() {
  const hide = useIntroVideo((state) => state.hide);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopMusic = useRef<(() => void) | undefined>(undefined);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [state, dispatch] = useReducer(introVideoReducer, { status: "loading" });
  const ready = state.status === "ready" || (state.status === "closing" && state.ready);
  const closing = state.status === "closing";
  const exitTimer = useRef<number | undefined>(undefined);

  const markReady = useCallback(() => dispatch({ type: "ready" }), []);

  const close = useCallback(() => {
    if (exitTimer.current !== undefined) return;
    stopMusic.current?.();
    videoRef.current?.pause();
    dispatch({ type: "close" });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    exitTimer.current = window.setTimeout(hide, reduced ? 0 : EXIT_MS);
  }, [hide]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    if (videoRef.current) stopMusic.current = startIntroMusic(videoRef.current);
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
      stopMusic.current?.();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
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
      aria-label={uiText("welcomeVideo")}
      data-ready={ready}
      data-closing={closing}
    >
      <video
        ref={videoRef}
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
      <div className="intro-video-controls">
        <Button
          ref={closeRef}
          type="button"
          variant="outline"
          size="icon"
          aria-label={uiText("closeWelcomeAnimation")}
          title={uiText("closeWelcomeAnimationEsc")}
          className="intro-video-close"
          onClick={close}
        >
          <GooseIcons.X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function IntroVideoSequence() {
  const [prepared, setPrepared] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      void (async () => {
        try {
          await getGooseDesktop()?.prepareWelcomeWindow(reduced);
        } catch (error) {
          console.warn("Welcome window preparation failed", error);
        }
        if (!cancelled) setPrepared(true);
      })();
    }, 1000);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);
  return prepared ? <IntroVideoLayer /> : null;
}

export function IntroVideoOverlay() {
  const open = useIntroVideo((state) => state.open);
  return open ? createPortal(<IntroVideoSequence />, document.body) : null;
}
