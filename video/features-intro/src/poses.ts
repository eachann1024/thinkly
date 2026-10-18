import type { Pose } from "./components/PixelArt";

/** 主角姿势表（绝对帧号）：切帧无补间，每段驻留 ≥ 20 帧，切点尽量落在拍点。 */
export const POSE_TRACK: Array<[number, Pose]> = [
  [0, "wave"],
  [60, "fail"],
  [210, "blink"],
  [234, "fail"],
  [270, "open"],
  [390, "main"],
  [480, "open"],
  [510, "main"],
  [750, "open"],
  [870, "blink"],
  [894, "main"],
  [990, "open"],
  [1110, "main"],
  [1440, "open"],
  [1560, "blink"],
  [1584, "main"],
  [1680, "open"],
  [1800, "main"],
  [2010, "fail"],
  [2130, "open"],
  [2220, "main"],
  [2412, "open"],
];

export function poseAt(frame: number): Pose {
  let pose = POSE_TRACK[0][1];
  for (const [start, next] of POSE_TRACK) {
    if (frame >= start) pose = next;
  }
  return pose;
}
