import { Composition } from "remotion";
import { SearchAiIntro } from "./SearchAiIntro";
import { DURATION, FPS, HEIGHT, WIDTH } from "./theme";

export function RemotionRoot() {
  return (
    <Composition
      id="GooseSearchAi"
      component={SearchAiIntro}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}
