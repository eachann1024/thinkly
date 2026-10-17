# 国内下载

安装包由 GitHub Actions 构建并发布到 [GitHub Releases](https://github.com/eachann1024/goose-note/releases)。应用检查更新和后台下载仍读取仓库里的 `updates/latest.json`，地址必须属于指定的 GitHub 仓库，并通过 SHA-256 校验后才能安装。

国内下载走夸克网盘。阿里云 OSS 国内同步已停用，不再读取 OSS 配置，也不再维护独立下载域名。

Desktop installers 每小时检查一次。`package.json` 版本号没有变高时只跑判断，不构建、不发布，夸克任务也不启动。版本变高并发布后，才把面向用户的安装包上传到夸克文件夹「鹅的笔记安装包」，只保留最新版和上一版；云端已有同名且大小相同的文件则跳过。手动想忽略版本判断时勾选 `force`。不重新编译时，在 Actions 运行 **Upload installers to Quark**，输入 `release_tag`（默认 `latest`）。
