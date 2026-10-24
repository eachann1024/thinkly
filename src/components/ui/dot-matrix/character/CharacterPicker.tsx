import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { SelectableCard } from "@/components/ui/selectable-card";
import { DotMatrixCorners } from "../corners";
import { CharacterSprite } from "./CharacterSprite";
import { CHARACTER_GROUPS } from "./registry";
import "./character-picker.css";

const NEXT_KEYS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
const ORDER = CHARACTER_GROUPS.flat();

export function CharacterPicker({
  value,
  onChange,
  spriteSize = 96,
  label,
  className,
}: {
  value: string | null;
  onChange: (id: string) => void;
  spriteSize?: number;
  label: string;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const current = ORDER.some((item) => item.id === value) ? value : ORDER[0]?.id;
  const corner = Math.round(Math.min(48, Math.max(28, spriteSize * 0.36)));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = NEXT_KEYS[event.key];
    if (!step) return;
    event.preventDefault();
    const index = ORDER.findIndex((item) => item.id === current);
    const next = ORDER[(index + step + ORDER.length) % ORDER.length];
    if (!next) return;
    onChange(next.id);
    listRef.current?.querySelector<HTMLElement>(`[data-character-id="${next.id}"]`)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={label}
      className={cn("goose-character-picker", className)}
      style={{ "--character-sprite-size": `${spriteSize}px` } as CSSProperties}
      onKeyDown={onKeyDown}
    >
      {CHARACTER_GROUPS.map((group, groupIndex) => (
        <div key={groupIndex} role="presentation" className="goose-character-group">
          {group.map((item) => {
            const selected = item.id === current;
            return (
              <SelectableCard
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-pressed={undefined}
                aria-label={item.name}
                tabIndex={selected ? 0 : -1}
                selected={selected}
                data-character-id={item.id}
                className="goose-character-option"
                onClick={() => onChange(item.id)}
              >
                {selected && <DotMatrixCorners size={corner} pitch={5} max={0.5} />}
                <CharacterSprite id={item.id} pose="wave" size={spriteSize} />
                <span className="goose-character-option-name">{item.name}</span>
              </SelectableCard>
            );
          })}
        </div>
      ))}
    </div>
  );
}
