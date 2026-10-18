import { Composition } from "remotion";
import { Video } from "./Video";
import { DURATION, FPS, HEIGHT, WIDTH } from "./theme";

export function RemotionRoot() {
  return (
    <Composition
      id="ThinklyFeatures"
      component={Video}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}
