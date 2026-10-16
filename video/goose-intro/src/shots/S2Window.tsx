import { useCurrentFrame } from 'remotion';
import { Gate } from '../layers/Gate';
import { PlateImg } from '../layers/Grain';
import { EASE_SOFT, tween } from '../motion';
import { CLOUD_WIPE, S2, S2_PUSH } from '../timeline';

/** 朝摊开的笔记本缓推，原点在笔记本。 */
export const S2Window = () => {
  const s = tween(useCurrentFrame() + S2.from, [S2_PUSH.from, S2_PUSH.to], [1, 1.1], EASE_SOFT);
  return (
    <Gate from={CLOUD_WIPE.cut - S2.from}>
      <PlateImg
        name="plate-b-window"
        style={{ inset: 0, width: '100%', height: '100%', transformOrigin: '52% 72%', transform: `scale(${s})` }}
      />
    </Gate>
  );
};
