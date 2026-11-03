import type { AuxiliaryOpenResponse } from "@/lib/auxiliary-window/contract";
import { readConfirmValues, type ConfirmPayload, type ConfirmValues } from "@/windows/views/confirmPayload";

export async function openConfirm(payload: ConfirmPayload, height = 320): Promise<ConfirmValues | null> {
  const open = window.gooseDesktop?.auxiliary?.open;
  if (!open) return null;
  let response: AuxiliaryOpenResponse;
  try {
    response = await open({
      kind: "confirm",
      payload,
      size: { width: 460, height },
    });
  } catch {
    return null;
  }
  if (response.status !== "confirmed") return null;
  return readConfirmValues(response.values);
}
