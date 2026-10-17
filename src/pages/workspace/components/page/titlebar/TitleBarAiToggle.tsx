import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/page/titlebar/TitleBarAiToggle.tsx#localMessages:1">`
zh-Hans:
  closeAi: "关闭 AI 面板"
  openAi: "打开 AI 面板"
en:
  closeAi: "Close AI panel"
  openAi: "Open AI panel"
ja:
  closeAi: "AI パネルを閉じる"
  openAi: "AI パネルを開く"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import { Sparkles } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatShortcut } from "@/lib/utils";
import { useAiPanelVisibility } from "@/stores/useAiPanelVisibility";
import { useAiStatus } from "@/stores/useAiStatus";
import { useSettings } from "@/stores/useSettings";

/** 侧屏 AI 模式下的标题栏 AI 开关；全屏模式入口在左侧图标栏，这里不渲染。 */
export function TitleBarAiToggle({
  pressed,
  className,
}: {
  pressed: boolean;
  className?: string;
}) {
  useLocale();
  const aiEnabled = useSettings((s) => s.ai.enabled);
  const shortcut = useSettings((s) => s.appShortcuts.toggleAIPanel);
  const aiPhase = useAiStatus((s) => s.phase);
  // 只读布局层写入的有效布局模式，不在这里另起 AI 面板实例。
  const aiFullscreen = useAiPanelVisibility((s) => s.fullscreen);
  if (!aiEnabled || aiFullscreen) return null;
  const label = pressed ? uiText("closeAi") : uiText("openAi");
  const shortcutLabel = shortcut ? formatShortcut(shortcut) : "";

  return (
    <TooltipProvider delayDuration={600}>
      <Tooltip>
        <TooltipTrigger asChild>
          <IconButton size="icon" tone="muted"
            type="button"
            className={cn("ai-icon-button shrink-0", className, "text-foreground")}
            data-ai-state={aiPhase}
            onClick={() => {
              window.dispatchEvent(new CustomEvent("goose-note:toggle-ai-panel"));
            }}
            aria-label={label}
            aria-pressed={pressed}
          >
            <Sparkles className="h-4 w-4" />
          </IconButton>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="flex items-center gap-2">
            <span>{label}</span>
            {shortcutLabel && (
              <span className="text-[11px] text-muted-foreground">{shortcutLabel}</span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
