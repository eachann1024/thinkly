
export function shouldProcessComposerInput(options: {
  isComposingFlag: boolean;
  imeSessionActive?: boolean;
  inputEventIsComposing?: boolean;
}): boolean {
  return !(
    options.isComposingFlag ||
    options.imeSessionActive === true ||
    options.inputEventIsComposing === true
  );
}

export const COMPOSER_INPUT_FLUSH_MS = 200;
export const COMPOSER_DELETE_FLUSH_MS = 350;
export const COMPOSER_CHIP_DELETE_FLUSH_MS = 400;

export function isComposerDeleteInputType(inputType: string | undefined) {
  if (!inputType) return false;
  return (
    inputType.startsWith("delete") ||
    inputType === "historyUndo" ||
    inputType === "historyRedo"
  );
}
