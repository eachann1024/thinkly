import type { AISlice } from "./slices/aiSlice";
import type { AppearanceSlice } from "./slices/appearanceSlice";
import type { ShortcutsSlice } from "./slices/shortcutsSlice";
import type { SearchProvidersSlice } from "./slices/searchProvidersSlice";
import type { LocalFolderSlice } from "./slices/localFolderSlice";
import type { WebdavSlice } from "./slices/webdavSlice";
import type { SidebarRailSlice } from "./slices/sidebarRailSlice";

export type SettingsState = AISlice &
  AppearanceSlice &
  ShortcutsSlice &
  SearchProvidersSlice &
  LocalFolderSlice &
  WebdavSlice &
  SidebarRailSlice & {
    _hasHydrated: boolean;
    defaultPageLayout: import("@/types").PageLayout;
    contentsWidth: number;
    setupGuideSeen: boolean;
    setupGuideOpen: boolean;
    /** 所选形象 id；null 表示尚未在首启引导中选择。 */
    characterId: string | null;
    setCharacterId: (id: string) => void;
  };
