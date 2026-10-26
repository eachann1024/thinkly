import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { localizeNotebookAiDiagnostic } from "@/lib/notebook-ai/localizeDiagnostic";

export type ArtifactActionState = "idle" | "busy" | "success" | "error";
export function useArtifactAction(identity: string) {
  const [states, setStates] = useState<Record<string, ArtifactActionState>>({});
  const pending = useRef(new Set<string>());
  const source = useRef(identity);
  const mounted = useRef(true);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; timers.current.forEach(clearTimeout); };
  }, []);
  useLayoutEffect(() => {
    source.current = identity;
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    setStates(Object.fromEntries([...pending.current].map(id => [id, "busy"])));
  }, [identity]);
  const run = (id: string, label: string, action: () => Promise<unknown>) => {
    if (pending.current.has(id)) return;
    pending.current.add(id);
    const previous = timers.current.get(id);
    if (previous) clearTimeout(previous);
    setStates(current => ({ ...current, [id]: "busy" }));
    const requestSource = source.current;
    void (async () => {
      let state: ArtifactActionState = "success";
      try { await action(); }
      catch (error) {
        state = "error";
        if (mounted.current && source.current === requestSource) {
          toast.error(`${label}：${localizeNotebookAiDiagnostic(error instanceof Error ? error.message : String(error))}`);
        }
      } finally {
        pending.current.delete(id);
        if (!mounted.current) return;
        setStates(current => ({ ...current, [id]: source.current === requestSource ? state : "idle" }));
        const timer = setTimeout(() => {
          timers.current.delete(id);
          if (mounted.current && source.current === requestSource) setStates(current => ({ ...current, [id]: "idle" }));
        }, 1800);
        timers.current.set(id, timer);
      }
    })();
  };
  return { states, run };
}
