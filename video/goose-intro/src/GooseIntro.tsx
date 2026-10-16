import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { CAPTIONS } from './captions';
import { CaptionCard } from './layers/Caption';
import { CloudWipe } from './layers/CloudWipe';
import { CreamDissolve, EndFade, WarmLight, endFade } from './layers/Dissolves';
import { Grain, PaperTexture, Vignette } from './layers/Grain';
import { LeafWipe } from './layers/LeafWipe';
import { S1Sky } from './shots/S1Sky';
import { S2Window } from './shots/S2Window';
import { S3Desk } from './shots/S3Desk';
import { S4Cottage } from './shots/S4Cottage';
import { S5Evening } from './shots/S5Evening';
import { S6Library } from './shots/S6Library';
import { S7Sunset } from './shots/S7Sunset';
import { CREAM, S1, S2, S3, S4, S5, S6, S7, dur } from './timeline';
import './fonts';

/** 转场帧让前一镜多留到转场结束，后一镜在遮挡切点前保持隐藏。 */
const SHOTS = [
  { r: S1, el: <S1Sky />, tail: 1 },
  { r: S2, el: <S2Window />, tail: 1 },
  { r: S3, el: <S3Desk />, tail: 22 },
  { r: S4, el: <S4Cottage />, tail: 1 },
  { r: S5, el: <S5Evening />, tail: 1 },
  { r: S6, el: <S6Library />, tail: 1 },
  { r: S7, el: <S7Sunset />, tail: 1 },
];

export const GooseIntro = () => {
  const frame = useCurrentFrame();
  const post = 1 - endFade(frame);
  return (
    <AbsoluteFill style={{ background: CREAM, overflow: 'hidden' }}>
      {SHOTS.map(({ r, el, tail }) => (
        <Sequence key={r.from} from={r.from} durationInFrames={dur(r) + tail - 1}>
          {el}
        </Sequence>
      ))}
      {CAPTIONS.map((c) => (
        <CaptionCard key={c.title} def={c} />
      ))}
      <CloudWipe />
      <LeafWipe />
      <CreamDissolve />
      <WarmLight />
      <EndFade />
      <div style={{ position: 'absolute', inset: 0, opacity: post }}>
        <PaperTexture />
        <Vignette />
        <Grain />
      </div>
    </AbsoluteFill>
  );
};
