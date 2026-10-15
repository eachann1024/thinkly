import { useRef, useState } from "react";
import { useBlockNoteEditor } from "@blocknote/react";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { Button } from "@/components/editor/ui/button";
import { Input } from "@/components/editor/ui/input";
import { Link, Upload } from "@/components/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** 远程媒体只保存地址，沿用浏览器正常加载。 */
function remoteMediaUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch { return null; }
}

export function EditorFilePanel({ blockId }: { blockId: string }) {
  const editor = useBlockNoteEditor<any, any, any>();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const block = editor.getBlock(blockId);
  const accept = block?.type === "image" ? "image/*"
    : block?.type === "video" ? "video/*" : block?.type === "audio" ? "audio/*" : undefined;
  const close = () => {
    editor.getExtension(FilePanelExtension)?.closeMenu();
    editor.focus();
  };
  const update = (url: string, name: string) => {
    if (!editor.isEditable || editor.getBlock(blockId)?.type !== block?.type) return;
    editor.updateBlock(blockId, { props: { url, name } });
    close();
  };
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor.uploadFile || !editor.isEditable) return;
    setLoading(true);
    setError("");
    try {
      const url = await editor.uploadFile(file, blockId);
      update(typeof url === "string" ? url : url.url, file.name);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "附件上传失败");
    } finally { setLoading(false); }
  };
  const embed = (event: React.FormEvent) => {
    event.preventDefault();
    const url = remoteMediaUrl(urlInput);
    if (!url) { setError("请输入有效的 http 或 https 链接"); return; }
    let name = "";
    try { name = decodeURIComponent(url.pathname.split("/").pop() || ""); } catch { /* 地址仍可用。 */ }
    update(url.href, name || url.hostname);
  };
  if (!block || !editor.isEditable) return null;
  return (
    <div className="goose-editor-context-ui bn-panel w-80 max-w-[calc(100vw-24px)] rounded-lg border bg-popover p-3 text-popover-foreground shadow-md"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); close(); }
      }}>
      <Tabs value={tab} onValueChange={(value) => { setTab(value as "upload" | "url"); setError(""); }}>
      <TabsList className="mb-3" aria-label="媒体来源">
        <TabsTrigger value="upload" disabled={loading}>
          <Upload className="h-4 w-4" /> 上传
        </TabsTrigger>
        <TabsTrigger value="url" disabled={loading}>
          <Link className="h-4 w-4" /> 嵌入链接
        </TabsTrigger>
      </TabsList>
      {tab === "upload" ? (
        <TabsContent value="upload">
          <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={upload} />
          <Button type="button" variant="outline" className="w-full" disabled={loading}
            onClick={() => inputRef.current?.click()}>{loading ? "上传中…" : "选择文件"}</Button>
        </TabsContent>
      ) : (
        <TabsContent value="url"><form onSubmit={embed} className="flex flex-col gap-2">
          <Input autoFocus type="url" value={urlInput} placeholder="https://…" aria-label="媒体链接"
            onChange={(event) => { setUrlInput(event.target.value); setError(""); }} />
          <Button type="submit" disabled={!urlInput.trim()}>嵌入</Button>
        </form></TabsContent>
      )}
      </Tabs>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
