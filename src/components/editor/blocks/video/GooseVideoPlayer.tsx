import { EditorAction } from "@/components/editor/ui/button";
import { Pause, Play, VideoOff } from "@/components/ui/icons";
import { cn } from "@/components/editor/utils/cn";
import { useVideoPlayback } from "./useVideoPlayback";
import { VideoControls } from "./VideoControls";
import { useVideoPlaybackRate } from "./useVideoPlaybackRate";
import type { GooseVideoPlayerProps } from "./videoPlayerTypes";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/video/GooseVideoPlayer.tsx#messages:1">`
zh-Hans:
  videoPlayer: "视频播放器"
  theVideoCouldNotBeReadReplaceIt: "此视频无法预览，可下载原文件"
  pause: "暂停"
  play: "播放"
  download: "下载原文件"
en:
  videoPlayer: "Video player"
  theVideoCouldNotBeReadReplaceIt: "This video cannot be previewed. Download the original file."
  pause: "Pause"
  play: "Play"
  download: "Download original"
ja:
  videoPlayer: "ビデオプレーヤー"
  theVideoCouldNotBeReadReplaceIt: "このビデオは再生できません。元のファイルをダウンロードしてください"
  pause: "一時停止"
  play: "再生"
  download: "元のファイルをダウンロード"
`;
const t = createTranslator(messages);


export function GooseVideoPlayer({
  src,
  className,
  onEnterBelow,
  onDownload,
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
  const playbackRate = useVideoPlaybackRate(src, videoRef, rootRef);
  return (
    <div
      ref={rootRef}
      className={cn("goose-video-player", className)}
      data-playing={playing ? "true" : "false"}
      data-controls={controlsVisible ? "visible" : "hidden"}
      data-ready={ready ? "true" : "false"}
      data-error={loadError ? "true" : "false"}
      data-boosting={playbackRate.boosting ? "true" : "false"}
      onPointerDownCapture={playbackRate.onPointerDownCapture}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (playing && !rootRef.current?.contains(document.activeElement)) setControlsVisible(false);
      }}
      onFocus={revealControls}
      tabIndex={0}
      role="group"
      aria-label={t("videoPlayer")}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
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
          {onDownload && <EditorAction type="button" context="media" onClick={onDownload}>{t("download")}</EditorAction>}
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

      {playbackRate.boosting && <span className="goose-video-player__boost" role="status">3×</span>}
      <VideoControls playback={playback} playbackRate={playbackRate} />
    </div>
  );
}
