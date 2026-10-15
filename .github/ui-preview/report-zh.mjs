const labels = {
  before: "改前",
  after: "改后",
  success: "通过",
  failure: "失败",
  failed: "失败",
  completed: "已完成",
  incomplete: "未完成",
  running: "执行中",
  in_progress: "执行中",
  queued: "排队中",
  pending: "待执行",
  skipped: "已跳过",
  cancelled: "已取消",
  timed_out: "已超时",
  unknown: "未知",
  "not-run": "未执行",
  "Launch the built Electron app with an isolated profile and temporary note": "使用独立配置和临时笔记启动构建后的 Electron 应用",
  "Exit setup using its normal button": "点击“退出引导”进入应用",
  "Append a paragraph using the editor": "在真实编辑器中追加一段文字",
  "Observe the paragraph written to the Markdown file": "确认追加的文字已写入 Markdown 文件",
  "Quit the app and reopen the same note and profile": "退出应用，并使用相同配置重新打开笔记",
  "Open settings from the sidebar": "从侧栏打开设置",
  "Open settings: general": "打开通用设置",
  "Open settings: appearance": "打开外观与主题设置",
  "Close settings": "关闭设置",
  "Fresh profile: setup guide": "首次启动：设置引导",
  "Markdown opened through the desktop file association": "通过桌面文件关联入口打开 Markdown 笔记",
  "Paragraph is visible and its Markdown file has been saved": "追加的文字已显示，Markdown 文件已保存",
  "Saved paragraph is visible after restarting the real desktop app": "重启真实桌面应用后，已保存的文字仍然可见",
  "Settings: general": "通用设置",
  "Settings: appearance": "外观与主题设置",
  "State at the failed step": "操作失败时的界面",
  "No interaction record was produced": "未生成操作记录",
  "No desktop interactions completed": "未完成桌面交互操作",
  "macOS and Windows native behavior, global hotkeys, real accounts and external services": "macOS 与 Windows 原生行为、全局快捷键、真实账号及外部服务",
  "Changed feature behavior outside the recorded steps; screenshots require human review": "所列步骤以外的功能变化；截图仍需人工审核",
  "Renderer errors were recorded; review electron.log and manifest.json": "记录到渲染进程错误，请查看 electron.log 和 manifest.json",
};

export function zh(value) {
  const text = String(value ?? "");
  if (Object.hasOwn(labels, text)) return labels[text];
  const extra = /^Additional scene (\d+)$/.exec(text);
  if (extra) return `补充场景 ${extra[1]}`;
  const action = /^(click|fill|press|waitFor): (.*)$/s.exec(text);
  if (action) {
    const names = { click: "点击", fill: "填写", press: "按键", waitFor: "等待显示" };
    return `${names[action[1]]}：${action[2]}`;
  }
  // Preserve contributor captions and original diagnostic details verbatim.
  return text;
}
