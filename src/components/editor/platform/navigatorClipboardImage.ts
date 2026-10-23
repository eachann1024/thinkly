/** 页面剪贴板里的图片。系统位图读不到时的后备，失败就当没有图片。 */
export async function readNavigatorClipboardImage(): Promise<string | null> {
  const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
  if (!clipboard?.read) return null;
  try {
    for (const item of await clipboard.read()) {
      const type = item.types.find((entry) => entry.startsWith("image/"));
      if (!type) continue;
      const blob = await item.getType(type);
      if (!blob.size) continue;
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    return null;
  }
  return null;
}
