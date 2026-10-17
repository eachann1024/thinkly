# 应用语言维护

应用支持简体中文（`zh-Hans`）和英语（`en`）。没有本机偏好时跟随系统首选语言列表，依次匹配支持的语言，最后回退英语。`zh-Hans`、`zh-CN`、`zh-SG` 和无地区的 `zh` 匹配简体中文；繁体地区不会自动转成简体。

## 文案归属

组件或工具自己的文案放在所在 TS/TSX 文件的静态 YAML 字符串块中：

```tsx
import { i18nYaml, useMessages } from "@/i18n";

const messages = i18nYaml`
zh-Hans:
  save: 保存
  selected_other: "已选择 {{count}} 项"
en:
  save: Save
  selected_one: "{{count}} item selected"
  selected_other: "{{count}} items selected"
`;

export function SelectionStatus({ count }: { count: number }) {
  const t = useMessages(messages);
  return <span>{t("selected", { count })}</span>;
}
```

非 React 消费者使用 `createTranslator(messages)`；Electron 主进程导入 React 无关的 `src/i18n/core`。共享模块用一个 `.yaml` 文件同时维护两种语言，再从所属模块导出翻译器。全局按钮文案复用 `src/i18n/common.ts`。

不要使用 JavaScript `${…}` 拼接 YAML，不要把文案作为状态、CSS 选择器、权限判断或持久化标识。动态文本用完整句子和 `{{name}}`，数字复数用 `count`，保留原始数值供复数选择。样式使用稳定的 class 或 `data-*` 标记。

## 生成与构建

修改翻译后运行：

```sh
node scripts/i18n/check.mjs --generate
bun run typecheck
```

生成器为内嵌块添加来源类型标记，并维护分片声明和 YAML 声明文件；这些生成结果应一并提交，不手改。需要审校清单时使用 `--report /absolute/path/catalog.json`，报告属于派生产物，不是维护词典的 JSON 源文件。

Vite 与 Electron esbuild 共用 AST 提取和 YAML 校验。构建检查两种语言的键覆盖、插值、复数、重复键及生成声明是否过期；YAML 在构建期变成资源对象，生产运行时不解析翻译 YAML。开发时修改文案会更新声明并触发热更新。

运行时使用 i18next 读取、插值和选择复数；构建期使用既有 YAML 库及 magic-string 生成转换和源码映射。新增依赖不发送文案或用户数据到网络。

## 启动、偏好与区域格式

主进程在创建菜单和窗口前读取 `userData/language-preference.json`。这里只保存本机偏好枚举与格式版本，不保存翻译资源；配置不随笔记、备份或设置导入同步。

主进程提供有效语言、系统区域格式、已保存偏好和修订号。主窗口、速记、资源清理及预览 preload 在消费文案前取得启动快照。保存成功后立即重新决议语言，刷新主进程菜单并广播到所有窗口；选择「跟随系统」时重新读取系统首选语言列表，无需重启。

React 文案消费者使用 `useMessages(messages)`，或用 `useLocale()` 订阅有效语言；缓存展示文案的 `useMemo` 必须包含语言依赖；事件回调在执行时读取当前翻译，避免仅为语言切换改变请求或编辑器生命周期依赖。固定选项的展示文案在读取时翻译，不能缓存启动时的字符串。编辑器只更新词典及占位符，不以语言作为创建依赖，不重建编辑器或写入笔记。

偏好写入串行处理，使用临时文件与原子替换；成功后再通知窗口。损坏或无法读取的文件保留原样，并展示错误；检测到外部变更时拒绝覆盖。缺失配置使用跟随系统，已保存的手动选择不会因升级而重置。全量重置最后恢复跟随系统；普通导入或备份恢复不修改它。

日期和数字使用 `getFormatLocale()`，由操作系统区域设置提供，不能从界面语言推断。排序、笔记正文、已存标题、路径、AI 请求和回复保持独立；历史诊断仅在展示边界翻译，不重写持久化记录。

## 验收范围

遵循项目规则，不编写或运行测试用例。最小检查覆盖资源生成、类型、构建及入口与持久化源码审查。语言审校报告须绑定资源摘要，修改后复核变化项；模型审校不等于真人母语审校。实际系统语言识别、窗口布局、原生菜单与多窗口即时切换流程仍需真实宿主操作记录，构建成功不能代替这些证据。
