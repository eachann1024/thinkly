
export type PaneTitleChrome = "name" | "grip";

export type PaneTitlePointer = {
  pointerOnTitle: boolean;
  gripFocused: boolean;
};

export const paneTitlePointerIdle: PaneTitlePointer = {
  pointerOnTitle: false,
  gripFocused: false,
};

export function paneTitleChrome(state: PaneTitlePointer): PaneTitleChrome {
  return state.pointerOnTitle || state.gripFocused ? "grip" : "name";
}

export function paneTitleShowsName(chrome: PaneTitleChrome): boolean {
  return chrome === "name";
}

export function paneTitleShowsGrip(chrome: PaneTitleChrome): boolean {
  return chrome === "grip";
}

export function paneTitlePointerEnter(state: PaneTitlePointer): PaneTitlePointer {
  return state.pointerOnTitle ? state : { ...state, pointerOnTitle: true };
}

export function paneTitlePointerLeave(state: PaneTitlePointer): PaneTitlePointer {
  return state.pointerOnTitle ? { ...state, pointerOnTitle: false } : state;
}

export function paneTitleGripFocus(state: PaneTitlePointer, focusVisible: boolean): PaneTitlePointer {
  return state.gripFocused === focusVisible ? state : { ...state, gripFocused: focusVisible };
}

export function paneTitleGripBlur(state: PaneTitlePointer): PaneTitlePointer {
  return state.gripFocused ? { ...state, gripFocused: false } : state;
}
