/** 分栏页签标题：平时只显示名称；指针在名称上，或键盘焦点在把手上时，改显示拖拽把手。 */

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

/** 只有键盘焦点（:focus-visible）才把把手留下；鼠标点按离开后名称要回来。 */
export function paneTitleGripFocus(state: PaneTitlePointer, focusVisible: boolean): PaneTitlePointer {
  return state.gripFocused === focusVisible ? state : { ...state, gripFocused: focusVisible };
}

export function paneTitleGripBlur(state: PaneTitlePointer): PaneTitlePointer {
  return state.gripFocused ? { ...state, gripFocused: false } : state;
}
