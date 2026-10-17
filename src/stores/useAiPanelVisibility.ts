import { create } from "zustand";

/** 工作区布局算出的 AI 面板真实可见状态与有效布局模式，供侧栏、标题栏等非布局组件只读订阅。 */
export const useAiPanelVisibility = create<{ visible: boolean; fullscreen: boolean }>(() => ({
  visible: false,
  fullscreen: true,
}));
