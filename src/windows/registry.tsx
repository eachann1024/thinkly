import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { AuxiliaryKind } from "@/lib/auxiliary-window/contract";

function view(load: () => Promise<{ default: ComponentType }>): LazyExoticComponent<ComponentType> {
  return lazy(load);
}

// Adding a kind without a view fails typecheck. Replace the view file in place.
export const AUXILIARY_VIEWS: Record<AuxiliaryKind, LazyExoticComponent<ComponentType>> = {
  reflection: view(() => import("./views/ReflectionWindow").then((m) => ({ default: m.ReflectionWindow }))),
  "recovery-drafts": view(() => import("./views/RecoveryDraftsWindow").then((m) => ({ default: m.RecoveryDraftsWindow }))),
  "app-update": view(() => import("./views/AppUpdateWindow").then((m) => ({ default: m.AppUpdateWindow }))),
  "ai-setup": view(() => import("./views/AISetupWindow").then((m) => ({ default: m.AISetupWindow }))),
  "fullscreen-preview": view(() => import("./views/FullscreenPreviewWindow").then((m) => ({ default: m.FullscreenPreviewWindow }))),
  "notebook-edit": view(() => import("./views/NotebookEditWindow").then((m) => ({ default: m.NotebookEditWindow }))),
  confirm: view(() => import("./views/ConfirmWindow").then((m) => ({ default: m.ConfirmWindow }))),
  "selection-quote": view(() => import("./views/SelectionQuoteWindow").then((m) => ({ default: m.SelectionQuoteWindow }))),
  "image-export": view(() => import("./views/ImageExportWindow").then((m) => ({ default: m.ImageExportWindow }))),
};
