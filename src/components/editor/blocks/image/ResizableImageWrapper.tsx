import { FileBlockWrapper } from "@blocknote/react";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

type ImageBlock = {
  id: string;
  type: "image";
  props: { url: string; previewWidth?: number; textAlignment?: string; showPreview?: boolean };
};
type ImageEditor = {
  isEditable: boolean;
  getBlock: (id: string) => ImageBlock | undefined;
  updateBlock: (block: ImageBlock, update: { props: { previewWidth: number } }) => unknown;
};
type Drag = {
  pointer: number;
  startX: number;
  startWidth: number;
  width: number;
  maximum: number;
  scale: number;
  direction: number;
};

export function ResizableImageWrapper({ block, editor, children }: {
  block: ImageBlock;
  editor: ImageEditor;
  children: ReactNode;
}) {
  const media = useRef<HTMLDivElement>(null);
  const active = useRef<Drag | undefined>(undefined);
  const [draft, setDraft] = useState<number>();
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const cancel = () => { active.current = undefined; setDraft(undefined); };
    cancel();
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("blur", cancel);
      active.current = undefined;
    };
  }, [block.id, block.props.url, editor, editor.isEditable]);

  const begin = (event: PointerEvent<HTMLDivElement>, side: "left" | "right") => {
    const element = media.current;
    const container = element?.closest<HTMLElement>(".bn-block-content");
    if (!editor.isEditable || !element?.clientWidth || !container || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = element.getBoundingClientRect();
    const style = getComputedStyle(container);
    const maximum = Math.max(1, container.clientWidth -
      parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    active.current = {
      pointer: event.pointerId, startX: event.clientX, startWidth: element.clientWidth,
      width: element.clientWidth, maximum,
      scale: bounds.width / element.clientWidth || 1,
      direction: (side === "left" ? -1 : 1) * (block.props.textAlignment === "center" ? 2 : 1),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft(element.clientWidth);
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const drag = active.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    event.preventDefault();
    drag.width = Math.min(drag.maximum, Math.max(Math.min(64, drag.maximum),
      drag.startWidth + (event.clientX - drag.startX) / drag.scale * drag.direction));
    setDraft(drag.width);
  };

  const finish = (event: PointerEvent<HTMLDivElement>, commit: boolean) => {
    const drag = active.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    active.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraft(undefined);
    const current = editor.getBlock(block.id);
    if (commit && editor.isEditable && current?.type === "image" && current.props.url === block.props.url &&
      drag.width !== drag.startWidth) {
      editor.updateBlock(current, { props: { previewWidth: drag.width } });
    }
  };

  return (
    <FileBlockWrapper block={block as any} editor={editor as any}
      onMouseEnter={() => setHovered(editor.isEditable)}
      onMouseLeave={() => setHovered(false)}
      style={block.props.showPreview === false ? undefined : {
        width: draft ?? block.props.previewWidth ?? 512, maxWidth: "100%", minWidth: 0,
      }}>
      <div className="bn-visual-media-wrapper" ref={media}>
        {children}
        {editor.isEditable && (["left", "right"] as const).map(side => (
          <div key={side} className="bn-resize-handle goose-image-resize-handle"
            style={{ [side]: 4, display: hovered || draft !== undefined ? "initial" : "none" }}
            onPointerDown={event => begin(event, side)} onPointerMove={move}
            onPointerUp={event => finish(event, true)}
            onPointerCancel={event => finish(event, false)}
            onLostPointerCapture={event => finish(event, false)} />
        ))}
      </div>
    </FileBlockWrapper>
  );
}
