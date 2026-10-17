import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/page/titlebar/WindowAlwaysOnTopButton.tsx#localMessages:1">`
zh-Hans:
  unpinWindow: "取消窗口置顶"
  pinWindow: "置顶窗口"
en:
  unpinWindow: "Turn off always on top"
  pinWindow: "Always on top"
`;
const uiText = createTranslator(localMessages);
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWindowAlwaysOnTop } from "@/hooks/useWindowAlwaysOnTop";

export function WindowAlwaysOnTopButton() {
  const { alwaysOnTop, isPending, toggleAlwaysOnTop } = useWindowAlwaysOnTop();
  const label = alwaysOnTop ? uiText("unpinWindow") : uiText("pinWindow");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <IconButton
          size="icon"
          tone="muted"
          type="button"
          className="window-always-on-top-button"
          active={alwaysOnTop}
          busy={isPending}
          disabled={isPending}
          aria-label={label}
          onClick={toggleAlwaysOnTop}
        >
          <svg
            className="goose-icon h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M3.5 10v8.5a2 2 0 0 0 2 2H16" opacity={0.45} />
            <rect x={6.5} y={4} width={14} height={11} rx={2}
              fill="currentColor" fillOpacity={alwaysOnTop ? 0.15 : 0} />
            <path d="M6.5 7.75h14" strokeWidth={1.2} />
            {alwaysOnTop && (
              <>
                <circle cx={18} cy={5.9} r={0.85} fill="currentColor" stroke="none" />
                <path d="M8 18h11" opacity={0.5} strokeWidth={1.2} />
              </>
            )}
          </svg>
        </IconButton>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
