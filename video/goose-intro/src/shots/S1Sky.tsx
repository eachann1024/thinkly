import { useCurrentFrame } from 'remotion';
import { PlateImg } from '../layers/Grain';
import { EASE_GLIDE, tween } from '../motion';
import { HEIGHT, S1_PAN, WIDTH } from '../timeline';

const PLATE_H = Math.ceil((1728 / 1296) * WIDTH);

/** 自天空下摇到草地：竖向平移。 */
export const S1Sky = () => {
  const y = tween(useCurrentFrame(), [S1_PAN.from, S1_PAN.to], [0, -(PLATE_H - HEIGHT)], EASE_GLIDE);
  return <PlateImg name="plate-a-sky" style={{ left: 0, top: 0, width: WIDTH, height: PLATE_H, transform: `translateY(${y}px)` }} />;
};
