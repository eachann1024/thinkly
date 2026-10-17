import { EditorMenuSection, EditorMenuHeader, EditorSubmenuTrigger } from "@/components/editor/ui/vendor-menu";
import * as GooseIcons from "@/components/ui/icons";
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/editor/ui/dropdown-menu";
import { editTableDimension, tableDimensionColor } from "./tableMenuActions";
import { TEXT_COLORS } from "../toolbars/formatting/colorPalette";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/menus/GooseTableColorMenu.tsx#messages:1">`
zh-Hans:
  color: "颜色"
  textColor: "文字颜色"
  backgroundColor: "背景颜色"
  text: "文字"
  background: "背景"
en:
  color: "Color"
  textColor: "Text color"
  backgroundColor: "Background color"
  text: "Text"
  background: "Background"
ja:
  color: "色"
  textColor: "文字色"
  backgroundColor: "背景色"
  text: "文字"
  background: "背景"
`;
const t = createTranslator(messages);


interface GooseTableColorMenuProps {
  editor: any;
  blockId: string;
  orientation: "row" | "column";
  index: number;
  onAction: (action: () => void) => void;
}

export function GooseTableColorMenu({
  editor,
  blockId,
  orientation,
  index,
  onAction,
}: GooseTableColorMenuProps) {
  useLocale();
  return (
    <EditorSubmenuTrigger>
      <DropdownMenuItem textValue={t("color")}>
        <GooseIcons.Palette /> {t("color")}{" "}
        <GooseIcons.ChevronRight className="ml-auto" />
      </DropdownMenuItem>
      <DropdownMenuContent
        variant="menu"
        className="goose-table-menu goose-table-color-menu"
        side="right"
        sideOffset={2}
      >
        {(["textColor", "backgroundColor"] as const).map((property) => {
          const selectedColor = tableDimensionColor(
            editor.prosemirrorState,
            blockId,
            orientation,
            index,
            property,
          );
          return (
            <EditorMenuSection data-goose-menu-slot="group" data-goose-layout="grid"
              key={property}
              className="goose-table-color-group goose-list-group"
              aria-label={property === "textColor" ? t("textColor") : t("backgroundColor")}
              selectionMode="single"
              selectedKeys={
                selectedColor ? [`${property}:${selectedColor}`] : []
              }
            >
              <EditorMenuHeader className="goose-table-menu-heading px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground">
                {property === "textColor" ? t("textColor") : t("backgroundColor")}
              </EditorMenuHeader>
              {TEXT_COLORS.map(({ color, name: label }) => (
                <DropdownMenuItem
                  key={color}
                  id={`${property}:${color}`}
                  className="goose-table-color-swatch"
                  aria-label={`${label}${property === "textColor" ? t("text") : t("background")}`}
                  textValue={`${label}${property === "textColor" ? t("text") : t("background")}`}
                  style={
                    {
                      "--goose-table-swatch-fg":
                        property === "textColor" && color !== "default"
                          ? `var(--goose-editor-highlight-${color}-text)`
                          : "hsl(var(--foreground))",
                      "--goose-table-swatch-bg":
                        property === "backgroundColor" && color !== "default"
                          ? `var(--goose-editor-highlight-${color}-bg)`
                          : "hsl(var(--background))",
                    } as React.CSSProperties
                  }
                  onSelect={() =>
                    onAction(() =>
                      editor.exec(
                        editTableDimension(blockId, orientation, index, {
                          type: "color",
                          property,
                          color,
                        }),
                      ),
                    )
                  }
                >
                  <span aria-hidden="true">A</span>
                </DropdownMenuItem>
              ))}
            </EditorMenuSection>
          );
        })}
      </DropdownMenuContent>
    </EditorSubmenuTrigger>
  );
}
