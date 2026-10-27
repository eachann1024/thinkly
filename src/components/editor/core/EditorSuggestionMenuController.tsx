import { SuggestionMenuController, useEditorDOMElement, useExtension, useExtensionState } from "@blocknote/react";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { useMemo, type ComponentProps } from "react";
import { MenuRootContext, useMenuRoot } from "@/components/ui/menu-root";
import { getCompactSlashMenuFloatingOptions } from "../utils/compactSlashMenuFloating";

export function EditorSuggestionMenuController(props: ComponentProps<typeof SuggestionMenuController>) {
  const root = useEditorDOMElement();
  const layer = root?.ownerDocument.body;
  const menu = useExtension(SuggestionMenu);
  const state = useExtensionState(SuggestionMenu);
  const visible = Boolean(layer && state?.show && state.triggerCharacter === props.triggerCharacter &&
    (state.ignoreQueryLength || !props.minQueryLength || (!state.query.startsWith(" ") && state.query.length >= props.minQueryLength)));
  const owner = useMenuRoot(visible, (open) => {
    if (!open && menu.store.state?.triggerCharacter === props.triggerCharacter) menu.closeMenu();
  });
  const floatingUIOptions = useMemo(() => getCompactSlashMenuFloatingOptions(), []);
  if (!layer) return null;
  return <MenuRootContext.Provider value={owner}>
    <SuggestionMenuController {...props} portalElement={layer} floatingUIOptions={floatingUIOptions} />
  </MenuRootContext.Provider>;
}
