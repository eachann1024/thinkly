import { useEffect, useRef } from "react";
import { isSetupGuideVisible } from "@/lib/setupGuide";
import { useSettings } from "@/stores/useSettings";

const NOTICE_ID = "ai-writing-assistant";

/** Opens the standalone AI setup window once, instead of the old in-app dialog. */
export function AIFeatureNotice() {
  const dismissed = useSettings((s) => s.dismissedNotices[NOTICE_ID] === true);
  const hydrated = useSettings((s) => s._hasHydrated === true);
  const guideVisible = useSettings((s) => isSetupGuideVisible(s));
  const dismissNotice = useSettings((s) => s.dismissNotice);
  const opened = useRef(false);

  useEffect(() => {
    if (!hydrated || dismissed || guideVisible || opened.current) return;
    const open = window.gooseDesktop?.auxiliary?.open;
    if (!open) return;
    opened.current = true;
    void open({ kind: "ai-setup" }).then(
      () => dismissNotice(NOTICE_ID),
      () => {
        opened.current = false;
      },
    );
  }, [dismissed, dismissNotice, guideVisible, hydrated]);

  return null;
}
