import { Toaster } from "@/components/ui/sonner";
import { RecoveryDraftsBody } from "./recovery/RecoveryDraftsBody";

export function RecoveryDraftsWindow() {
  return (
    <>
      <RecoveryDraftsBody />
      <Toaster placement="center" />
    </>
  );
}
