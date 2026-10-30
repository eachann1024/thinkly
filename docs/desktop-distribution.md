# 国内下载

安装包由 GitHub Actions 构建并发布到 [GitHub Releases](https://github.com/eachann1024/thinkly/releases)。应用检查更新和后台下载仍读取仓库里的 `updates/latest.json`，地址必须属于指定的 GitHub 仓库，并通过 SHA-256 校验后才能安装。

国内下载走夸克网盘。阿里云 OSS 国内同步已停用，不再读取 OSS 配置，也不再维护独立下载域名。

每个平台只发布一个安装包：`Thinkly-<版本>-arm64.dmg`（Mac Apple 芯片）、`Thinkly-<版本>-x64-setup.exe`（Windows 64 位，ARM 电脑也能直接用）、`Thinkly-<版本>.AppImage`（Linux）。夸克「Thinkly 安装包」只放这三个文件，不放 zip、blockmap、yml。

Intel Mac、Linux deb / pacman 包不提供。需要请到 [GitHub](https://github.com/eachann1024/thinkly) 拉取源码自行编译。

zip、blockmap、yml 仅供应用内自动更新，无需下载。

Desktop installers 每小时整点检查一次。若 `package.json` 版本不高于已发布正式版，但自最近 release 以来仍有面向用户的新提交，则自动 patch +1、生成 CHANGELOG 条目，再构建并发布，最后把 `package.json`、`CHANGELOG.md` 与 `updates/`、`Casks/` 一并写回 main（`GITHUB_TOKEN` 推送不会再次触发本工作流）。仅有发版写回、`ci:`/`docs:` 或只改元数据路径的提交时输出 `should_build=false`，编译、签名和发布全部跳过。夸克不跟这次发版走：每天北京时间 06:00，Upload installers to Quark 读取 GitHub 最新正式 Release；「Thinkly 安装包」或旧文件夹「鹅的笔记安装包」里，应上传安装包的文件名和大小都已与附件一致时只读跳过，否则才上传到「Thinkly 安装包」。网盘里只留这一版的三个安装包（Mac arm64 .dmg、Windows x64 setup.exe、Linux .AppImage）和「说明.txt」，其余文件（旧版本、zip、其他格式）一律删除；新版全部上传成功后才删，失败不删。目录里有多余文件时也会进入上传步骤，把多余文件清掉。上传时云端已有同名且大小相同的文件则跳过。只有 finish 明确完成后，才用它返回的文件编号（没有则用预上传编号）重命名，不再只按 `.uploading` 名字查找；未确认时保留旧文件并报 `finish_not_ready`。列表会带上风险文件名。失败留下的 `.uploading`、`.previous` 和「(1)」重名会在下一次处理时清掉。没有正式文件时，同大小的 `.uploading` 直接改回正式名；已经有正式文件时不复用临时文件，重新上传并等 finish 确认后才替换。手动想忽略版本判断时勾选 `force`。不重新编译时，在 Actions 运行 **Upload installers to Quark**，输入 `release_tag`（默认 `latest`）。
