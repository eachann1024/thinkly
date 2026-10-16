import { staticFile, useCurrentFrame } from 'remotion';
import { FONT_FAMILY } from '../fonts';
import { paperCard } from '../layers/Caption';
import { PlateImg } from '../layers/Grain';
import { EASE_GLIDE, EASE_TEXT_IN, SPRING_LOGO, springAt, tween } from '../motion';
import { windowOnScreen } from './S6Library';
import { ROUND_WINDOW, S6, S7, S7_LOGO_AT, S7_TILT, HEIGHT } from '../timeline';

const SCALE = 1.2;
const MAX = (SCALE - 1) * (HEIGHT / 2);

/** 上仰到天空；圆窗匹配转场：S7 从圆窗位置以圆形展开。 */
export const S7Sunset = () => {
  const g = useCurrentFrame() + S7.from;
  const ty = tween(g, [S7_TILT.from, S7_TILT.to], [-MAX, MAX], EASE_GLIDE);
  const win = windowOnScreen(g > S6.to ? S6.to : g);
  const radius = tween(g, [ROUND_WINDOW.from, ROUND_WINDOW.to], [win.r, 2400], EASE_GLIDE);
  const clip = g >= ROUND_WINDOW.to ? 'none' : `circle(${radius}px at ${win.x}px ${win.y}px)`;
  const logo = springAt(g, S7_LOGO_AT, SPRING_LOGO);
  const text = springAt(g, S7_LOGO_AT + 8, SPRING_LOGO);
  const textIn = tween(g, [S7_LOGO_AT + 8, S7_LOGO_AT + 26], [0, 1], EASE_TEXT_IN);
  const logoIn = tween(g, [S7_LOGO_AT, S7_LOGO_AT + 18], [0, 1], EASE_TEXT_IN);
  return (
    <div style={{ position: 'absolute', inset: 0, clipPath: clip, overflow: 'hidden' }}>
      <PlateImg name="plate-g-sunset" style={{ inset: 0, width: '100%', height: '100%', transform: `translateY(${ty}px) scale(${SCALE})` }} />
      <div style={{ position: 'absolute', top: 92, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src={staticFile('logo.png')}
          width={150}
          height={150}
          style={{ opacity: logoIn, transform: `translateY(${(1 - logo) * 32}px) scale(${0.92 + 0.08 * logo})` }}
        />
        <div
          style={{
            ...paperCard,
            marginTop: 26,
            padding: '24px 52px 26px',
            fontFamily: FONT_FAMILY,
            fontSize: 56,
            letterSpacing: 2,
            opacity: textIn,
            transform: `translateY(${(1 - text) * 32}px)`,
          }}
        >
          开始写下第一页吧
        </div>
      </div>
    </div>
  );
};
