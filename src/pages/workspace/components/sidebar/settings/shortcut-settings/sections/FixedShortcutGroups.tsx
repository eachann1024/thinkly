import { useState } from "react";
import { ChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { FixedShortcutRow } from "./ShortcutDisplay";
import {
  currentShortcutPlatform,
  type ShortcutGroup,
  type ShortcutGroupItem,
} from "./shortcutGroups";

function ShortcutRows({ items }: { items: ShortcutGroupItem[] }) {
  const platform = currentShortcutPlatform();
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <FixedShortcutRow
          key={item.label}
          label={item.label}
          shortcut={item.shortcut}
          platform={platform}
        />
      ))}
    </div>
  );
}

export function CollapsibleShortcutGroups({
  groups,
}: {
  groups: ShortcutGroup[];
}) {
  const [openId, setOpenId] = useState(groups[0]?.id ?? "");
  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const open = openId === group.id;
        return (
          <section key={group.id} className="overflow-hidden rounded-xl">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(open ? "" : group.id)}
              className="flex h-10 w-full items-center gap-3 rounded-xl px-4 text-left hover:bg-[var(--goose-interactive-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--goose-focus)]"
            >
              <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                {group.title}
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {group.items.length}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                  open && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
            {open ? (
              <div className="px-1 pb-2 pt-1">
                <ShortcutRows items={group.items} />
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function ShortcutReference({ items }: { items: ShortcutGroupItem[] }) {
  return <ShortcutRows items={items} />;
}
