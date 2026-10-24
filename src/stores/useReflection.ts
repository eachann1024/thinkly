import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { localStorageAdapter } from "@/lib/storage";
import type { ReflectionScope } from "@/lib/reflection/scopeRange";
import type { ReflectionNarrative } from "@/lib/reflection/generateReflection";

export interface ReflectionReport extends ReflectionNarrative {
  generatedAt: number;
}

const MAX_REPORTS = 12;

interface ReflectionState {
  reports: Record<string, ReflectionReport>;
  scheduledKeys: Partial<Record<ReflectionScope, string>>;
  markScheduled: (scope: ReflectionScope, key: string) => void;
  lastSeenWeekKey: string | null;
  aiConsent: boolean;
  aiConsentChosen: boolean;
  lastWeekEditedKey: string | null;
  generatingKey: string | null;
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
      scheduledKeys: {},
      markScheduled: (scope, key) => set((s) => ({ scheduledKeys: { ...s.scheduledKeys, [scope]: key } })),
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
        scheduledKeys: s.scheduledKeys,
        lastSeenWeekKey: s.lastSeenWeekKey,
        aiConsent: s.aiConsent,
        aiConsentChosen: s.aiConsentChosen,
      }),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<ReflectionState>;
        return {
          reports: version < 2 ? {} : (p.reports ?? {}),
          scheduledKeys: p.scheduledKeys ?? {},
          lastSeenWeekKey: p.lastSeenWeekKey ?? null,
          aiConsent: p.aiConsent === true,
          aiConsentChosen: version >= 3 ? p.aiConsentChosen === true : p.aiConsent === true,
        };
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ReflectionState>;
        return {
          ...current,
          reports: p.reports ?? current.reports,
          scheduledKeys: p.scheduledKeys ?? {},
          lastSeenWeekKey: p.lastSeenWeekKey ?? null,
          aiConsent: p.aiConsent === true,
          aiConsentChosen: p.aiConsentChosen === true,
        };
      },
    },
  ),
);

export function isReflectionAiConsented(
  state: Pick<ReflectionState, "aiConsent" | "aiConsentChosen">,
  aiEnabled: boolean,
) {
  return state.aiConsentChosen ? state.aiConsent : aiEnabled;
}

export const selectHasUnseenReflection = (weekKey: string) => (s: ReflectionState) =>
  s.lastWeekEditedKey === weekKey && s.lastSeenWeekKey !== weekKey;
