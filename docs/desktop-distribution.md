# 国内下载

安装包由 GitHub Actions 构建并发布到 [GitHub Releases](https://github.com/eachann1024/goose-note/releases)。应用检查更新和后台下载仍读取仓库里的 `updates/latest.json`，地址必须属于指定的 GitHub 仓库，并通过 SHA-256 校验后才能安装。

国内下载走夸克网盘。阿里云 OSS 国内同步已停用，不再读取 OSS 配置，也不再维护独立下载域名。
