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

def verdict(review):
    if not review:
        return "无审核结果"
    return f"{review.get('merge_recommendation', '?')} / 风险 {review.get('risk_level', '?')}"

def block_merge(reasons):
    gh("label", "create", block, "-R", repo, "--color", "B60205",
       "--description", "AI 闸门判定需要人工处理", check=False)
    gh("api", "-X", "POST", f"repos/{repo}/issues/{pr}/labels", "-f", f"labels[]={block}", check=False)
    reasons = sorted(reasons, key=lambda r: r.startswith(("合并建议为", "风险等级为")))
    lines = [f"- {short(r)}" for r in reasons[:3]]
    if len(reasons) > 3:
        lines.append(f"- 另有 {len(reasons) - 3} 条，见 Actions 运行摘要")
    body = (f"### 🤖 自动合并已拦截\n结论：{verdict(review)}\n" + "\n".join(lines) +
            f"\n\n审核提交：`{sha[:7]}`")
    gh("pr", "comment", pr, "-R", repo, "--body", body, check=False)
    print("BLOCKED:", reasons)
    sys.exit(0)

review = {}
try:
    review = json.loads(env.get("REVIEW_JSON") or "{}") or {}
except Exception:
    review = None
try:
    with open(env["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as fh:
        fh.write("## AI 审核结论\n\n```json\n" +
                 json.dumps(review, ensure_ascii=False, indent=2)[:60000] + "\n```\n")
except Exception:
    pass

info = api(f"repos/{repo}/pulls/{pr}")
labels = {l["name"] for l in info["labels"]}
if info["draft"]:
    print("draft PR; skip merge"); sys.exit(0)
if info["state"] != "open" or info["head"]["sha"] != sha:
    print("PR closed or head moved; a newer run will handle it"); sys.exit(0)

reasons = []
allowed = {a.strip() for a in env["ALLOWED_AUTHORS"].split(",") if a.strip()}
if info["user"]["login"] not in allowed:
    print("author not allowed; review only"); sys.exit(0)

if env["REVIEW_RESULT"] != "success":
    reasons.append(f"AI 审核未成功完成（{env['REVIEW_RESULT']}），按规则不自动合并")
if review is None:
    review = {}
    reasons.append("AI 审核输出无法解析")
elif not review:
    reasons.append("没有拿到 AI 审核的结构化结果")
else:
    rec = str(review.get("merge_recommendation", "")).strip()
    risk = str(review.get("risk_level", "")).strip().lower()
    sec_raw = review.get("security_concerns", None)
    if isinstance(sec_raw, bool):
        sec_text = "true" if sec_raw else "false"
        sec_clear = not sec_raw
    else:
        sec_text = str(sec_raw or "").strip()
        low = sec_text.lower()
        sec_clear = low.startswith("no") or low in {"false", "none", "null"}
    ok_recs = {"safe_to_merge"} | ({"merge_with_caution"} if env["ALLOW_CAUTION"] == "true" else set())
    if rec not in ok_recs:
        reasons.append(f"合并建议为 `{rec or '缺失'}`")
    if risk not in {"low", "medium"}:
        reasons.append(f"风险等级为 `{risk or '缺失'}`")
    if sec_raw is None or (not isinstance(sec_raw, bool) and not sec_text):
        reasons.append("安全审查字段缺失")
    elif not sec_clear:
        reasons.append(f"存在安全疑虑：{sec_text[:300]}")
    issues = review.get("key_issues_to_review") or []
    if not isinstance(issues, list):
        issues = []
    fatal_kw = re.compile(
        r"安全漏洞|安全隐患|安全问题|安全风险|不安全|安全性|漏洞|注入|泄露|密钥|令牌|凭据|鉴权|认证|授权|越权|权限|计费|扣费|支付|账单|"
        r"数据(丢失|损坏|泄露|删除|清空|覆盖)|丢数据|迁移|schema|"
        r"\b(security|vulnerab\w*|injection|secret|credential|authn|authz|authenticat\w*|authoriz\w*|"
        r"permission|billing|payment|migration|data loss|corrupt\w*)\b", re.I)
    for it in issues:
        if isinstance(it, dict):
            text = f"{it.get('issue_header', '')} {it.get('issue_content', '')}"
            if fatal_kw.search(text):
                reasons.append("审核意见涉及安全/鉴权/计费/数据/迁移：" + str(it.get("issue_header", ""))[:120])
    if rec == "changes_required":
        for it in issues:
            if isinstance(it, dict):
                reasons.append("要改：" + short(f"{str(it.get('relevant_file', '')).strip()} "
                                             f"{str(it.get('issue_header', '')).strip()}：{it.get('issue_content', '')}"))
if any("security" in l.lower() for l in labels):
    reasons.append("PR 带有安全疑虑标签")

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
hit = [n for n in names if any(protected(n, p) for p in prot)]
if hit:
    reasons.append("改动了受保护路径：" + ", ".join(hit[:10]))

if reasons:
    block_merge(reasons)

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

for _ in range(10):
    info = api(f"repos/{repo}/pulls/{pr}")
    if info["mergeable"] is not None:
        break
    time.sleep(6)
if info["head"]["sha"] != sha:
    print("head moved while waiting; skip"); sys.exit(0)
if info["mergeable"] is not True:
    block_merge([f"PR 当前不可合并（mergeable={info['mergeable']}, state={info.get('mergeable_state')}），可能有冲突"])

r = subprocess.run(["gh", "pr", "merge", pr, "-R", repo, "--squash", "--delete-branch",
                    "--match-head-commit", sha], capture_output=True, text=True)
if r.returncode != 0:
    block_merge([f"合并调用失败：{(r.stderr or r.stdout).strip()[:300]}"])
gh("pr", "comment", pr, "-R", repo, "--body",
   f"✅ AI 审核通过（{verdict(review)}），已自动合并 `{sha[:7]}`", check=False)
print("MERGED", repo, pr, sha)
