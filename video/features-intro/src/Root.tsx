import { Composition } from "remotion";
import { FeaturesIntro } from "./FeaturesIntro";
import { DURATION, FPS, HEIGHT, WIDTH } from "./theme";

export function RemotionRoot() {
  return (
    <Composition
      id="GooseFeatures"
      component={FeaturesIntro}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}
