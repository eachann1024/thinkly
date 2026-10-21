# 国内下载

安装包由 GitHub Actions 构建并发布到 [GitHub Releases](https://github.com/eachann1024/thinkly/releases)。应用检查更新和后台下载仍读取仓库里的 `updates/latest.json`，地址必须属于指定的 GitHub 仓库，并通过 SHA-256 校验后才能安装。

国内下载走夸克网盘。阿里云 OSS 国内同步已停用，不再读取 OSS 配置，也不再维护独立下载域名。

Desktop installers 每小时整点检查一次。若 `package.json` 版本不高于已发布正式版，但自最近 release 以来仍有面向用户的新提交，则自动 patch +1、生成 CHANGELOG 条目，再构建并发布，最后把 `package.json`、`CHANGELOG.md` 与 `updates/`、`Casks/` 一并写回 main（`GITHUB_TOKEN` 推送不会再次触发本工作流）。仅有发版写回、`ci:`/`docs:` 或只改元数据路径的提交时输出 `should_build=false`，编译、签名和发布全部跳过。夸克不跟这次发版走：每天北京时间 06:00，Upload installers to Quark 读取 GitHub 最新正式 Release；「Thinkly 安装包」或旧文件夹「鹅的笔记安装包」里，应上传安装包的文件名和大小都已与附件一致时只读跳过，否则才上传到「Thinkly 安装包」并只保留最新版（新版全部上传成功后才删旧版，失败不删）。上传时云端已有同名且大小相同的文件则跳过。只有 finish 明确完成后，才用它返回的文件编号（没有则用预上传编号）重命名，不再只按 `.uploading` 名字查找；未确认时保留旧文件并报 `finish_not_ready`。列表会带上风险文件名。失败留下的 `.uploading`、`.previous` 和「(1)」重名会在下一次处理时清掉。没有正式文件时，同大小的 `.uploading` 直接改回正式名；已经有正式文件时不复用临时文件，重新上传并等 finish 确认后才替换。手动想忽略版本判断时勾选 `force`。不重新编译时，在 Actions 运行 **Upload installers to Quark**，输入 `release_tag`（默认 `latest`）。
