import { useCurrentFrame } from 'remotion';
import { Fireflies } from '../layers/Fireflies';
import { PlateImg } from '../layers/Grain';
import { EASE_SOFT, tween } from '../motion';
import { S5, WARM_DISSOLVE } from '../timeline';

/** 萤火汇聚；入场与 S4 的色温溶解同步。 */
export const S5Evening = () => {
  const o = tween(useCurrentFrame() + S5.from, [WARM_DISSOLVE.from, WARM_DISSOLVE.to], [0, 1], EASE_SOFT);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <PlateImg name="plate-e-evening" style={{ inset: 0, width: '100%', height: '100%' }} />
      <Fireflies />
    </div>
  );
};
