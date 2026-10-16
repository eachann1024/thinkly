import type { CSSProperties } from 'react';
import { useCurrentFrame } from 'remotion';
import { FONT_FAMILY } from '../fonts';
import { EASE_EXIT, EASE_TEXT_IN, SPRING_TEXT, springAt, tween } from '../motion';
import { CAPTION_IN, CAPTION_OUT, INK } from '../timeline';

export type CaptionDef = {
  title: string;
  subtitle?: string;
  at: number;
  outAt: number;
  box: CSSProperties;
};

export const paperCard: CSSProperties = {
  background: 'rgba(250,245,232,0.82)',
  borderRadius: '30px 36px 28px 40px / 38px 28px 40px 30px',
  boxShadow: '0 8px 28px rgba(90,70,40,0.12)',
  border: '1px solid rgba(160,130,80,0.16)',
  color: INK,
  fontFamily: FONT_FAMILY,
};

export const CaptionCard = ({ def }: { def: CaptionDef }) => {
  const frame = useCurrentFrame();
  const { at, outAt, title, subtitle, box } = def;
  if (frame < at || frame > outAt + CAPTION_OUT) return null;
  const fadeIn = tween(frame, [at, at + CAPTION_IN], [0, 1], EASE_TEXT_IN);
  const fadeOut = tween(frame, [outAt, outAt + CAPTION_OUT], [1, 0], EASE_EXIT);
  const rise = (1 - springAt(frame, at, SPRING_TEXT)) * 24;
  return (
    <div style={{ position: 'absolute', display: 'flex', justifyContent: 'center', ...box }}>
      <div
        style={{
          ...paperCard,
          padding: subtitle ? '26px 48px 28px' : '24px 48px 26px',
          opacity: fadeIn * fadeOut,
          transform: `translateY(${rise}px)`,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 56, lineHeight: 1.25, letterSpacing: 2 }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 30, lineHeight: 1.4, marginTop: 8, opacity: 0.8 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
