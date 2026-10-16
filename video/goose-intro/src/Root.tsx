import { Composition } from 'remotion';
import { GooseIntro } from './GooseIntro';
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from './timeline';

export const Root = () => (
  <Composition
    id="GooseIntro"
    component={GooseIntro}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={TOTAL_FRAMES}
  />
);
