import { EditorAction } from "@/components/editor/ui/button";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "@/components/ui/icons";
import { formatTime } from "./videoTime";
import type { useVideoPlayback } from "./useVideoPlayback";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/video/VideoControls.tsx#messages:1">`
zh-Hans:
  playbackProgress: "播放进度"
  pause: "暂停"
  play: "播放"
  unmute: "取消静音"
  mute: "静音"
  exitFullScreen: "退出全屏"
  fullScreen: "全屏"
en:
  playbackProgress: "Playback progress"
  pause: "Pause"
  play: "Play"
  unmute: "Unmute"
  mute: "Mute"
  exitFullScreen: "Exit full screen"
  fullScreen: "Full screen"
`;
const t = createTranslator(messages);


export function VideoControls({
  playback,
}: {
  playback: ReturnType<typeof useVideoPlayback>;
}) {
  const {
    playing,
    current,
    seekBy,
    duration,
    muted,
    volume,
    isFullscreen,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    onProgressPointerDown,
    progress,
  } = playback;
  return (
    <div className="goose-video-player__chrome">
      <div className="goose-video-player__gradient" aria-hidden="true" />

      <div
        className="goose-video-player__progress"
        role="slider"
        aria-label={t("playbackProgress")}
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration) || 0}
        aria-valuenow={Math.floor(current)}
        aria-valuetext={`${formatTime(current)} / ${formatTime(duration)}`}
        tabIndex={0}
        onPointerDown={onProgressPointerDown}
        onKeyDown={(e) => {
          if (!duration) return;
          const step = e.shiftKey ? 10 : 5;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            seekBy(-step);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            seekBy(step);
          }
        }}
      >
        <div className="goose-video-player__progress-track">
          <div
            className="goose-video-player__progress-fill"
            style={{ width: `${progress}%` }}
          />
          <div
            className="goose-video-player__progress-thumb"
            style={{ left: `${progress}%` }}
          />
        </div>
      </div>

      <div className="goose-video-player__bar">
        <div className="goose-video-player__bar-left">
          <EditorAction context="media"
            type="button"
            className="goose-video-player__btn"
            aria-label={playing ? t("pause") : t("play")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              void togglePlay();
            }}
          >
            {playing ? (
              <Pause size={16} strokeWidth={1.75} />
            ) : (
              <Play
                size={16}
                strokeWidth={1.75}
                className="goose-video-player__icon-play"
              />
            )}
          </EditorAction>

          <EditorAction context="media"
            type="button"
            className="goose-video-player__btn"
            aria-label={muted || volume === 0 ? t("unmute") : t("mute")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
          >
            {muted || volume === 0 ? (
              <VolumeX size={16} strokeWidth={1.75} />
            ) : (
              <Volume2 size={16} strokeWidth={1.75} />
            )}
          </EditorAction>

          <span className="goose-video-player__time">
            {formatTime(current)}
            <span className="goose-video-player__time-sep">/</span>
            {formatTime(duration)}
          </span>
        </div>

        <div className="goose-video-player__bar-right">
          <EditorAction context="media"
            type="button"
            className="goose-video-player__btn"
            aria-label={isFullscreen ? t("exitFullScreen") : t("fullScreen")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              void toggleFullscreen();
            }}
          >
            {isFullscreen ? (
              <Minimize2 size={16} strokeWidth={1.75} />
            ) : (
              <Maximize2 size={16} strokeWidth={1.75} />
            )}
          </EditorAction>
        </div>
      </div>
    </div>
  );
}
