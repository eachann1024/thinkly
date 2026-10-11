import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isElectronHost } from "@/lib/local-vault";

import { usePageEmptyState } from "./empty-state/usePageEmptyState";

function AiCrystalFx() {
  return (
    <span className="page-empty-ai-fx" aria-hidden="true">
      <span className="page-empty-ai-orb page-empty-ai-orb--a" />
      <span className="page-empty-ai-orb page-empty-ai-orb--b" />
      <span className="page-empty-ai-orb page-empty-ai-orb--c" />
      <span className="page-empty-ai-sheen" />
      <span className="page-empty-ai-spark page-empty-ai-spark--1" />
      <span className="page-empty-ai-spark page-empty-ai-spark--2" />
      <span className="page-empty-ai-spark page-empty-ai-spark--3" />
    </span>
  );
}

export function PageEmptyState() {
  const { paused, isLocalFolder, aiEnabled, aiTilt, actions } = usePageEmptyState();

  return (
    <div
      className="workspace-page-empty h-full overflow-y-auto px-3 py-4 sm:px-6 sm:py-8 md:p-8 relative bg-[hsl(var(--goose-editor-bg))]"
      data-paused={paused ? "true" : "false"}
    >
      <div className="min-h-full flex items-start justify-center pt-2 sm:pt-4 md:pt-6">
        {/* 内容区 */}
        <div className="relative w-full max-w-5xl">
          {/* 标题 */}
          <div className="text-center mb-6 sm:mb-8 md:mb-12 pt-2 sm:pt-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3 md:mb-4">
              准备好记录想法了吗？
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {isElectronHost && !isLocalFolder
                ? "打开或关联本地文件夹，即可开始管理与书写笔记"
                : isLocalFolder
                  ? "在左侧目录点击 ＋ 新建笔记，或选择已有笔记开始书写"
                  : "在左侧目录点击 ＋ 新建笔记，或选择已有笔记开始书写"}
            </p>
          </div>

          {/* 操作卡片网格：AI 关 3 卡 / AI 开 4 卡（第 3=AI，第 4=搜索） */}
          <div
            className={cn(
              "grid grid-cols-1 min-[520px]:grid-cols-2 gap-3 sm:gap-4 md:gap-5 mx-auto",
              aiEnabled
                ? "max-w-5xl xl:grid-cols-4"
                : "max-w-4xl xl:grid-cols-3",
            )}
          >
            {actions.map((action) => {
              const Icon = action.icon;
              const isAi = action.variant === "ai";
              return (
                <Button contentStyle="preserve" variant="ghost" size={null}
                  key={action.key}
                  onClick={() => {
                    void action.onClick();
                  }}
                  type="button"
                  onPointerMove={isAi ? aiTilt.onPointerMove : undefined}
                  onPointerLeave={isAi ? aiTilt.onPointerLeave : undefined}
                  className={cn(
                    "block goose-interactive group relative cursor-pointer rounded-[var(--goose-control-radius)] border border-border bg-background p-4 sm:p-5 md:p-6 text-left shadow-[var(--goose-menu-shadow)] transition-colors duration-[var(--goose-control-motion-duration)]",
                    isAi && "page-empty-ai-card",
                  )}
                  style={isAi ? aiTilt.tiltStyle : undefined}
                >
                  <div
                    className={cn(
                      "w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-[9px] md:rounded-[10px] flex items-center justify-center mb-3 sm:mb-4 transition-[background-color,box-shadow,transform] duration-200 ease-out",
                      isAi
                        ? "page-empty-ai-chip"
                        : "bg-[var(--goose-interactive-selected)] text-[var(--goose-interactive-selected-fg)]",
                    )}
                  >
                    {isAi ? <AiCrystalFx /> : null}
                    <Icon
                      className={cn(
                        "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-muted-foreground transition-colors group-hover:text-[var(--goose-interactive-hover-fg)] group-focus-within:text-[var(--goose-interactive-hover-fg)]",
                        isAi && "page-empty-ai-icon",
                      )}
                    />
                  </div>
                  <h3
                    className={cn(
                      "text-base sm:text-lg font-semibold text-foreground mb-1.5 sm:mb-2 text-left transition-colors group-hover:text-[var(--goose-interactive-hover-fg)] group-focus-within:text-[var(--goose-interactive-hover-fg)]",
                    )}
                  >
                    {action.title}
                  </h3>
                  <p className="hidden min-[420px]:block text-xs sm:text-sm text-muted-foreground text-left leading-relaxed transition-colors group-hover:text-[var(--goose-interactive-hover-fg)] group-focus-within:text-[var(--goose-interactive-hover-fg)]">
                    {action.description}
                  </p>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
