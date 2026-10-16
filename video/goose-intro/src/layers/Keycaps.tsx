import { useCurrentFrame } from 'remotion';
import { FONT_FAMILY } from '../fonts';
import { EASE_EXIT, EASE_TEXT_IN, SPRING_KEY, SPRING_TEXT, springAt, tween } from '../motion';
import { INK } from '../timeline';
import { paperCard } from './Caption';

/** 默认全局速记快捷键 Alt+N（src/stores/settings/types/desktop.ts:40），macOS 记法 ⌥ N。 */
const KEYS = ['⌥', 'N'];
const KEY_GAP = 6;

type Props = { start: number; outAt: number };

const keyStyle = {
  width: 150,
  height: 150,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: FONT_FAMILY,
  fontSize: 76,
  color: INK,
  background: 'linear-gradient(180deg, #fbf6e8 0%, #f2e9d2 100%)',
  borderRadius: '26px 30px 24px 32px / 30px 24px 32px 26px',
  boxShadow: '0 9px 0 #d8c9a4, 0 18px 26px rgba(90,70,40,0.12)',
  border: '1px solid rgba(160,130,80,0.2)',
} as const;

/** 帧参数为 S3 内的局部帧。 */
export const Keycaps = ({ start, outAt }: Props) => {
  const frame = useCurrentFrame();
  const out = tween(frame, [outAt, outAt + 12], [1, 0], EASE_EXIT);
  const noteAt = start + KEYS.length * KEY_GAP + 24;
  const noteIn = tween(frame, [noteAt, noteAt + 18], [0, 1], EASE_TEXT_IN);
  const noteRise = (1 - springAt(frame, noteAt, SPRING_TEXT)) * 70;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: out }}>
      <div style={{ position: 'absolute', top: 360, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 36 }}>
        {KEYS.map((k, i) => {
          const at = start + i * KEY_GAP;
          const drop = (1 - springAt(frame, at, SPRING_KEY)) * -300;
          return (
            <div
              key={k}
              style={{
                ...keyStyle,
                opacity: tween(frame, [at, at + 6], [0, 1], EASE_TEXT_IN),
                transform: `translateY(${drop}px)`,
              }}
            >
              {k}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', top: 640, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            ...paperCard,
            width: 420,
            padding: '26px 36px 34px',
            background: 'rgba(252,246,214,0.9)',
            opacity: noteIn,
            transform: `translateY(${noteRise}px)`,
          }}
        >
          <div style={{ fontSize: 34, marginBottom: 18 }}>速记</div>
          {[330, 270, 190].map((w) => (
            <div key={w} style={{ height: 8, width: w, borderRadius: 4, background: 'rgba(59,58,54,0.28)', marginBottom: 16 }} />
          ))}
        </div>
      </div>
    </div>
  );
};
