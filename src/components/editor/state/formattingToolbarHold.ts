import { createContext, useContext } from "react";

export const FormattingToolbarHoldContext = createContext(false);

export function useFormattingToolbarHold() {
  return useContext(FormattingToolbarHoldContext);
}
