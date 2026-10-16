import { useCurrentFrame } from 'remotion';
import { EASE_SOFT, tween } from '../motion';
import { CREAM, CREAM_DISSOLVE, END_FADE, LIGHT_DISSOLVE } from '../timeline';

const fill = { position: 'absolute', inset: 0 } as const;

/** S2→S3：溶向奶油纸色再进下一镜。 */
export const CreamDissolve = () => {
  const f = useCurrentFrame();
  const up = tween(f, [CREAM_DISSOLVE.from, CREAM_DISSOLVE.cut], [0, 1], EASE_SOFT);
  const down = tween(f, [CREAM_DISSOLVE.cut, CREAM_DISSOLVE.to], [1, 0], EASE_SOFT);
  const o = f < CREAM_DISSOLVE.cut ? up : down;
  return o <= 0 ? null : <div style={{ ...fill, background: CREAM, opacity: o }} />;
};

/** S5→S6：萤火亮起成暖光，溶向阳光。 */
export const WarmLight = () => {
  const f = useCurrentFrame();
  const up = tween(f, [LIGHT_DISSOLVE.from, LIGHT_DISSOLVE.cut], [0, 1], EASE_SOFT);
  const down = tween(f, [LIGHT_DISSOLVE.cut, LIGHT_DISSOLVE.to], [1, 0], EASE_SOFT);
  const o = f < LIGHT_DISSOLVE.cut ? up : down;
  if (o <= 0) return null;
  return (
    <div
      style={{
        ...fill,
        opacity: o,
        background: 'radial-gradient(circle at 1130px 790px, #fff6d2 0%, #ffe9b0 55%, #fbdc9c 100%)',
      }}
    />
  );
};

export const endFade = (f: number) => tween(f, [END_FADE.from, END_FADE.to], [0, 1], EASE_SOFT);

/** 结尾溶向 #f6f1e4。 */
export const EndFade = () => {
  const o = endFade(useCurrentFrame());
  return o <= 0 ? null : <div style={{ ...fill, background: CREAM, opacity: o }} />;
};
