import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { SCENES } from "./theme";
import { Fonts } from "./ui/Fonts";
import { Backdrop } from "./ui/Stage";
import { Intro } from "./scenes/Intro";
import { Blocks } from "./scenes/Blocks";
import { Ai } from "./scenes/Ai";
import { QuickNote } from "./scenes/QuickNote";
import { Split } from "./scenes/Split";
import { Share } from "./scenes/Share";
import { History } from "./scenes/History";
import { Outro } from "./scenes/Outro";

const ORDER = [
  ["intro", Intro],
  ["blocks", Blocks],
  ["ai", Ai],
  ["quick", QuickNote],
  ["split", Split],
  ["share", Share],
  ["history", History],
  ["outro", Outro],
] as const;

export function Video() {
  return (
    <AbsoluteFill>
      <Fonts />
      <Backdrop />
      {ORDER.map(([id, Scene]) => (
        <Sequence key={id} from={SCENES[id].from} durationInFrames={SCENES[id].len} layout="none">
          <Scene />
        </Sequence>
      ))}
      <Audio src={staticFile("audio/bed.wav")} />
    </AbsoluteFill>
  );
}
