import { useEffect, useState } from "react";
import * as GooseIcons from "@/components/ui/icons";
import { EditorAction } from "@/components/editor/ui/button";
import { useEditorPageContext } from "@/components/editor/platform/hostContext";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/image/ResolvedImagePreview.tsx#messages:1">`
zh-Hans:
  imageReferenceUnresolved: "图片引用未解析"
  couldNotLoadImage: "图片无法加载"
  loadingImage: "图片加载中"
  retry: "重试"
en:
  imageReferenceUnresolved: "Image reference unresolved"
  couldNotLoadImage: "Could not load image"
  loadingImage: "Loading image"
  retry: "Retry"
`;
const t = createTranslator(messages);


type ImageBlock = {
  props: { url: string; name?: string; alt?: string; previewWidth?: number };
};
type ImageEditor = { resolveFileUrl?: (url: string) => Promise<string> };
type ImageResource = {
  source: string;
  pagePath: string | null;
  attempt: number;
  src?: string;
  phase: "loading" | "loaded" | "error";
};

/** 内部引用解析后才交给 img；解析、解码与失败分别呈现，避免浏览器破图闪现。 */
export function ResolvedImagePreview({
  block,
  editor,
}: {
  block: ImageBlock;
  editor: ImageEditor;
}) {
  const source = block.props.url;
  const pagePath = useEditorPageContext().getActivePageLocalFilePath();
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState<ImageResource>();

  useEffect(() => {
    let cancelled = false;
    const current: ImageResource = { source, pagePath, attempt, phase: "loading" };
    setResource(current);
    void (async () => {
      try {
        const src = editor.resolveFileUrl
          ? await editor.resolveFileUrl(source)
          : source;
        if (!src || /^(?:att(?:-file|-video)?:|uuid:)/i.test(src)) {
          throw new Error(t("imageReferenceUnresolved"));
        }
        if (!cancelled) setResource({ ...current, src });
      } catch {
        if (!cancelled) setResource({ ...current, phase: "error" });
      }
    })();
    return () => { cancelled = true; };
  }, [editor, source, pagePath, attempt]);

  // URL、页路径或重试变化的首帧也不能展示上一张图或上一轮错误。
  const current = resource?.source === source && resource.pagePath === pagePath &&
    resource.attempt === attempt ? resource : undefined;
  const phase = current?.phase ?? "loading";
  const finish = (next: "loaded" | "error") => {
    setResource(value => value && value === current && value.phase !== next
      ? { ...value, phase: next } : value);
  };

  return (
    <div className="goose-image-preview" data-image-state={phase} contentEditable={false}
      style={phase !== "loaded" ? { width: block.props.previewWidth || 512 } : undefined}>
      {phase !== "loaded" && (
        <div className="goose-image-preview__status" role="status" aria-live="polite"
          aria-label={phase === "error" ? t("couldNotLoadImage") : t("loadingImage")}>
          <GooseIcons.Image size={20} strokeWidth={1.5} aria-hidden="true" />
          <span>{phase === "error" ? t("couldNotLoadImage") : t("loadingImage")}</span>
          <EditorAction type="button" className="goose-image-preview__retry"
            disabled={phase === "loading"}
            onMouseDown={event => event.preventDefault()}
            onClick={() => setAttempt(value => value + 1)}>{t("retry")}</EditorAction>
        </div>
      )}
      {current?.src && phase !== "error" && (
        <img key={`${source}:${pagePath}:${attempt}`} className="bn-visual-media"
          ref={element => {
            // 缓存命中或节点复用时 load 可能已发生，仍需确认实际解码结果。
            if (element?.complete) finish(element.naturalWidth > 0 ? "loaded" : "error");
          }}
          src={current.src} alt={typeof block.props.alt === "string" ? block.props.alt : block.props.name || ""}
          width={block.props.previewWidth} draggable={false}
          onLoad={() => finish("loaded")} onError={() => finish("error")} />
      )}
    </div>
  );
}
