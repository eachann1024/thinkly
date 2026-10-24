import "./lib/node-dom";
import { access, mkdir, mkdtemp, readFile, realpath, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createChecker } from "./lib/check";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { useNotebookAiChats, migrateNotebookAiChatsState } from "@/stores/useNotebookAiChats";
import { createRunWriteScope, checkOperationScope, resolveOperationTarget, revokeRunWriteScope } from "@/lib/notebook-ai/resourceScope";
import { freezeNotebookAiComposerRun, freezeNotebookAiRun, getNotebookAiRunContext, resolveRunCurrentPageId, selectRunWriteTargets } from "@/lib/notebook-ai/runContext";
import { executeBatchPlanInputSchema, repairExecuteBatchPlanInput } from "@/lib/notebook-ai/batch-plan/toolSchema";
import { serializeAiComposerDoc } from "@/components/editor/ai/composer/referenceSerialization";
import { canReadNotebookResource, dedupeResourceSelections, formatResourceManifest, prepareNotebookAiReferences, toResourceReference } from "@/lib/notebook-ai/readResourceScope";
import { listFolder } from "@/lib/notebook-ai/tools/folders";
import { readPage } from "@/lib/notebook-ai/tools/notes";
import { READ_ONLY_TOOL_NAMES } from "@/lib/notebook-ai/toolAccess";
import { prepareBatchPlan } from "@/lib/notebook-ai/batch-plan/batchPrepare";
import { executePreparedBatchPlan, undoBatchPlan } from "@/lib/notebook-ai/batch-plan/executor";
import { readBatchPlanJournal, writeBatchPlanJournal } from "@/lib/notebook-ai/batch-plan/journal";
import { persistSessionMessages } from "@/pages/workspace/components/notebook-ai/session/sessionMessages";
import { updatePlanMessages } from "@/pages/workspace/components/notebook-ai/approval/updatePlanMessages";
import { reviewOperationPath } from "@/pages/workspace/components/notebook-ai/approval/planReviewData";
import { recoverCreatedOperation } from "@/lib/notebook-ai/batch-plan/batchRecoveryCreate";
import { plannedContent } from "@/lib/notebook-ai/batch-plan/batchPlannedContent";
import { writeNotebookText } from "../../electron/main/writeNotebookText";
import type { Page } from "@/types";
import type { ResourceRef } from "@/lib/notebook-ai/resourceScope";
import type { NotebookAiMessage } from "@/lib/notebook-ai/types";
import type { NotebookAiAgentContext } from "@/lib/notebook-ai/types";

const checker = createChecker();
const { check } = checker;
function page(id: string, workspaceId: string, parentId?: string, isFolder = false): Page {
  return { id, workspaceId, parentId, isFolder, content: [{ id: `${id}-body`, type: "paragraph", content: [{ type: "text", text: "原文", styles: {} }], children: [] }],
    isLocked: false, fontSize: "default", fontFamily: "default", createdAt: 1, updatedAt: 1 };
}
function throws(fn: () => unknown) { try { fn(); return false; } catch { return true; } }
async function rejects(fn: () => Promise<unknown>) { try { await fn(); return false; } catch { return true; } }

export default async function run() {
  const originalFs = window.gooseFs;
  const originalPages = usePages.getState();
  const originalNotebooks = useNotebooks.getState();
  const originalChats = useNotebookAiChats.getState();
  const temporary = await mkdtemp(path.join(tmpdir(), "thinkly-ai-scope-"));
  try {
    useNotebooks.setState({ notebooks: {
      a: { id: "a", name: "同名本", createdAt: 1, updatedAt: 1 },
      b: { id: "b", name: "同名本", createdAt: 1, updatedAt: 1 },
    }, activeNotebookId: "a" });
    const pages = { fa: page("fa", "a", undefined, true), fb: page("fb", "b", undefined, true),
      a1: page("a1", "a", "fa"), a2: page("a2", "a", "fa"), sub: page("sub", "a", "fa", true),
      deep: page("deep", "a", "sub"), b1: page("b1", "b", "fb"), outside: page("outside", "a") };
    usePages.setState({ pages, hydrated: true, activePageId: "outside" });
    const attrs = [
      { workspaceId: "a", pageId: "fa", kind: "folder" as const, titleSnapshot: "同名目录", role: "context" as const },
      { workspaceId: "b", pageId: "fb", kind: "folder" as const, titleSnapshot: "同名目录", role: "context" as const },
    ];
    await prepareNotebookAiReferences(attrs);
    const sources = attrs.map((ref) => toResourceReference(ref, "source"));
    const root: ResourceRef = { refId: "a-root", notebookId: "a", kind: "notebook", title: "同名本", relativePath: "/" };
    const targets = selectRunWriteTargets({ prompt: "分别新建摘要文件到各自目录", references: sources, fallbackRoot: root });
    check("同名跨本目录按 notebookId + pageId 保留身份", sources.length === 2 && sources[0]!.notebookId !== sources[1]!.notebookId && targets.length === 2);
    check("纯摘要及多来源单篇汇总不自动授予写入", ["分别生成摘要", "汇总为一篇笔记", "简单总结即可，不新建笔记", "仅回复，不保存文件", "不要生成文件，仅回复"].every((prompt) => selectRunWriteTargets({ prompt, references: sources, fallbackRoot: root }).length === 0));
    const labelsOnly = serializeAiComposerDoc({ type: "doc", content: [{ type: "paragraph", content: [
      { type: "aiFileReference", attrs: { ...attrs[0], titleSnapshot: "新建笔记" } },
      { type: "aiSkillCommand", attrs: { name: "创建文件" } },
      { type: "aiImageAttachment", attrs: { imageId: "image", fileName: "保存笔记.png", mediaType: "image/png", size: 1 } },
    ] }] });
    check("空 freeform 的资源标题、技能名与图片名不授予写权限", labelsOnly.promptText.includes("新建笔记") && labelsOnly.freeformText === "" && freezeNotebookAiComposerRun({ notebookId: "a", payload: labelsOnly, references: sources }).targetReferences.length === 0);
    check("明确创建单篇但目标不唯一时不回退当前本", selectRunWriteTargets({ prompt: "新建一篇汇总笔记", references: sources, fallbackRoot: root }).length === 0);
    const fallback = freezeNotebookAiRun({ notebookId: "a", prompt: "新建一份笔记" });
    check("无引用明确新建冻结当前本根", fallback.targetReferences[0]?.notebookId === "a" && fallback.targetReferences[0]?.kind === "notebook");
    check("显式无当前页不会被迟到活动页替换", resolveRunCurrentPageId(null, () => "outside") === null && resolveRunCurrentPageId(undefined, () => "outside") === "outside");
    const scope = createRunWriteScope({ runId: "verify-scope", sourceReferences: sources, targetReferences: targets });
    targets[0]!.notebookId = "b";
    check("发送后的范围不受草稿引用改动影响", scope.targetReferences[0]?.notebookId === "a");
    check("多目标缺目的地拒绝执行", throws(() => resolveOperationTarget({ type: "create" }, "a", scope)));
    const invalidExplicitCreate = { type: "create", title: "x", markdown: "x", target: { notebookId: "a" } };
    check("显式 create target 缺 parentId 在 schema、repair 与执行边界拒绝", !executeBatchPlanInputSchema.safeParse({ title: "x", summary: "x", operations: [invalidExplicitCreate] }).success && repairExecuteBatchPlanInput(JSON.stringify({ title: "x", summary: "x", changes: [invalidExplicitCreate] })) === null && throws(() => resolveOperationTarget({ type: "create", target: { notebookId: "a" } }, "a", scope)));
    check("唯一 scope 目标兼容省略 target，根仍为明确 null", resolveOperationTarget({ type: "create" }, "a", fallback).parentId === null);
    const targetA = { notebookId: "a", parentId: "fa" };
    check("新建仅可落入授权目录", checkOperationScope({ type: "create" }, targetA, scope) === null && !!checkOperationScope({ type: "create" }, { notebookId: "a", parentId: null }, scope));
    check("source 目录不授予修改正文", !!checkOperationScope({ type: "edit", pageId: "a1" }, { notebookId: "a", pageId: "a1" }, scope));
    check("冲突 target 不按页面标题猜测归属", throws(() => resolveOperationTarget({ type: "edit", pageId: "a1", target: { notebookId: "b", pageId: "b1" } }, "a", scope)));
    check("资源清单不随正文预算截断", JSON.parse(formatResourceManifest(Array.from({ length: 140 }, (_, i) => ({ ...sources[i % 2]!, refId: `resource-${i}` }))).split("\n")[1]!).length === 140);
    check("相同资源重复选择去重但跨本不合并", dedupeResourceSelections([attrs[0]!, attrs[0]!, attrs[1]!], pages).length === 2);
    const ctx: NotebookAiAgentContext = { notebookId: "a", currentPageId: null, loadedSkills: new Set(), resourceReferences: sources, writeScope: scope };
    const options = { toolCallId: "verify-read", messages: [], experimental_context: ctx };
    const first = await listFolder.execute!({ notebookId: "a", folderId: "fa", recursive: true, limit: 2 }, options);
    const second = "nextCursor" in first && first.nextCursor ? await listFolder.execute!({ notebookId: "a", folderId: "fa", recursive: true, limit: 100, cursor: first.nextCursor }, options) : null;
    check("目录分页完整且枚举不声称读取正文", "entries" in first && first.total === 4 && first.loaded === 0 && first.omitted === 3 && !!second && "entries" in second && new Set([...first.entries, ...second.entries].map((entry) => entry.pageId)).size === 4 && second.nextCursor === null);
    usePages.setState({ pages: { ...usePages.getState().pages, extra: page("extra", "a", "fa") } });
    const stale = "nextCursor" in first && first.nextCursor ? await listFolder.execute!({ notebookId: "a", folderId: "fa", recursive: true, limit: 2, cursor: first.nextCursor }, options) : null;
    check("目录变化使旧分页游标失效", stale && "error" in stale);
    check("来源不越界读取同本其他页面", !canReadNotebookResource(ctx, pages.outside) && canReadNotebookResource(ctx, pages.deep));
    const denied = await readPage.execute!({ notebookId: "b", pageId: "a1" }, options);
    check("readPage 验证 notebookId 实际归属", "error" in denied);
    const onlyTarget = { ...ctx, resourceReferences: [{ ...sources[0]!, role: "target" as const }] };
    check("写入目录不扩大只读正文范围", !canReadNotebookResource(onlyTarget, pages.a1));
    check("搜索只读工具入口始终没有写工具", READ_ONLY_TOOL_NAMES.includes("listFolder") && !(READ_ONLY_TOOL_NAMES as readonly string[]).some((name) => ["executeBatchPlan", "loadSkill"].includes(name)));
    check("失效引用在发送前失败", await rejects(() => prepareNotebookAiReferences([{ ...attrs[0]!, workspaceId: "b" }])));
    useNotebooks.setState({ notebooks: { ...useNotebooks.getState().notebooks,
      unavailable: { id: "unavailable", name: "离线", source: "local-folder", localPath: "/missing", localPathMissing: true, createdAt: 1, updatedAt: 1 } } });
    check("未 ready 本地目录不能作为空目录发送", await rejects(() => prepareNotebookAiReferences([{ ...attrs[0]!, workspaceId: "unavailable" }])));
    usePages.setState({ pages: { ...usePages.getState().pages, nested: page("nested", "a", "a1") } });
    const parentRef: ResourceRef = { refId: "parent-only", notebookId: "a", kind: "page", pageId: "a1", title: "父页", relativePath: "/父页", role: "target" };
    const deleteScope = createRunWriteScope({ runId: "verify-delete-scope", sourceReferences: [{ ...parentRef, refId: "child-source", pageId: "nested", role: "source" }], targetReferences: [parentRef] });
    const protectedDelete = await prepareBatchPlan({ toolCallId: "verify-delete", runId: "verify-delete", notebookId: "a", writeScope: deleteScope,
      input: { title: "删除父页", summary: "仅授权父页", operations: [{ operationId: "delete", type: "delete", pageIds: ["a1"], target: { notebookId: "a", pageId: "a1" } }] } });
    check("删除父页不能连带删除未授权子页", !protectedDelete.ok && protectedDelete.error.includes("未获得本轮修改或删除授权"));

    const rootA = path.join(temporary, "a"), rootB = path.join(temporary, "b");
    await mkdir(path.join(rootA, "folder"), { recursive: true });
    await mkdir(path.join(rootB, "folder"), { recursive: true });
    const exists = async (file: string) => { try { await access(file); return true; } catch { return false; } };
    window.gooseFs = {
      exists: () => false, existsAsync: exists,
      readFileAsync: async (file: string) => { try { return await readFile(file, "utf8"); } catch { return null; } },
      realpathAsync: async (file: string) => { try { return await realpath(file); } catch { return null; } },
      statAsync: async (file: string) => { const info = await stat(file); return { size: info.size, mtimeMs: info.mtimeMs }; },
      createFileAsync: async (file: string, content: string) => { await writeNotebookText(file, content, true); return true; },
      deleteFile: async (file: string) => { await rm(file); return true; },
    } as unknown as NonNullable<Window["gooseFs"]>;
    useNotebooks.setState({ notebooks: {
      ...useNotebooks.getState().notebooks,
      a: { ...useNotebooks.getState().notebooks.a!, source: "local-folder", localPath: rootA },
      b: { ...useNotebooks.getState().notebooks.b!, source: "local-folder", localPath: rootB },
    } });
    const localFa = { ...pages.fa, localFilePath: path.join(rootA, "folder") };
    const localFb = { ...pages.fb, localFilePath: path.join(rootB, "folder") };
    usePages.setState({ pages: { ...usePages.getState().pages, fa: localFa, fb: localFb } });
    const batchRefs = attrs.map((ref) => toResourceReference(ref, "source"));
    const writeScope = createRunWriteScope({ runId: "verify-batch", sourceReferences: batchRefs, targetReferences: batchRefs.map((ref) => ({ ...ref, role: "target" })) });
    const input = { title: "跨本产物", summary: "分别创建", operations: [
      { operationId: "ca", type: "create" as const, title: "A产物", markdown: "A内容", target: targetA },
      { operationId: "cb", type: "create" as const, title: "B产物", markdown: "B内容", target: { notebookId: "b", parentId: "fb" } },
      { operationId: "cc", type: "create" as const, title: "依赖产物", markdown: "依赖B", dependsOn: ["cb"], target: targetA },
    ] };
    const prepared = await prepareBatchPlan({ toolCallId: "verify-plan", runId: "verify-batch", notebookId: "a", input, writeScope });
    check("真实 prepare 冻结每项 notebook 与目录并可恢复", prepared.ok && readBatchPlanJournal("verify-plan", "verify-batch")?.operationTargets?.cb?.notebookId === "b");
    const concurrentScope = { ...writeScope, runId: "verify-concurrent-scope" };
    const concurrent = await Promise.all(["verify-concurrent-a", "verify-concurrent-b"].map((toolCallId) => prepareBatchPlan({ toolCallId, runId: "verify-concurrent", notebookId: "a", input, writeScope: concurrentScope })));
    check("并发同 run prepare 只分配一个冻结计划", concurrent.every((item) => item.ok) && concurrent[0]!.journal.toolCallId === concurrent[1]!.journal.toolCallId && JSON.stringify(concurrent[0]!.journal.plannedLocalPaths) === JSON.stringify(concurrent[1]!.journal.plannedLocalPaths));
    const alias = await prepareBatchPlan({ toolCallId: "verify-alias", runId: "verify-batch", notebookId: "a", input, writeScope });
    const changedRun = await prepareBatchPlan({ toolCallId: "verify-different", runId: "verify-batch", notebookId: "a", input: { ...input, title: "被替换的计划" }, writeScope });
    check("同 run 不同 toolcall 复用 journal 且拒绝替换", alias.ok && alias.journal.toolCallId === "verify-plan" && !changedRun.ok);
    const narrowedScope = createRunWriteScope({ runId: "verify-narrowed-host", sourceReferences: batchRefs, targetReferences: [] });
    const narrowed = await prepareBatchPlan({ toolCallId: "verify-plan", runId: "verify-batch", notebookId: "a", input, writeScope: narrowedScope });
    check("新用户轮收窄权限不能复用旧工具调用授权", !narrowed.ok && readBatchPlanJournal("verify-plan", "verify-batch")?.writeScope?.runId === writeScope.runId);
    const contested = await Promise.all([writeScope, narrowedScope].map((hostScope) => prepareBatchPlan({ toolCallId: "verify-shared-host-call", runId: "verify-shared-model-run", notebookId: "a", input, writeScope: hostScope })));
    check("不同 host scope 并发同工具 ID 不覆盖 journal", contested.filter((result) => result.ok).length === 1 && contested[0]!.journal.writeScope?.runId === contested[1]!.journal.writeScope?.runId && readBatchPlanJournal("verify-shared-host-call", "verify-shared-model-run")?.writeScope?.runId === writeScope.runId);
    usePages.setState({ pages: Object.fromEntries(Object.entries(usePages.getState().pages).filter(([id]) => id !== "fb")) });
    const partial = await executePreparedBatchPlan("verify-plan", "verify-batch");
    const createdA = partial.results.find((item) => item.operationId === "ca")?.pageIds[0];
    check("某本失败保留独立成功并阻断其依赖", !partial.ok && partial.results.find((item) => item.operationId === "ca")?.ok && !partial.results.find((item) => item.operationId === "cb")?.ok && partial.results.find((item) => item.operationId === "cc")?.skipped && !!createdA && usePages.getState().pages[createdA]?.workspaceId === "a", partial.results);
    usePages.setState({ pages: { ...usePages.getState().pages, fb: localFb } });
    const retried = await executePreparedBatchPlan("verify-plan", "verify-batch");
    check("重试跳过成功项且 B 回执仍属于原本", retried.ok && retried.results.find((item) => item.operationId === "ca")?.pageIds[0] === createdA && retried.results.find((item) => item.operationId === "cb")?.notebookId === "b" && retried.results.length === 3, retried.results);
    const pathB = reviewOperationPath(retried.journal.input.operations[1]!, retried.journal);
    check("结果路径按原 notebook 定位", pathB.includes("同名本") && pathB.includes("/") && retried.journal.operationTargets?.cb?.parentId === "fb");
    const undone = await undoBatchPlan("verify-plan", "verify-batch");
    check("跨本撤回使用原 journal 归属", undone.ok && !!createdA && !usePages.getState().pages[createdA], undone.error);
    const interruptedOp = retried.journal.input.operations[0]!;
    if (interruptedOp.type !== "create") throw new Error("expected create fixture");
    const collisionFile = retried.journal.plannedLocalPaths.ca!;
    await writeNotebookText(collisionFile, "外部原文", true);
    const outsidePage = { ...page("external-same-content", "a", "fa"), localFilePath: collisionFile, content: plannedContent(interruptedOp, retried.journal) };
    usePages.setState({ pages: { ...usePages.getState().pages, [outsidePage.id]: outsidePage } });
    const recoveredCreate = await recoverCreatedOperation(interruptedOp, { ...retried.journal, createdPageIds: {}, after: {}, results: [], executingOperationId: "ca" });
    check("中断恢复不认领同路径同正文外部页且保留文件", recoveredCreate.status === "failed" && recoveredCreate.results.length === 0 && await readFile(collisionFile, "utf8") === "外部原文");
    usePages.setState({ pages: Object.fromEntries(Object.entries(usePages.getState().pages).filter(([id]) => id !== outsidePage.id)) });
    const beforeIds = Object.keys(usePages.getState().pages);
    window.gooseFs = { ...window.gooseFs, existsAsync: async () => false };
    const failedCreate = await usePages.getState().createLocalPageRecord({ workspaceId: "a", filePath: collisionFile, title: "collision", content: page("fixture", "a").content });
    check("碰撞后创建清理不误删现有磁盘文件", failedCreate === null && await readFile(collisionFile, "utf8") === "外部原文" && Object.keys(usePages.getState().pages).length === beforeIds.length);
    window.gooseFs = { ...window.gooseFs, existsAsync: exists };
    const cancelScope = createRunWriteScope({ runId: "verify-cancel-scope", sourceReferences: batchRefs, targetReferences: batchRefs.map((ref) => ({ ...ref, role: "target" })) });
    const cancelInput = { ...input, operations: input.operations.slice(0, 2).map((op) => ({ ...op, title: `${op.title}-cancel` })) };
    const cancelPlan = await prepareBatchPlan({ toolCallId: "verify-cancel", runId: "verify-cancel", notebookId: "a", input: cancelInput, writeScope: cancelScope });
    const createFile = window.gooseFs!.createFileAsync!;
    window.gooseFs = { ...window.gooseFs, createFileAsync: async (file, content) => { const ok = await createFile(file, content); revokeRunWriteScope(cancelScope.runId); return ok; } };
    const canceled = await executePreparedBatchPlan("verify-cancel", "verify-cancel");
    check("执行中显式停止保留当前成功并阻止后续操作", cancelPlan.ok && !canceled.ok && canceled.results[0]?.ok && !canceled.results[1]?.ok && canceled.results[1]?.pageIds.length === 0);
    check("停止后的部分成功仍可撤回", (await undoBatchPlan("verify-cancel", "verify-cancel")).ok);
    window.gooseFs = { ...window.gooseFs, createFileAsync: createFile };
    const legacy = { ...retried.journal, version: 1 as const, toolCallId: "legacy", runId: "legacy" };
    writeBatchPlanJournal(legacy);
    check("v1 日志兼容不读取后加 target", readBatchPlanJournal("legacy", "legacy")?.input.operations.every((op) => op.target === undefined));
    revokeRunWriteScope(scope.runId);
    check("显式撤销后拒绝继续写入", !!checkOperationScope({ type: "create" }, targetA, scope));

    const cA = useNotebookAiChats.getState().createConversation("a");
    const cB = useNotebookAiChats.getState().createConversation("b");
    const history: NotebookAiMessage[] = [
      { id: "u", role: "user", parts: [{ type: "text", text: "分别创建" }], metadata: { writeScope, resourceReferences: sources } },
      { id: "assistant", role: "assistant", parts: [
        { type: "tool-loadSkill", toolCallId: "skill", state: "output-available", input: { skill: "createNoote" }, output: { supported: true } },
        { type: "tool-executeBatchPlan", toolCallId: "verify-plan", state: "output-available", input, output: { runId: "verify-batch", results: retried.results } },
      ] } as NotebookAiMessage,
    ];
    const changed = updatePlanMessages(history, "verify-plan", (part) => ({ ...part, output: { status: "undone", results: retried.results } }));
    persistSessionMessages("a", cA, changed);
    const restored = migrateNotebookAiChatsState(JSON.parse(JSON.stringify({ chats: useNotebookAiChats.getState().chats })));
    const recoveredHistory = restored.chats.a!.conversations[cA]!.messages;
    const runtime = getNotebookAiRunContext(recoveredHistory);
    check("后台审批只更新捕获原会话，新本记录不受影响", useNotebookAiChats.getState().getConversationMessages("b", cB).length === 0 && recoveredHistory.length === 2);
    check("历史恢复保留范围、工具卡与已加载能力", runtime.writeScope?.runId === "verify-batch" && runtime.loadedSkills?.includes("createNoote") && JSON.stringify(recoveredHistory).includes('"status":"undone"'));
    check("新用户轮不会继承旧写权限", !getNotebookAiRunContext([...recoveredHistory, { id: "u2", role: "user", parts: [{ type: "text", text: "继续聊天" }] }]).writeScope);
    check("迟到结果不复活已删除会话", !persistSessionMessages("a", "deleted-conversation", changed));
    const collisionPath = path.join(temporary, "同名.md");
    await writeNotebookText(collisionPath, "第一次", true);
    const collisionRejected = await rejects(() => writeNotebookText(collisionPath, "覆盖", true));
    check("宿主实际 exclusive 创建原子拒绝碰撞且保留旧正文", collisionRejected && await readFile(collisionPath, "utf8") === "第一次");
  } catch (error) {
    check("固定验收完整执行", false, error instanceof Error ? error.stack : error);
  } finally {
    window.gooseFs = originalFs;
    usePages.setState(originalPages, true);
    useNotebooks.setState(originalNotebooks, true);
    useNotebookAiChats.setState(originalChats, true);
    await rm(temporary, { recursive: true, force: true });
  }
  return checker.failed;
}
