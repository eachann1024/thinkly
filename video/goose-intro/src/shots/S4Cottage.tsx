import { useCurrentFrame } from 'remotion';
import { leafMask } from '../layers/LeafWipe';
import { PlateImg } from '../layers/Grain';
import { EASE_GLIDE, EASE_SOFT, tween } from '../motion';
import { S4, S4_PAN, WARM_DISSOLVE, WIDTH } from '../timeline';

/** 横移 translateX 0→-5%，scale 1.12 固定；结尾向蓝调转色温。 */
export const S4Cottage = () => {
  const g = useCurrentFrame() + S4.from;
  const x = tween(g, [S4_PAN.from, S4_PAN.to], [0, -0.05 * WIDTH], EASE_GLIDE);
  const tint = tween(g, [WARM_DISSOLVE.from, WARM_DISSOLVE.to], [0, 0.55], EASE_SOFT);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...leafMask(g) }}>
      <PlateImg
        name="plate-d-cottage"
        style={{ inset: 0, width: '100%', height: '100%', transform: `translateX(${x}px) scale(1.12)` }}
      />
      <div style={{ position: 'absolute', inset: 0, background: '#4a6aa8', mixBlendMode: 'multiply', opacity: tint }} />
    </div>
  );
};
