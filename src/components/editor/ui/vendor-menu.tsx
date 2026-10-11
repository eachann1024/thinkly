// Preserve HeroUI collection identity and keyboard/focus behavior. All editor
// vendor menu dependencies enter through this adapter; layouts expose app slots.
import { Dropdown, Header } from "@heroui/react";
export const EditorMenuSection = Dropdown.Section;
export const EditorSubmenuTrigger = Dropdown.SubmenuTrigger;
export const EditorMenuHeader = Header;
