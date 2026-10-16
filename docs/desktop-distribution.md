# 国内下载与自动更新

GitHub Actions 构建安装包并发布 Release；同一任务将原文件同步到阿里云 OSS，通过自己的 HTTPS 下载域名和 CDN 分发，应用从该域名检查更新、后台下载，用户确认后重启安装。

## 接入状态

- `config/desktop-distribution.json` 的 `baseUrl` 为空时，维持现有 GitHub 发布与更新，不使用 OSS。
- 填入下载域名前，需要开通云服务、确认费用预算、配置域名和发布凭据；代码不会代替这些账号操作。
- 签名状态以实际构建记录为准；OSS 和 CDN 不会使未签名的安装包自动获得 Apple 公证或 Windows 签名。

## 云资源

1. 建立专用标准存储 OSS Bucket，权限使用私有读写；不要复用存放私人数据的目录，不要开放公共写入。
2. 确定下载域名，例如 `download.example.com`，添加 CDN 加速并配置 OSS 源站和私有 Bucket 回源授权，启用 HTTPS，再按控制台要求添加 DNS 记录。
3. 中国内地 OSS 绑定自定义域名、中国内地或全球 CDN 加速需要符合备案要求；无备案域名需另选合适区域，不能承诺与内地节点相同的下载体验。
4. 为下载安装包保留 `Content-Length`、`x-oss-meta-sha256` 和 `Content-Disposition` 响应头，关闭对安装包的内容转换；确认允许匿名 GET、HEAD 和 Range 请求。
5. 为 `/updates/latest.json` 和首页 `/index.html` 配置缓存时间 0，保留查询参数，遵循源站 `Cache-Control: no-store`；版本目录中的文件长期缓存。使用路径前缀时，规则也要包含该前缀。
6. 配置存储与 CDN 费用告警、下载流量监控及异常流量限制；费用告警不是强制支出上限。可清理 7 天前未完成的分片，避免中断上传长期占用空间。

官方说明：[OSS 自定义域名](https://help.aliyun.com/zh/oss/user-guide/access-buckets-via-custom-domain-names)、[CDN 添加域名](https://help.aliyun.com/zh/cdn/add-a-domain-name)、[Developer ID 与公证](https://developer.apple.com/developer-id/)。

## 发布配置

将确认可用的 HTTPS 下载地址写入 `config/desktop-distribution.json`；不带结尾 `/`，可包含独立路径前缀：

```json
{"baseUrl":"https://download.example.com/goose-note"}
```

GitHub 仓库的 Actions 配置：

| 位置 | 名称 | 内容 |
| --- | --- | --- |
| Variables | `OSS_BUCKET` | 专用 Bucket 名称 |
| Variables | `OSS_REGION` | 如 `oss-cn-hangzhou`，以实际地域为准 |
| Secrets | `OSS_ACCESS_KEY_ID` | 专用 RAM 发布身份 AccessKey ID |
| Secrets | `OSS_ACCESS_KEY_SECRET` | 对应的 AccessKey Secret |

发布身份仅授予目标对象前缀的读写和分片权限，不授予 Bucket 管理权限，也不使用主账号密钥；凭据不进入源码、下载页面或应用安装包。

```json
{
  "Version": "1",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["oss:GetObject", "oss:PutObject", "oss:ListParts", "oss:AbortMultipartUpload"],
    "Resource": ["acs:oss:*:*:YOUR_BUCKET/goose-note/*"]
  }]
}
```

没有路径前缀时，使用专用 Bucket 并将资源改为 `acs:oss:*:*:YOUR_BUCKET/*`；私有源站的 CDN 回源授权单独配置。发布工具依赖锁在 `scripts/distribution/package-lock.json`，由 CI 独立安装，不进入应用依赖。

## 首次同步与后续发版

首次接入可直接同步最新已发布安装包，无需重新构建：

```sh
gh workflow run distribution-sync.yml --repo eachann1024/goose-note --ref main
gh run list --repo eachann1024/goose-note --workflow distribution-sync.yml --limit 1
```

以后按照现有流程增加补丁版本、提交推送后发布：

```sh
node scripts/release-desktop.mjs
```

- 原有每日检查仍生效：只有新版本才构建发布；发布、修复及国内同步共用锁，防止旧任务覆盖新版本。
- 同步先核对 GitHub Release 的文件清单、长度和 SHA-256，再上传并验证公开下载地址；安装包、macOS 更新 ZIP 和校验文件全部就绪后，最后切换 `updates/latest.json`。
- 同一版本路径不覆盖不同内容，不允许最新清单回退；任务中断后可重新运行同步，已上传且校验一致的文件会复用。
- 首页展示安装包、更新日志和签名状态；每个版本保留独立页面，应用更新弹窗由安装包中的现有更新界面展示日志。
- 国内更新清单不可读取或不合法时，应用尝试 GitHub 清单；所有下载地址必须属于内置的下载域名或指定 GitHub 仓库，并通过 SHA-256 校验后才能安装。

## 最小验收

1. 在普通浏览器打开真实下载首页，核对桌面与手机布局、更新日志和对应架构的链接。
2. 确认真实域名的 `updates/latest.json` 返回新版本、国内下载 URL 和 SHA-256；不要把登录后的控制台预览当作公开下载成功。
3. 至少完整下载一个安装包并核对 SHA-256；脚本的 HEAD 校验只能确认长度与元数据。
4. 使用较旧的已安装版本确认检查、后台下载、日志弹窗和确认后重启；确认新版本号，并保留真实验收结果。
5. 若签名或公证尚未配置，明确记录该状态；未完成的云配置和更新安装验收不得标为通过。
