import { useCurrentFrame } from 'remotion';
import { Gate } from '../layers/Gate';
import { PlateImg } from '../layers/Grain';
import { EASE_GLIDE, tween } from '../motion';
import { HEIGHT, LIGHT_DISSOLVE, S6, S6_PAN, WIDTH } from '../timeline';

const SCALE = 1.12;
const WINDOW = { x: 0.696, y: 0.253, r: 0.108 * WIDTH };

const panX = (g: number) => tween(g, [S6_PAN.from, S6_PAN.to], [0.04 * WIDTH, -0.04 * WIDTH], EASE_GLIDE);

/** 圆窗在屏幕上的位置与半径，供 S7 的圆形匹配转场使用。 */
export const windowOnScreen = (g: number) => ({
  x: WIDTH / 2 + (WINDOW.x - 0.5) * WIDTH * SCALE + panX(g),
  y: HEIGHT / 2 + (WINDOW.y - 0.5) * HEIGHT * SCALE,
  r: WINDOW.r * SCALE,
});

/** 自左向右平移书架，停在圆窗。 */
export const S6Library = () => {
  const x = panX(useCurrentFrame() + S6.from);
  return (
    <Gate from={LIGHT_DISSOLVE.cut - S6.from}>
      <PlateImg
        name="plate-f-library"
        style={{ inset: 0, width: '100%', height: '100%', transform: `translateX(${x}px) scale(${SCALE})` }}
      />
    </Gate>
  );
};
