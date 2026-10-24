import { useRef, type CSSProperties } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { Check } from "@/components/ui/icons";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { EditorMenuHeader, EditorMenuSection } from "../ui/vendor-menu";
import { TEXT_COLORS, HIGHLIGHT_COLORS, COLOR_PREVIEW, BG_PREVIEW } from "../toolbars/formatting/colorPalette";
import { setHandleBlockProperty } from "./blockHandleActions";
import { blockHandleText as t } from "./blockHandleMessages";
import "./block-handle-colors.css";

const paletteColors = new Set(["default", "gray", "red", "yellow", "green", "blue", "purple"]);
const groups = [
  { prop: "textColor", colors: TEXT_COLORS },
  { prop: "backgroundColor", colors: HIGHLIGHT_COLORS },
] as const;

function navigatePalette(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const group = event.currentTarget as HTMLElement;
  const items = Array.from(group.querySelectorAll<HTMLElement>("[data-goose-color-choice]"));
  const index = items.findIndex(item => item === event.target);
  if (index < 0) return;
  let target: HTMLElement | undefined;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    target = items[(index + (event.key === "ArrowLeft" ? -1 : 1) + items.length) % items.length];
  } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    const rows = Array.from(group.parentElement?.querySelectorAll<HTMLElement>(".goose-block-color-group") ?? []);
    const row = rows.indexOf(group) + (event.key === "ArrowUp" ? -1 : 1);
    const next = rows[row]?.querySelectorAll<HTMLElement>("[data-goose-color-choice]");
    target = next?.[Math.min(index, next.length - 1)];
  } else if (event.key === "Home") target = items[0];
  else if (event.key === "End") target = items[items.length - 1];
  else return;
  event.preventDefault();
  event.stopPropagation();
  target?.focus();
}

export function BlockHandleColorPalette({ editor, block }: {
  editor: BlockNoteEditor<any, any, any>;
  block: any;
}) {
  const initialColors = useRef({ textColor: block.props.textColor, backgroundColor: block.props.backgroundColor });
  return <>{groups.map(({ prop, colors }) => {
    const selected = block.props[prop] || "default";
    // Keep an older note's omitted color visible without adding it to the default palette.
    const visible = colors.filter(({ color }) => paletteColors.has(color) || color === selected || color === initialColors.current[prop]);
    return <EditorMenuSection key={prop} data-goose-menu-slot="group" data-goose-layout="grid"
      className="goose-block-color-group" aria-label={t(prop)} selectionMode="single"
      selectedKeys={[`${prop}:${selected}`]} disallowEmptySelection
      ref={element => {
        if (!element) return;
        element.addEventListener("keydown", navigatePalette, true);
        return () => element.removeEventListener("keydown", navigatePalette, true);
      }}
      style={{ "--goose-color-columns": visible.length } as CSSProperties}>
      <EditorMenuHeader className="goose-block-color-heading">{t(prop)}</EditorMenuHeader>
      {visible.map(({ color, name }) => <DropdownMenuItem key={color} id={`${prop}:${color}`}
        aria-label={`${t(prop)}：${name}`} textValue={name}
        ref={element => { if (element) element.title = name; }}
        data-goose-color-choice={`${prop}:${color}`} className="goose-block-color-choice"
        shouldCloseOnSelect={false}
        style={{
          "--goose-color-swatch-fg": prop === "textColor" && color !== "default"
            ? COLOR_PREVIEW[color] : "hsl(var(--foreground))",
          "--goose-color-swatch-bg": prop === "backgroundColor" && color !== "default"
            ? BG_PREVIEW[color] : "hsl(var(--goose-menu-surface))",
        } as CSSProperties}
        onSelect={() => { setHandleBlockProperty(editor, block.id, prop, color, false); }}>
        <span aria-hidden="true" className="goose-block-color-letter">A</span>
        {selected === color && <Check aria-hidden="true" className="goose-block-color-check" />}
      </DropdownMenuItem>)}
    </EditorMenuSection>;
  })}</>;
}
