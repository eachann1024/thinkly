## 验收与交付

- 默认不操作电脑验收；需要验收素材时可使用 `/Users/eachann/Library/Mobile Documents/com~apple~CloudDocs/0Markdown/测试验收/鸿蒙 App.md`。
- 功能、修复或优化验收通过后执行 `bun run mac`：打包 macOS 应用，关闭正在运行的 Goose Note，安装最新版并打开。

## 版本与代码组织

- 每完成一个功能、修复或优化，将 `package.json` 补丁版本号加一且不复用已发布号；如 `1.7.99` → `1.7.100`，不因补丁号位数增加而进位。
- 手写实现按独立职责拆分，主要模块约 200–300 行，每个文件不超过 300 行；入口、类型和纯工具允许更短。
