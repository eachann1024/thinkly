import json, os, re, subprocess, sys, time

env = os.environ
repo, pr, sha = env["REPO"], env["PR"], env["HEAD_SHA"]
block = env["BLOCK_LABEL"]

def gh(*args, check=True):
    r = subprocess.run(["gh", *args], capture_output=True, text=True)
    if check and r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        raise SystemExit(f"gh {' '.join(args[:3])} failed")
    return r.stdout

def api(path):
    return json.loads(gh("api", path))

def short(s, n=120):
    s = " ".join(str(s).split())
    return s if len(s) <= n else s[:n - 1] + "…"

EXPECTED_FIELDS = ("merge_recommendation", "risk_level", "security_concerns", "key_issues_to_review")

def json_objects(raw):
    raw = raw or ""
    dec = json.JSONDecoder()
    found = []
    i = 0
    while i < len(raw):
        start = raw.find("{", i)
        if start < 0:
            break
        try:
            obj, end = dec.raw_decode(raw, start)
        except json.JSONDecodeError:
            i = start + 1
            continue
        if isinstance(obj, dict):
            found.append(obj)
        i = end if end > start else start + 1
    return found

def parse_failure(raw, objects, missing):
    raw = raw or ""
    lines = len(raw.splitlines())
    miss = ",".join(missing) if missing else "无"
    raise SystemExit(
        f"审核结果无法解析：字节 {len(raw.encode('utf-8'))}，行数 {lines}，"
        f"JSON 对象 {len(objects)}，缺少字段 {miss}"
    )

def parse_review(raw):
    """取最后一个带 merge_recommendation 的完整 JSON 对象。失败时只报元数据。"""
    raw = raw or ""
    if not raw.strip():
        return {}
    found = json_objects(raw)
    chosen = [obj for obj in found if "merge_recommendation" in obj]
    if not chosen:
        last = found[-1] if found else {}
        missing = [field for field in EXPECTED_FIELDS if field not in last]
        parse_failure(raw, found, missing or ["merge_recommendation"])
    return chosen[-1]

def read_review_raw():
    path = env.get("REVIEW_PATH", "").strip()
    if not path:
        if env.get("REVIEW_RESULT") == "success":
            raise SystemExit("审核产物缺失：没有 REVIEW_PATH。审核 JSON 不能通过 job output 传递。")
        return ""
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except FileNotFoundError:
        if env.get("REVIEW_RESULT") == "success":
            raise SystemExit(
                "审核产物缺失：review 任务已成功，但读不到审核 JSON 文件。"
                "结果不再走 job output；产物丢失时无法判断能否合并。"
            )
        return ""

def verdict(review):
    if not review:
        return "无审核结果"
    rec = str(review.get("merge_recommendation", ""))
    risk = str(review.get("risk_level", "")).lower()
    if rec not in {"safe_to_merge", "merge_with_caution", "changes_required"}:
        rec = "invalid"
    if risk not in {"low", "medium", "high"}:
        risk = "invalid"
    return f"{rec} / 风险 {risk}"

def block_merge(reasons):
    gh("label", "create", block, "-R", repo, "--color", "B60205",
       "--description", "AI 闸门判定需要人工处理", check=False)
    gh("api", "-X", "POST", f"repos/{repo}/issues/{pr}/labels", "-f", f"labels[]={block}", check=False)
    # 结论行已写了建议和风险，要点里优先放具体原因
    reasons = sorted(reasons, key=lambda r: r.startswith(("合并建议为", "风险等级为")))
    lines = [f"- {short(r)}" for r in reasons[:3]]
    if len(reasons) > 3:
        lines.append(f"- 另有 {len(reasons) - 3} 条，见 Actions 运行摘要")
    body = (f"### 🤖 自动合并已拦截\n结论：{verdict(review)}\n" + "\n".join(lines) +
            f"\n\n审核提交：`{sha[:7]}`")
    gh("pr", "comment", pr, "-R", repo, "--body", body, check=False)
    print("BLOCKED:", reasons)
    sys.exit(0)

review = parse_review(read_review_raw())
# 摘要只写枚举，不写模型原文
try:
    rec_name = str(review.get("merge_recommendation", "")) if review else ""
    risk_name = str(review.get("risk_level", "")).lower() if review else ""
    if rec_name not in {"safe_to_merge", "merge_with_caution", "changes_required"}:
        rec_name = "invalid" if review else "none"
    if risk_name not in {"low", "medium", "high"}:
        risk_name = "invalid" if review else "none"
    issues = review.get("key_issues_to_review") if review else []
    issue_count = len(issues) if isinstance(issues, list) else 0
    with open(env["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as fh:
        fh.write("## AI 审核结论\n\n"
                 f"merge_recommendation={rec_name}\n\n"
                 f"risk_level={risk_name}\n\n"
                 f"issue_count={issue_count}\n")
except Exception:
    pass

info = api(f"repos/{repo}/pulls/{pr}")
labels = {l["name"] for l in info["labels"]}
if info["draft"]:
    print("draft PR; skip merge"); sys.exit(0)
if info["state"] != "open" or info["head"]["sha"] != sha:
    print("PR closed or head moved; a newer run will handle it"); sys.exit(0)

reasons = []
rec = ""
allowed = {a.strip() for a in env["ALLOWED_AUTHORS"].split(",") if a.strip()}
if info["user"]["login"] not in allowed:
    # 不是仓库主人的 PR：只审不合，也不发评论
    print("author not allowed; review only"); sys.exit(0)

# 1) 审核本身必须成功且有结构化结果（超时/报错/无输出 = 不合并）
if env["REVIEW_RESULT"] != "success":
    reasons.append(f"AI 审核未成功完成（{env['REVIEW_RESULT']}），按规则不自动合并")
elif not review:
    raise SystemExit(
        "审核产物缺失：review 任务已成功，但审核 JSON 为空。"
        "结果不再通过 job output 传递；产物丢失时无法判断能否合并。"
    )
else:
    rec = str(review.get("merge_recommendation", "")).strip()
    risk = str(review.get("risk_level", "")).strip().lower()
    # Actions 把 PR-Agent YAML 里的 No 编进 output JSON 时会变成布尔 false，不能当安全疑虑
    sec_raw = review.get("security_concerns", None)
    if isinstance(sec_raw, bool):
        sec_text = "true" if sec_raw else "false"
        sec_clear = not sec_raw
    else:
        sec_text = str(sec_raw or "").strip()
        low = sec_text.lower()
        sec_clear = low.startswith("no") or low in {"false", "none", "null"}
    known_recs = {"safe_to_merge", "merge_with_caution", "changes_required"}
    ok_recs = {"safe_to_merge"} | ({"merge_with_caution"} if env["ALLOW_CAUTION"] == "true" else set())
    if rec not in ok_recs:
        reasons.append(f"合并建议为 `{rec}`" if rec in known_recs else "合并建议缺失或不在允许集合")
    if risk not in {"low", "medium"}:
        reasons.append(f"风险等级为 `{risk}`" if risk in {"low", "medium", "high"} else "风险等级缺失或不在允许集合")
    if sec_raw is None or (not isinstance(sec_raw, bool) and not sec_text):
        reasons.append("安全审查字段缺失")
    elif not sec_clear:
        reasons.append("存在安全疑虑")
    # 安全/鉴权/计费/数据/迁移类意见一律转人工
    issues = review.get("key_issues_to_review") or []
    if not isinstance(issues, list):
        issues = []
    # 不用裸「安全」：建议里的「并发安全/线程安全」不是安全漏洞
    fatal_kw = re.compile(
        r"安全漏洞|安全隐患|安全问题|安全风险|不安全|安全性|漏洞|注入|泄露|密钥|令牌|凭据|鉴权|认证|授权|越权|权限|计费|扣费|支付|账单|"
        r"数据(丢失|损坏|泄露|删除|清空|覆盖)|丢数据|迁移|schema|"
        r"\b(security|vulnerab\w*|injection|secret|credential|authn|authz|authenticat\w*|authoriz\w*|"
        r"permission|billing|payment|migration|data loss|corrupt\w*)\b", re.I)
    for it in issues:
        if isinstance(it, dict):
            text = f"{it.get('issue_header', '')} {it.get('issue_content', '')}"
            if fatal_kw.search(text):
                reasons.append("审核意见涉及安全/鉴权/计费/数据/迁移")
    if rec == "changes_required":
        reasons.append(f"有 {sum(isinstance(it, dict) for it in issues)} 条必须修改的意见")
if any("security" in l.lower() for l in labels):
    reasons.append("PR 带有安全疑虑标签")

# 2) 受保护路径默认转人工。主人、本仓库、safe_to_merge 可以放过非密钥路径。
files = json.loads(gh("api", "--paginate", "--slurp", f"repos/{repo}/pulls/{pr}/files?per_page=100"))
names = [f["filename"] for page in files for f in page]
prot = [p.strip() for p in env["PROTECTED_PATHS"].split(",") if p.strip()]
def protected(n, p):
    base = n.rsplit("/", 1)[-1]
    if p.endswith("/"):
        return ("/" + n).find("/" + p) >= 0
    if p.startswith("*"):
        return n.endswith(p[1:])
    return base.startswith(p)
def secret_material(path):
    # 目录段 secrets / credentials，而不只看文件名。文件名仍匹配 .env*、*.pem、*.key、*.p12、id_rsa*。
    parts = [part.casefold() for part in path.split("/") if part]
    if any(part in {"secrets", "credentials"} for part in parts):
        return True
    base = parts[-1] if parts else ""
    if base.startswith(".env") or base.startswith("id_rsa") or base.startswith("secrets") or base.startswith("credentials"):
        return True
    return base.endswith((".pem", ".key", ".p12"))
head_repo = ((info.get("head") or {}).get("repo") or {}).get("full_name") or ""
owner_bypass = info["user"]["login"] == "eachann1024" and head_repo == repo and rec == "safe_to_merge"
secret_hit = [n for n in names if secret_material(n)]
hit = [n for n in names if any(protected(n, p) for p in prot)]
other = [n for n in hit if n not in set(secret_hit)]
if secret_hit:
    reasons.append("改动了密钥类路径：" + ", ".join(secret_hit[:10]))
if other and not owner_bypass:
    reasons.append("改动了受保护路径：" + ", ".join(other[:10]))
elif other and owner_bypass:
    print("owner same-repo safe_to_merge; allow protected paths:", ", ".join(other[:10]))

if reasons:
    block_merge(reasons)

# 3) 等同一提交上的其他检查全部结束且全绿（排除本 workflow 自己的 job）
own = {"ai-review", "ai-merge-gate"}
deadline = time.time() + int(env["CHECKS_TIMEOUT_MIN"]) * 60
while True:
    runs = api(f"repos/{repo}/commits/{sha}/check-runs?per_page=100")["check_runs"]
    runs = [r for r in runs if r["name"] not in own]
    status = api(f"repos/{repo}/commits/{sha}/status")
    pending = [r["name"] for r in runs if r["status"] != "completed"] + \
              [s["context"] for s in status["statuses"] if s["state"] == "pending"]
    bad = [f"{r['name']}={r['conclusion']}" for r in runs
           if r["status"] == "completed" and r["conclusion"] not in ("success", "skipped", "neutral")] + \
          [f"{s['context']}={s['state']}" for s in status["statuses"] if s["state"] in ("failure", "error")]
    if bad:
        block_merge(["其他检查未通过：" + ", ".join(bad[:10])])
    if not pending:
        break
    if time.time() > deadline:
        block_merge([f"等待检查超过 {env['CHECKS_TIMEOUT_MIN']} 分钟（{', '.join(pending[:10])}），超时不合并"])
    time.sleep(30)

# 4) 可合并状态
for _ in range(10):
    info = api(f"repos/{repo}/pulls/{pr}")
    if info["mergeable"] is not None:
        break
    time.sleep(6)
if info["head"]["sha"] != sha:
    print("head moved while waiting; skip"); sys.exit(0)
if info["mergeable"] is not True:
    block_merge([f"PR 当前不可合并（mergeable={info['mergeable']}, state={info.get('mergeable_state')}），可能有冲突"])

# 5) 合并：--match-head-commit 保证合并的就是审核过的那个提交
r = subprocess.run(["gh", "pr", "merge", pr, "-R", repo, "--squash", "--delete-branch",
                    "--match-head-commit", sha], capture_output=True, text=True)
if r.returncode != 0:
    block_merge([f"合并调用失败：{(r.stderr or r.stdout).strip()[:300]}"])
gh("pr", "comment", pr, "-R", repo, "--body",
   f"✅ AI 审核通过（{verdict(review)}），已自动合并 `{sha[:7]}`", check=False)
print("MERGED", repo, pr, sha)
