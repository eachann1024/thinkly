import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { OPEN_RECOVERY_DRAFTS_EVENT } from "@/lib/recoveryDrafts";
import { notifyRecoveryDraftsLoadFailure } from "@/lib/recoveryDraftNotice";

type RecoveryDialogProps = { open: boolean; onOpenChange: (open: boolean) => void };
type RecoveryDialogComponent = ComponentType<RecoveryDialogProps>;

export function RecoveryDraftsHost() {
  const [open, setOpen] = useState(false);
  const [DialogView, setDialogView] = useState<RecoveryDialogComponent | null>(null);

  useEffect(() => {
    let disposed = false;
    const onOpen = () => {
      setOpen(true);
      if (DialogView) return;
      void import("./RecoveryDraftsDialog").then((module) => {
        if (!disposed) setDialogView(() => module.RecoveryDraftsDialog);
      }).catch((error: unknown) => {
        if (disposed) return;
        setOpen(false);
        console.error("[recovery-drafts] dialog failed to load", error);
        notifyRecoveryDraftsLoadFailure();
      });
    };
    window.addEventListener(OPEN_RECOVERY_DRAFTS_EVENT, onOpen);
    return () => {
      disposed = true;
      window.removeEventListener(OPEN_RECOVERY_DRAFTS_EVENT, onOpen);
    };
  }, [DialogView]);

  return DialogView ? <DialogView open={open} onOpenChange={setOpen} /> : null;
}
