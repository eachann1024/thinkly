/**
 * 欢迎动画窗口的纯几何：16:9，最大 1280×720。
 * 主进程与验收脚本共用，不依赖 Electron。
 */

export const WELCOME_VIDEO_WIDTH = 1280;
export const WELCOME_VIDEO_HEIGHT = 720;

export type Rect = { x: number; y: number; width: number; height: number };

/** 在工作区内居中放下 720p 画面；屏幕更小则等比缩小，不放大到 1080p。 */
export function welcomePresentationBounds(workArea: Rect): Rect {
  const aspect = WELCOME_VIDEO_WIDTH / WELCOME_VIDEO_HEIGHT;
  const scale = Math.min(
    1,
    workArea.width / WELCOME_VIDEO_WIDTH,
    workArea.height / WELCOME_VIDEO_HEIGHT,
  );
  let width = Math.max(1, Math.min(Math.round(WELCOME_VIDEO_WIDTH * scale), Math.floor(workArea.width)));
  let height = Math.max(1, Math.min(Math.round(WELCOME_VIDEO_HEIGHT * scale), Math.floor(workArea.height)));
  if (width / height > aspect) {
    width = Math.max(1, Math.min(Math.round(height * aspect), Math.floor(workArea.width)));
  } else {
    height = Math.max(1, Math.min(Math.round(width / aspect), Math.floor(workArea.height)));
  }
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height,
  };
}
