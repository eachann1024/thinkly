import { Img, staticFile, useCurrentFrame } from 'remotion';

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** 一拍二（15fps 更新）胶片颗粒：偏移每 2 帧变化一次。 */
export const Grain = ({ opacity = 0.06 }: { opacity?: number }) => {
  const step = Math.floor(useCurrentFrame() / 2);
  const x = Math.floor(hash(step) * 256);
  const y = Math.floor(hash(step + 91) * 256);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        mixBlendMode: 'overlay',
        backgroundImage: `url(${staticFile('textures/grain.png')})`,
        backgroundSize: '256px 256px',
        backgroundPosition: `${x}px ${y}px`,
      }}
    />
  );
};

export const PaperTexture = ({ opacity = 0.05 }: { opacity?: number }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      opacity,
      mixBlendMode: 'multiply',
      backgroundImage: `url(${staticFile('textures/paper.png')})`,
      backgroundSize: '512px 512px',
    }}
  />
);

export const Vignette = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background:
        'radial-gradient(ellipse 75% 75% at 50% 50%, rgba(120,80,40,0) 55%, rgba(120,80,40,0.16) 100%)',
    }}
  />
);

export const PlateImg = ({ name, style }: { name: string; style?: React.CSSProperties }) => (
  <Img
    src={staticFile(`plates/${name}.jpg`)}
    style={{ position: 'absolute', display: 'block', ...style }}
  />
);
