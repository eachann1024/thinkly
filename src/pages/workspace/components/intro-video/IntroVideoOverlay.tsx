import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/intro-video/IntroVideoOverlay.tsx#localMessages:1">`
zh-Hans:
  welcomeVideo: "欢迎视频"
  closeWelcomeAnimation: "关闭欢迎动画"
  closeWelcomeAnimationEsc: "关闭欢迎动画（Esc）"
  muteWelcomeAnimation: "静音"
  unmuteWelcomeAnimation: "取消静音"
en:
  welcomeVideo: "Welcome video"
  closeWelcomeAnimation: "Close welcome animation"
  closeWelcomeAnimationEsc: "Close welcome animation (Esc)"
  muteWelcomeAnimation: "Mute"
  unmuteWelcomeAnimation: "Unmute"
ja:
  welcomeVideo: "ウェルカムビデオ"
  closeWelcomeAnimation: "ウェルカムアニメーションを閉じる"
  closeWelcomeAnimationEsc: "ウェルカムアニメーションを閉じる（Esc）"
  muteWelcomeAnimation: "ミュート"
  unmuteWelcomeAnimation: "ミュート解除"
`;
const uiText = createTranslator(localMessages);
import { useCallback, useEffect, useRef, useReducer, useState } from "react";
import { createPortal } from "react-dom";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { INTRO_MUSIC_GAIN, startIntroMusic, type IntroMusicHandle } from "./introMusic";
import { Button } from "@/components/ui/button";
import * as GooseIcons from "@/components/ui/icons";
import { useIntroVideo } from "@/stores/introVideo";
import "./intro-video.css";
import { introVideoReducer } from "./introVideoState";

const EXIT_MS = 360;
const POSTER_FALLBACK_MS = 600;
const base = import.meta.env.BASE_URL;

function IntroVideoLayer() {
  useLocale();
  const hide = useIntroVideo((state) => state.hide);
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<IntroMusicHandle | null>(null);
  const mutedRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [muted, setMuted] = useState(false);
  const [state, dispatch] = useReducer(introVideoReducer, { status: "loading" });
  const ready = state.status === "ready" || (state.status === "closing" && state.ready);
  const closing = state.status === "closing";
  const exitTimer = useRef<number | undefined>(undefined);

  const markReady = useCallback(() => dispatch({ type: "ready" }), []);
  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    musicRef.current?.setMuted(next);
  }, []);

  const close = useCallback(() => {
    if (exitTimer.current !== undefined) return;
    musicRef.current?.stop();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    dispatch({ type: "close" });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    exitTimer.current = window.setTimeout(hide, reduced ? 0 : EXIT_MS);
  }, [hide]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const video = videoRef.current;
    if (video) {
      video.volume = INTRO_MUSIC_GAIN;
      const music = startIntroMusic(video);
      music.setMuted(mutedRef.current);
      musicRef.current = music;
    }
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
      musicRef.current?.stop();
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
          type="button"
          variant="outline"
          size="icon"
          aria-pressed={muted}
          aria-label={uiText(muted ? "unmuteWelcomeAnimation" : "muteWelcomeAnimation")}
          title={uiText(muted ? "unmuteWelcomeAnimation" : "muteWelcomeAnimation")}
          className="intro-video-control intro-video-mute"
          onClick={toggleMute}
        >
          {muted ? <GooseIcons.VolumeX className="h-4 w-4" /> : <GooseIcons.Volume2 className="h-4 w-4" />}
        </Button>
        <Button
          ref={closeRef}
          type="button"
          variant="outline"
          size="icon"
          aria-label={uiText("closeWelcomeAnimation")}
          title={uiText("closeWelcomeAnimationEsc")}
          className="intro-video-control intro-video-close"
          onClick={close}
        >
          <span className="intro-video-x">
            <GooseIcons.X className="intro-video-x-line h-4 w-4" weight="bold" />
            <GooseIcons.X className="intro-video-x-solid h-4 w-4" weight="fill" />
          </span>
        </Button>
      </div>
    </div>
  );
}

function IntroVideoSequence() {
  useLocale();
  const [prepared, setPrepared] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const desktop = getGooseDesktop();
    const timer = window.setTimeout(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      void (async () => {
        try {
          await desktop?.prepareWelcomeWindow(reduced);
        } catch (error) {
          console.warn("Welcome window preparation failed", error);
        }
        if (!cancelled) setPrepared(true);
      })();
    }, 1000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      void desktop?.restoreWelcomeWindow();
    };
  }, []);
  return prepared ? <IntroVideoLayer /> : null;
}

export function IntroVideoOverlay() {
  useLocale();
  const open = useIntroVideo((state) => state.open);
  return open ? createPortal(<IntroVideoSequence />, document.body) : null;
}
