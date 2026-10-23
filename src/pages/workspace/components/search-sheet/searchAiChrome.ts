/** 空结果时「启用 AI 问答」只在开关关闭时出现；询问行要等密钥和模型都齐。 */
export function searchAiEmptyChrome(input: { enabled: boolean; ready: boolean }): {
  showEnable: boolean;
  showAsk: boolean;
} {
  return { showEnable: !input.enabled, showAsk: input.ready };
}
