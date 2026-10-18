import { createChecker } from "./lib/check";
import { INTRO_MUSIC_GAIN, introOutputGain } from "../../src/pages/workspace/components/intro-video/introMusic";
import {
  WELCOME_VIDEO_HEIGHT,
  WELCOME_VIDEO_WIDTH,
  welcomePresentationBounds,
  type Rect,
} from "../../src/lib/electron/welcomeWindow";

function aspectGap(bounds: Rect): number {
  return Math.abs(bounds.width / bounds.height - WELCOME_VIDEO_WIDTH / WELCOME_VIDEO_HEIGHT);
}

/** 欢迎动画：窗口停在 720p，音量是满幅的 25%。 */
export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;

  console.log("· 播放窗口");
  check("目标是 720p 而不是 1080p", WELCOME_VIDEO_WIDTH === 1280 && WELCOME_VIDEO_HEIGHT === 720);
  const desktop = welcomePresentationBounds({ x: 0, y: 0, width: 1920, height: 1080 });
  check(
    "1920×1080 工作区居中放下 1280×720",
    desktop.x === 320 && desktop.y === 180 && desktop.width === 1280 && desktop.height === 720,
    desktop,
  );
  const large = welcomePresentationBounds({ x: 0, y: 0, width: 2560, height: 1440 });
  check("更大的屏幕不再放大", large.width === 1280 && large.height === 720, large);
  const wide = welcomePresentationBounds({ x: 0, y: 25, width: 1440, height: 900 });
  check("宽屏仍是 720p 并水平居中", wide.width === 1280 && wide.height === 720 && wide.x === 80 && wide.y === 115, wide);
  const narrow = welcomePresentationBounds({ x: 10, y: 20, width: 800, height: 900 });
  check(
    "窄屏等比缩小且不留白边所需的比例",
    narrow.width === 800 && narrow.height === 450 && aspectGap(narrow) < 0.005 && narrow.x === 10,
    narrow,
  );
  const short = welcomePresentationBounds({ x: -1920, y: -200, width: 1000, height: 700 });
  check(
    "矮屏缩在工作区内并保持 16:9",
    short.width <= 1000 && short.height <= 700 && short.x >= -1920 && short.y >= -200
      && short.x + short.width <= -1920 + 1000 && short.y + short.height <= -200 + 700
      && aspectGap(short) < 0.005,
    short,
  );

  console.log("· 音量");
  check("播放音量是 25%", INTRO_MUSIC_GAIN === 0.25 && introOutputGain(false) === 0.25);
  check("静音时输出为 0", introOutputGain(true) === 0);

  return checker.failed;
}
