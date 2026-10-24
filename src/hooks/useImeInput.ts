import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react";

interface ImeKeyboardEventLike {
  isComposing?: boolean;
  keyCode?: number;
  which?: number;
}

export function isImeKeyboardEvent(event: ImeKeyboardEventLike) {
  return (
    event.isComposing === true || event.keyCode === 229 || event.which === 229
  );
}

export function shouldSkipAppHotkeyEvent(
  event: ImeKeyboardEventLike & { repeat?: boolean },
  allowRepeat = false,
) {
  return isImeKeyboardEvent(event) || (event.repeat === true && !allowRepeat);
}

export function isDuplicateCompositionEndChange(
  compositionEndValue: string | null,
  nextValue: string,
) {
  return compositionEndValue !== null && compositionEndValue === nextValue;
}

export function useImeInput(initialValue: string) {
  const [value, setStateValue] = useState(initialValue);
  const valueRef = useRef(initialValue);
  const isComposingRef = useRef(false);
  const compositionEndValueRef = useRef<string | null>(null);

  const setValue: Dispatch<SetStateAction<string>> = useCallback((next) => {
    const resolved = typeof next === "function" ? next(valueRef.current) : next;
    valueRef.current = resolved;
    compositionEndValueRef.current = null;
    setStateValue(resolved);
  }, []);

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.value;
    valueRef.current = nextValue;

    if (
      isDuplicateCompositionEndChange(compositionEndValueRef.current, nextValue)
    ) {
      compositionEndValueRef.current = null;
      return;
    }

    compositionEndValueRef.current = null;
    setStateValue(nextValue);
  }, []);

  const onCompositionStart = useCallback(
    (_event: CompositionEvent<HTMLInputElement>) => {
      isComposingRef.current = true;
      compositionEndValueRef.current = null;
    },
    [],
  );

  const onCompositionEnd = useCallback(
    (event: CompositionEvent<HTMLInputElement>) => {
      const finalValue = event.currentTarget.value;
      isComposingRef.current = false;
      valueRef.current = finalValue;
      compositionEndValueRef.current = finalValue;
      setStateValue(finalValue);
    },
    [],
  );

  const isComposing = useCallback(
    (event?: KeyboardEvent<HTMLInputElement>) =>
      isComposingRef.current ||
      (event
        ? isImeKeyboardEvent(event.nativeEvent) || isImeKeyboardEvent(event)
        : false),
    [],
  );

  return {
    value,
    valueRef,
    setValue,
    isComposing,
    inputProps: {
      onChange,
      onCompositionStart,
      onCompositionEnd,
    },
  };
}
