import { useEffect, useState } from "react";

export type GitAvailability = "unknown" | "ready" | "missing";

export function useGitAvailability(refresh: boolean): GitAvailability {
  const [status, setStatus] = useState<GitAvailability>("unknown");
  useEffect(() => {
    const probe = window.gooseDesktop?.gitSync?.gitAvailable;
    if (!probe) {
      setStatus("missing");
      return;
    }
    let cancelled = false;
    probe().then(
      (ready) => {
        if (!cancelled) setStatus(ready ? "ready" : "missing");
      },
      () => {
        if (!cancelled) setStatus((current) => (current === "ready" ? current : "missing"));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [refresh]);
  return status;
}
