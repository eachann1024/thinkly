import { toast } from "@/components/ui/sonner";
import { usePages } from "@/stores/usePages";

/** 分屏先打开内存草稿；首次实际编辑保存后才创建源文件的同级文件。 */
export async function createSplitBlankPage(sourcePageId: string): Promise<string | null> {
  const id = usePages.getState().createEditorDraftPage(sourcePageId);
  if (id) return id;
  toast.error("无法创建分屏页面", { description: "来源笔记或所属笔记本已不存在" });
  return null;
}
