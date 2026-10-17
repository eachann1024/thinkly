import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { localStorageAdapter } from "@/lib/storage";
import {
  EMPTY_ACTIVITY,
  appendEdit,
  pruneActivity,
  type ActivityLog,
} from "@/lib/reflection/activityLog";

export interface ReflectionReport {
  title: string;
  body: string;
  generatedAt: number;
}

const MAX_REPORTS = 12;

interface ReflectionState {
  activity: ActivityLog;
  /** weekKey -> 报告 */
  reports: Record<string, ReflectionReport>;
  lastSeenWeekKey: string | null;
  /** 用户已同意把上周笔记标题和摘要发给当前 AI。 */
  aiConsent: boolean;
  generatingKey: string | null;
  error: string | null;
  recordEdit: (pageId: string, now: number) => void;
  saveReport: (weekKey: string, report: ReflectionReport) => void;
  markSeen: (weekKey: string) => void;
  setAiConsent: (value: boolean) => void;
  setGenerating: (weekKey: string | null, error?: string | null) => void;
}

export const useReflection = create<ReflectionState>()(
  persist(
    (set) => ({
      activity: EMPTY_ACTIVITY,
      reports: {},
      lastSeenWeekKey: null,
      aiConsent: false,
      generatingKey: null,
      error: null,
      recordEdit: (pageId, now) =>
        set((s) => ({ activity: appendEdit(s.activity, pageId, now) })),
      saveReport: (weekKey, report) =>
        set((s) => {
          const reports = { ...s.reports, [weekKey]: report };
          const keys = Object.keys(reports).sort().slice(-MAX_REPORTS);
          return { reports: Object.fromEntries(keys.map((k) => [k, reports[k]])) };
        }),
      markSeen: (weekKey) =>
        set((s) => (s.lastSeenWeekKey === weekKey ? s : { lastSeenWeekKey: weekKey })),
      setAiConsent: (aiConsent) => set({ aiConsent }),
      setGenerating: (generatingKey, error = null) => set({ generatingKey, error }),
    }),
    {
      name: "goose-note-reflection",
      version: 1,
      storage: createJSONStorage(() => localStorageAdapter),
      skipHydration: true,
      partialize: (s) => ({
        activity: s.activity,
        reports: s.reports,
        lastSeenWeekKey: s.lastSeenWeekKey,
        aiConsent: s.aiConsent,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ReflectionState>;
        return {
          ...current,
          activity:
            p.activity?.buckets && p.activity.pages
              ? pruneActivity(p.activity, Date.now())
              : current.activity,
          reports: p.reports ?? current.reports,
          lastSeenWeekKey: p.lastSeenWeekKey ?? null,
          aiConsent: p.aiConsent === true,
        };
      },
    },
  ),
);

/** 红点：上一周的报告已生成但还没打开过。 */
export const selectHasUnseenReflection = (weekKey: string) => (s: ReflectionState) =>
  Boolean(s.reports[weekKey]) && s.lastSeenWeekKey !== weekKey;
