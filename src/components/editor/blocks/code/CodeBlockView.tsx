import { cn } from "@/lib/utils";
import { MathView } from "@/components/editor/blocks/math/MathView";
import { MermaidView } from "@/components/editor/blocks/mermaid/MermaidView";
import { CodeBlockHeader } from "./CodeBlockHeader";
import type { CodeBlockViewProps } from "./codeBlockViewTypes";

export function CodeBlockView(props: CodeBlockViewProps) {
  const { language, wrap, contentRef, edit, preview } = props;
  const { rootRef } = edit;
  const {
    previewRef,
    isVisualBlock,
    showLineNumbers,
    shouldShowSource,
    lineCount,
    shouldShowPreview,
    canPreview,
    handleInternalPreview,
    textContent,
  } = preview;
  return (
    <div
      ref={rootRef}
      className="goose-code-block-node relative"
      data-visual-preview={isVisualBlock ? "true" : undefined}
    >
      <CodeBlockHeader {...props} />

      <div className="goose-code-content-wrapper">
        {showLineNumbers && shouldShowSource && (
          <div className="goose-code-line-numbers" contentEditable={false}>
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        )}
        <pre
          className={cn(
            "goose-code-pre",
            wrap && "goose-code-pre-wrap",
            isVisualBlock && "goose-code-pre-source",
            !shouldShowSource && "goose-code-pre-hidden",
          )}
          aria-hidden={!shouldShowSource}
        >
          <code
            ref={contentRef}
            className="goose-code-content hljs"
            style={
              wrap
                ? {
                    whiteSpace: "break-spaces",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                  }
                : undefined
            }
          />
        </pre>
        {shouldShowPreview && (
          <div
            ref={previewRef}
            contentEditable={false}
            className={cn(
              "goose-code-preview select-none bg-transparent cursor-pointer",
            )}
            onDoubleClick={() => {
              if (canPreview) void handleInternalPreview();
            }}
          >
            {language === "math" && (
              <MathView value={textContent} displayMode={true} />
            )}
            {language === "mermaid" && <MermaidView value={textContent} />}
          </div>
        )}
      </div>
    </div>
  );
}
