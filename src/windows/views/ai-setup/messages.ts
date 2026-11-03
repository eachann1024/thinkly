import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/windows/views/ai-setup/messages.ts#localMessages:1">`
zh-Hans:
  title: "配置 AI 写作助手"
  intro: "选择服务商，保存配置并选择模型。保存后这个窗口会自动关闭，主窗口的 AI 面板立即可用。"
  openSettings: "打开完整设置"
  later: "稍后配置"
  save: "保存"
  unavailable: "无法读取主窗口的设置。"
en:
  title: "Set up the AI writing assistant"
  intro: "Choose a provider, save your settings, and select a model. This window closes after saving, and the AI panel in the main window is ready to use."
  openSettings: "Open full settings"
  later: "Set up later"
  save: "Save"
  unavailable: "The main window’s settings could not be read."
ja:
  title: "AI 執筆アシスタントを設定"
  intro: "プロバイダを選び、設定を保存してモデルを選択します。保存するとこのウィンドウは閉じ、メインウィンドウの AI パネルをすぐに使えます。"
  openSettings: "すべての設定を開く"
  later: "あとで設定"
  save: "保存"
  unavailable: "メインウィンドウの設定を読み込めませんでした。"
`;

export const uiText = createTranslator(localMessages);
