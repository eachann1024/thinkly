import { createTranslator, i18nYaml } from "../../../../src/i18n/core";
import {
  isAuxiliaryKind,
  isAuxiliarySettingsSection,
  type AuxiliaryKind,
  type AuxiliaryOpenRequest,
  type AuxiliarySettingsSection,
} from "../../../../src/lib/auxiliary-window/contract";

const titleText = createTranslator(i18nYaml<"electron/main/windows/auxiliary/kinds.ts#block1:1">`
zh-Hans:
  reflection: "反思"
  recovery-drafts: "恢复稿"
  app-update: "更新"
  ai-setup: "配置 AI 写作助手"
  fullscreen-preview: "预览"
  notebook-edit: "编辑笔记本"
  confirm: "确认"
  selection-quote: "选区引用"
  image-export: "生成图片"
en:
  reflection: "Reflection"
  recovery-drafts: "Recovery drafts"
  app-update: "Update"
  ai-setup: "Set up AI writing"
  fullscreen-preview: "Preview"
  notebook-edit: "Edit notebook"
  confirm: "Confirm"
  selection-quote: "Selection quote"
  image-export: "Generate image"
ja:
  reflection: "振り返り"
  recovery-drafts: "復元データ"
  app-update: "アップデート"
  ai-setup: "AI 執筆の設定"
  fullscreen-preview: "プレビュー"
  notebook-edit: "ノートブックを編集"
  confirm: "確認"
  selection-quote: "選択範囲の引用"
  image-export: "画像を生成"
`);

export type AuxiliaryKindConfig = {
  kind: AuxiliaryKind;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  resizable: boolean;
  modal: boolean;
};

const KINDS: Record<AuxiliaryKind, AuxiliaryKindConfig> = {
  reflection: { kind: "reflection", width: 1100, height: 760, minWidth: 760, minHeight: 560, resizable: true, modal: false },
  "recovery-drafts": { kind: "recovery-drafts", width: 960, height: 680, minWidth: 720, minHeight: 480, resizable: true, modal: false },
  "app-update": { kind: "app-update", width: 600, height: 680, minWidth: 480, minHeight: 420, resizable: true, modal: false },
  "ai-setup": { kind: "ai-setup", width: 640, height: 680, minWidth: 520, minHeight: 520, resizable: true, modal: false },
  "fullscreen-preview": { kind: "fullscreen-preview", width: 960, height: 720, minWidth: 480, minHeight: 360, resizable: true, modal: false },
  "notebook-edit": { kind: "notebook-edit", width: 560, height: 680, minWidth: 560, minHeight: 680, resizable: false, modal: true },
  confirm: { kind: "confirm", width: 460, height: 400, minWidth: 460, minHeight: 240, resizable: false, modal: true },
  "selection-quote": { kind: "selection-quote", width: 480, height: 420, minWidth: 360, minHeight: 280, resizable: true, modal: true },
  "image-export": { kind: "image-export", width: 1280, height: 800, minWidth: 900, minHeight: 600, resizable: true, modal: false },
};

export function auxiliaryKindConfig(kind: AuxiliaryKind): AuxiliaryKindConfig {
  return KINDS[kind];
}

export function auxiliaryKindTitle(kind: AuxiliaryKind): string {
  return titleText(kind);
}

const MAX_PAYLOAD_CHARS = 2_000_000;

export function parseAuxiliaryOpenRequest(value: unknown): AuxiliaryOpenRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("auxiliary-request");
  }
  const raw = value as Record<string, unknown>;
  if (!isAuxiliaryKind(raw.kind)) throw new Error("auxiliary-kind");
  const config = KINDS[raw.kind];
  let payload: unknown = null;
  if (raw.payload !== undefined) {
    let serialized: string;
    try {
      serialized = JSON.stringify(raw.payload);
    } catch {
      throw new Error("auxiliary-payload");
    }
    if (!serialized || serialized.length > MAX_PAYLOAD_CHARS) throw new Error("auxiliary-payload");
    payload = JSON.parse(serialized) as unknown;
  }
  let size: AuxiliaryOpenRequest["size"];
  if (raw.size && typeof raw.size === "object" && !Array.isArray(raw.size)) {
    const box = raw.size as Record<string, unknown>;
    const width = Number(box.width);
    const height = Number(box.height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) throw new Error("auxiliary-size");
    size = {
      width: Math.min(4000, Math.max(config.minWidth, Math.round(width))),
      height: Math.min(4000, Math.max(config.minHeight, Math.round(height))),
    };
  }
  return { kind: raw.kind, payload, ...(size ? { size } : {}) };
}

export function parseAuxiliarySection(value: unknown): AuxiliarySettingsSection {
  if (!isAuxiliarySettingsSection(value)) throw new Error("auxiliary-section");
  return value;
}
