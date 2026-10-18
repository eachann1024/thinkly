import { EditorAction } from "@/components/editor/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createTranslator, i18nYaml, useLocale } from "@/i18n";
import { VIDEO_PLAYBACK_RATES } from "./videoPlaybackRate";

const messages = i18nYaml<"src/components/editor/blocks/video/VideoSpeedMenu.tsx#messages:1">`
zh-Hans:
  playbackSpeed: "播放速度"
  holdForTripleSpeed: "按住右键 3 倍速"
en:
  playbackSpeed: "Playback speed"
  holdForTripleSpeed: "Hold right mouse button for 3× speed"
ja:
  playbackSpeed: "再生速度"
  holdForTripleSpeed: "右クリック長押しで3倍速"
`;
const t = createTranslator(messages);

export function VideoSpeedMenu({ rate, onSelect, portalContainer, onOpenChange }: {
  rate: number;
  onSelect: (rate: number) => void;
  portalContainer?: Element;
  onOpenChange: (open: boolean) => void;
}) {
  useLocale();
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <EditorAction type="button" context="media" className="goose-video-player__btn goose-video-player__speed"
          aria-label={`${t("playbackSpeed")} ${rate}×`} title={t("holdForTripleSpeed")}
          onClick={(event) => event.stopPropagation()}>
          {rate}×
        </EditorAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" portalContainer={portalContainer}>
        <DropdownMenuRadioGroup value={String(rate)} onValueChange={(value) => onSelect(Number(value))}>
          {VIDEO_PLAYBACK_RATES.map((value) => (
            <DropdownMenuRadioItem key={value} value={String(value)} textValue={`${value}×`}>{value}×</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
