import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { localStorageAdapter } from "@/lib/storage";
import type { ReflectionNarrative } from "@/lib/reflection/generateReflection";

export interface ReflectionReport extends ReflectionNarrative {
  generatedAt: number;
}

const MAX_REPORTS = 12;

interface ReflectionState {
  /** 「范围:结束日期」-> 报告 */
  reports: Record<string, ReflectionReport>;
  /** 已读红点的上周 weekKey。 */
  lastSeenWeekKey: string | null;
  /** 用户已同意把笔记标题和摘要发给当前 AI。 */
  aiConsent: boolean;
  /** 用户手动开关过反思授权。未手动时，AI 启用即视为打开。 */
  aiConsentChosen: boolean;
  /** 上周有编辑时为上周 weekKey（仅内存，由历史记录计算）。 */
  lastWeekEditedKey: string | null;
  generatingKey: string | null;
  /** 最近一次失败，按报告键记录，避免误伤其它范围。 */
  failure: { key: string; message: string } | null;
  saveReport: (key: string, report: ReflectionReport) => void;
  markSeen: (weekKey: string) => void;
  setAiConsent: (value: boolean) => void;
  setLastWeekEditedKey: (weekKey: string | null) => void;
  setGenerating: (key: string | null) => void;
  setFailed: (key: string, message: string) => void;
}

export const useReflection = create<ReflectionState>()(
  persist(
    (set) => ({
      reports: {},
      lastSeenWeekKey: null,
      aiConsent: false,
      aiConsentChosen: false,
      lastWeekEditedKey: null,
      generatingKey: null,
      failure: null,
      saveReport: (key, report) =>
        set((s) => {
          const reports = { ...s.reports, [key]: report };
          const keys = Object.keys(reports)
            .sort((a, b) => reports[a].generatedAt - reports[b].generatedAt)
            .slice(-MAX_REPORTS);
          return { reports: Object.fromEntries(keys.map((k) => [k, reports[k]])) };
        }),
      markSeen: (weekKey) =>
        set((s) => (s.lastSeenWeekKey === weekKey ? s : { lastSeenWeekKey: weekKey })),
      setAiConsent: (aiConsent) => set({ aiConsent, aiConsentChosen: true }),
      setLastWeekEditedKey: (lastWeekEditedKey) => set({ lastWeekEditedKey }),
      setGenerating: (generatingKey) =>
        set((s) => ({
          generatingKey,
          failure: generatingKey ? null : s.failure,
        })),
      setFailed: (key, message) => set({ generatingKey: null, failure: { key, message } }),
    }),
    {
      name: "thinkly-reflection",
      version: 3,
      storage: createJSONStorage(() => localStorageAdapter),
      skipHydration: true,
      partialize: (s) => ({
        reports: s.reports,
        lastSeenWeekKey: s.lastSeenWeekKey,
        aiConsent: s.aiConsent,
        aiConsentChosen: s.aiConsentChosen,
      }),
      // v1 的 activity 分桶已废弃（改读版本历史），旧周报缺少范围键与主题，一并丢弃；授权与已读保留。
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<ReflectionState>;
        return {
          reports: version < 2 ? {} : (p.reports ?? {}),
          lastSeenWeekKey: p.lastSeenWeekKey ?? null,
          aiConsent: p.aiConsent === true,
          // v3 前的 false 是默认未授权。只有当时已打开，才算用户选过。
          aiConsentChosen: version >= 3 ? p.aiConsentChosen === true : p.aiConsent === true,
        };
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ReflectionState>;
        return {
          ...current,
          reports: p.reports ?? current.reports,
          lastSeenWeekKey: p.lastSeenWeekKey ?? null,
          aiConsent: p.aiConsent === true,
          aiConsentChosen: p.aiConsentChosen === true,
        };
      },
    },
  ),
);

/** 未手动选择时，AI 已启用则反思默认打开。 */
export function isReflectionAiConsented(
  state: Pick<ReflectionState, "aiConsent" | "aiConsentChosen">,
  aiEnabled: boolean,
) {
  return state.aiConsentChosen ? state.aiConsent : aiEnabled;
}

/** 红点：上周有编辑，且还没打开过弹窗。 */
export const selectHasUnseenReflection = (weekKey: string) => (s: ReflectionState) =>
  s.lastWeekEditedKey === weekKey && s.lastSeenWeekKey !== weekKey;
