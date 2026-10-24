import { BrowserWindow } from "electron";
import { DEFAULT_TITLE_BAR_HEIGHT_PX } from "../../../src/lib/electron/titlebarLayout";
import { type QuicknoteLayout } from "../windowLayout";
import { WindowRegistry, type WindowKind } from "../windowRegistry";
import { createQuicknoteActivateSuppression } from "../quicknoteActivateSuppression";

export const registry = new WindowRegistry<BrowserWindow>();

export const QUICKNOTE_IDLE_DESTROY_MS = 5 * 60 * 1000;

export const SEARCH_IDLE_DESTROY_MS = 15 * 60 * 1000;

export const LAYOUT_PERSIST_DEBOUNCE_MS = 300;

export const visibilityListeners = new Set<() => void>();

export type WindowCreatedListener = (
  win: BrowserWindow,
  kind: WindowKind,
) => void;

export const windowCreatedListeners = new Set<WindowCreatedListener>();

export const quicknoteActivateSuppression =
  createQuicknoteActivateSuppression();

export const workspacesHeldHidden = new WeakSet<BrowserWindow>();

export const workspacesHeldMinimized = new WeakSet<BrowserWindow>();

export const workspaceParkLock = new WeakSet<BrowserWindow>();

export const windowState = {
  lastTitleBarHeight: DEFAULT_TITLE_BAR_HEIGHT_PX,
  persistTimer: null as NodeJS.Timeout | null,
  rememberedQuicknote: undefined as QuicknoteLayout | null | undefined,
  quicknoteDestroyTimer: null as NodeJS.Timeout | null,
  searchDestroyTimer: null as NodeJS.Timeout | null,
  lastEmittedVisible: false,
  quitting: false,
};
