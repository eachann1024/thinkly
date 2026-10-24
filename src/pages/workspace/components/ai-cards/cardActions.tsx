import { createContext, useContext, type ReactNode } from "react";

export type CardActions = {
  send?: (text: string) => void;
  insert?: (markdown: string) => void;
  busy?: boolean;
};

export const CardActionsContext = createContext<CardActions>({});

export function CardActionsProvider({ value, children }: { value: CardActions; children: ReactNode }) {
  return <CardActionsContext.Provider value={value}>{children}</CardActionsContext.Provider>;
}

export function useCardActions(): CardActions {
  return useContext(CardActionsContext);
}
