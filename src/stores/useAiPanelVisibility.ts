import { create } from "zustand";

/** 工作区布局算出的 AI 面板真实可见状态，供侧栏等非布局组件只读订阅。 */
export const useAiPanelVisibility = create<{ visible: boolean }>(() => ({
  visible: false,
}));
