# 国内下载

安装包由 GitHub Actions 构建并发布到 [GitHub Releases](https://github.com/eachann1024/goose-note/releases)。应用检查更新和后台下载仍读取仓库里的 `updates/latest.json`，地址必须属于指定的 GitHub 仓库，并通过 SHA-256 校验后才能安装。

国内下载走夸克网盘。阿里云 OSS 国内同步已停用，不再读取 OSS 配置，也不再维护独立下载域名。

Desktop installers 每小时第 17 分检查一次。`package.json` 已有同版本 `v<版本>-*` 发布时，判断任务输出 `should_build=false`，编译、签名、上传和夸克任务全部跳过。版本变高并发布后，才把面向用户的安装包上传到夸克文件夹「鹅的笔记安装包」，只保留最新版和上一版；云端已有同名且大小相同的文件则跳过。只有 finish 明确完成后，才用它返回的文件编号（没有则用预上传编号）重命名，不再只按 `.uploading` 名字查找；未确认时保留旧文件并报 `finish_not_ready`。列表会带上风险文件名。失败留下的 `.uploading`、`.previous` 和「(1)」重名会在下一次处理时清掉。没有正式文件时，同大小的 `.uploading` 直接改回正式名；已经有正式文件时不复用临时文件，重新上传并等 finish 确认后才替换。手动想忽略版本判断时勾选 `force`。不重新编译时，在 Actions 运行 **Upload installers to Quark**，输入 `release_tag`（默认 `latest`）。
