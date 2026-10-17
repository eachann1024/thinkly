import { EditorAction } from "@/components/editor/ui/button";
import { Pause, Play, VideoOff } from "@/components/ui/icons";
import { cn } from "@/components/editor/utils/cn";
import { useVideoPlayback } from "./useVideoPlayback";
import { VideoControls } from "./VideoControls";
import type { GooseVideoPlayerProps } from "./videoPlayerTypes";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/video/GooseVideoPlayer.tsx#messages:1">`
zh-Hans:
  videoPlayer: "视频播放器"
  theVideoCouldNotBeReadReplaceIt: "视频无法读取，请从上方工具栏更换"
  pause: "暂停"
  play: "播放"
en:
  videoPlayer: "Video player"
  theVideoCouldNotBeReadReplaceIt: "The video could not be read. Replace it using the toolbar above."
  pause: "Pause"
  play: "Play"
`;
const t = createTranslator(messages);


export function GooseVideoPlayer({
  src,
  className,
  onEnterBelow,
}: GooseVideoPlayerProps) {
  useLocale();
  const playback = useVideoPlayback(src);
  const {
    rootRef,
    videoRef,
    playing,
    controlsVisible,
    setControlsVisible,
    isFullscreen,
    ready,
    loadError,
    revealControls,
    togglePlay,
    toggleMute,
    toggleFullscreen,
  } = playback;
  return (
    <div
      ref={rootRef}
      className={cn("goose-video-player", className)}
      data-playing={playing ? "true" : "false"}
      data-controls={controlsVisible ? "visible" : "hidden"}
      data-ready={ready ? "true" : "false"}
      data-error={loadError ? "true" : "false"}
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (playing) setControlsVisible(false);
      }}
      onFocus={revealControls}
      tabIndex={0}
      role="group"
      aria-label={t("videoPlayer")}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "k" || e.key === "K") {
          e.preventDefault();
          e.stopPropagation();
          void togglePlay();
          return;
        }
        if (e.key === "m" || e.key === "M") {
          e.preventDefault();
          e.stopPropagation();
          toggleMute();
          return;
        }
        if (e.key === "f" || e.key === "F") {
          e.preventDefault();
          e.stopPropagation();
          void toggleFullscreen();
          return;
        }
        if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();
          onEnterBelow?.();
          return;
        }
        if (e.key === "Escape" && isFullscreen) {
          e.preventDefault();
          e.stopPropagation();
          void document.exitFullscreen().catch(() => {});
        }
      }}
    >
      <video
        key={src}
        ref={videoRef}
        src={src}
        className="goose-video-player__video"
        playsInline
        preload="metadata"
        // 不使用原生 controls；避免抢焦点与丑陋默认条
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          void togglePlay();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          void toggleFullscreen();
        }}
      />

      {loadError && (
        <div className="goose-video-player__error" role="status">
          <VideoOff aria-hidden="true" />
          <span>{t("theVideoCouldNotBeReadReplaceIt")}</span>
        </div>
      )}

      {/* 中央大播放钮：暂停态常显，播放态随控件淡出 */}
      {!loadError && (
        <EditorAction context="media"
          type="button"
          className="goose-video-player__center-play"
          aria-label={playing ? t("pause") : t("play")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            void togglePlay();
          }}
        >
          {playing ? (
            <Pause
              className="goose-video-player__center-icon"
              strokeWidth={1.75}
            />
          ) : (
            <Play
              className="goose-video-player__center-icon goose-video-player__center-icon--play"
              strokeWidth={1.75}
            />
          )}
        </EditorAction>
      )}

      <VideoControls playback={playback} />
    </div>
  );
}
