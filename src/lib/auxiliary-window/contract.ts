export const AUXILIARY_KINDS = [
  "reflection",
  "recovery-drafts",
  "app-update",
  "ai-setup",
  "fullscreen-preview",
  "notebook-edit",
  "confirm",
  "selection-quote",
] as const;

export type AuxiliaryKind = (typeof AUXILIARY_KINDS)[number];

export const AUXILIARY_SETTINGS_SECTIONS = [
  "appearance",
  "general",
  "shortcuts",
  "local-folder",
  "git-sync",
  "ai",
  "data",
  "feedback",
] as const;

export type AuxiliarySettingsSection = (typeof AUXILIARY_SETTINGS_SECTIONS)[number];

export const AUXILIARY_CHANNELS = {
  open: "desktop:auxiliary-open",
  get: "desktop:auxiliary-get",
  payload: "desktop:auxiliary-payload",
  complete: "desktop:auxiliary-complete",
  close: "desktop:auxiliary-close",
  relay: "desktop:auxiliary-relay",
  command: "desktop:auxiliary-command",
  snapshot: "desktop:auxiliary-snapshot",
  snapshotRequest: "desktop:auxiliary-snapshot-request",
  snapshotReply: "desktop:auxiliary-snapshot-reply",
} as const;

export type AuxiliaryOpenRequest = {
  kind: AuxiliaryKind;
  payload?: unknown;
  size?: { width: number; height: number };
};

export type AuxiliaryWindowState = {
  kind: AuxiliaryKind;
  requestId: string;
  payload: unknown;
  modal: boolean;
  resizable: boolean;
};

export type AuxiliaryResult = {
  kind: AuxiliaryKind;
  requestId: string;
  status: "confirmed" | "cancelled";
  values?: unknown;
};

export type AuxiliaryOpenResponse =
  | { status: "opened"; requestId: string; kind: AuxiliaryKind }
  | AuxiliaryResult;

export type AuxiliaryAISetupConfig = {
  providerId: string;
  protocol?: string;
  baseURL: string;
  apiKey: string;
  modelOptions: Array<{ id: string; label: string; description?: string }>;
  selectedModelId: string | null;
  enabled: boolean;
};

export type AuxiliaryRelayMessage =
  | { type: "open-page"; pageId: string }
  | { type: "open-settings"; section: AuxiliarySettingsSection }
  | { type: "apply-ai-setup"; config: AuxiliaryAISetupConfig };

export type AuxiliaryMainCommand =
  | { type: "open-page"; pageId: string }
  | { type: "apply-ai-setup"; config: AuxiliaryAISetupConfig };

export type AuxiliarySnapshotResponse =
  | { ok: true; value: unknown }
  | { ok: false };

export interface AuxiliaryBridge {
  open: (request: AuxiliaryOpenRequest) => Promise<AuxiliaryOpenResponse>;
  get: () => Promise<AuxiliaryWindowState | null>;
  onPayload: (cb: (state: AuxiliaryWindowState) => void) => () => void;
  complete: (result: { status: "confirmed" | "cancelled"; values?: unknown }) => Promise<void>;
  close: () => Promise<void>;
  openPage: (pageId: string) => Promise<boolean>;
  openSettings: (section: AuxiliarySettingsSection) => Promise<boolean>;
  applyAISetup: (config: AuxiliaryAISetupConfig) => Promise<boolean>;
  requestSnapshot: <T = unknown>(key: string) => Promise<AuxiliarySnapshotResponse & { value?: T }>;
  onSnapshotRequest: (cb: (requestId: string, key: string) => void) => () => void;
  replySnapshot: (requestId: string, payload: unknown, ok?: boolean) => void;
  onCommand: (cb: (command: AuxiliaryMainCommand) => void) => () => void;
}

export function isAuxiliaryKind(value: unknown): value is AuxiliaryKind {
  return typeof value === "string" && (AUXILIARY_KINDS as readonly string[]).includes(value);
}

export function isAuxiliarySettingsSection(value: unknown): value is AuxiliarySettingsSection {
  return typeof value === "string" && (AUXILIARY_SETTINGS_SECTIONS as readonly string[]).includes(value);
}
