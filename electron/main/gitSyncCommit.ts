interface Change { status: string; path: string; previous?: string }

/** Git -z output preserves Chinese names, tabs, spaces and rename pairs. */
function readChanges(output: string): Change[] {
  const fields = output.split("\0");
  const changes: Change[] = [];
  for (let i = 0; i < fields.length && fields[i];) {
    const status = fields[i++]!;
    const first = fields[i++]!;
    if (/^[RC]/.test(status)) changes.push({ status, previous: first, path: fields[i++]! });
    else changes.push({ status, path: first });
  }
  return changes;
}

const label = (status: string) => ({ A: "新增", D: "删除", R: "重命名", C: "复制" })[status[0]!] ?? "修改";
const hidden = (path: string) => path.split("/").some((part) => part.startsWith("."));
const asset = (path: string) => /(?:^|\/)assets\//.test(path);
const printable = (path: string) => path.replace(/[\r\n\t]/g, " ");

/** Only file names and counts enter the message; never include note contents. */
export function describeGitSyncChanges(output: string): string {
  const changes = readChanges(output);
  const notes = changes.filter((change) => !hidden(change.path) && /\.(?:md|markdown)$/i.test(change.path));
  const resources = changes.filter((change) => !hidden(change.path) && asset(change.path));
  const internal = changes.filter((change) => hidden(change.path));
  const other = changes.filter((change) => !hidden(change.path) && !notes.includes(change) && !resources.includes(change));
  const summary: string[] = [];
  for (const change of notes.slice(0, 2)) summary.push(`${label(change.status)} ${printable(change.path)}`);
  if (notes.length > 2) summary.push(`另 ${notes.length - 2} 篇笔记`);
  for (const [group, noun] of [[resources, "资源"], [other, "文件"]] as const) {
    for (const status of ["A", "M", "D", "R", "C"]) {
      const count = group.filter((change) => change.status.startsWith(status)).length;
      if (count) summary.push(`${label(status)}${noun} ${count} 个`);
    }
  }
  const historyNames = [...new Set(internal.map(({ path }) => {
    const mirror = path.match(/^(.*?)\.?goose\/history\/(.+\.(?:md|markdown))\//i);
    return mirror ? `${mirror[1]}${mirror[2]}` : path.split("/.goose/")[0] || "内部记录";
  }))];
  const title = summary.length
    ? `备份笔记：${summary.join("；")}`
    : `备份历史：${historyNames.slice(0, 2).join("、")}（${internal.length} 项）`;
  const sections: string[] = [];
  for (const [group, name] of [[notes, "笔记"], [resources, "静态资源"], [other, "其他文件"]] as const) {
    if (group.length) sections.push(`${name}：\n${group.map((change) => `- ${label(change.status)} ${change.previous ? `${printable(change.previous)} → ` : ""}${printable(change.path)}`).join("\n")}`);
  }
  if (internal.length) sections.push(`内部记录：${internal.length} 项\n${historyNames.map((name) => `- ${printable(name)}`).join("\n")}`);
  return `${title.length > 160 ? title.slice(0, 157) + "…" : title}\n\n${sections.join("\n\n")}`;
}
