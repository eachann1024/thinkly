export function searchAiEmptyChrome(input: { enabled: boolean; ready: boolean }): {
  showEnable: boolean;
  showAsk: boolean;
} {
  return { showEnable: !input.enabled, showAsk: input.ready };
}
