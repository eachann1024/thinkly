import { create } from "zustand";

export function normalizeNewFileName(value: string): string {
  const name = value.trim().replace(/\.(md|markdown)$/i, "").trim();
  if (!name || name === "." || name === "..") throw new Error("请输入文件名称");
  if (/[\\/:*?"<>|]/.test(name) || Array.from(name).some((char) => char.charCodeAt(0) < 32) || /[. ]$/.test(name)) {
    throw new Error("文件名称包含不支持的字符");
  }
  return name;
}

type NameRequest = {
  workspaceId: string;
  create: (name: string) => Promise<string | null>;
  resolve: (id: string | null) => void;
};

export const useNewPageName = create<{ request: NameRequest | null }>(() => ({ request: null }));

// 重复触发新建时保留正在填写的请求，避免两次落盘和两个调用方重复打开标签。
export function requestNewPageName(
  workspaceId: string,
  createPage: NameRequest["create"],
): Promise<string | null> {
  if (useNewPageName.getState().request) return Promise.resolve(null);
  return new Promise((resolve) => {
    useNewPageName.setState({ request: { workspaceId, create: createPage, resolve } });
  });
}

export function finishNewPageName(request: NameRequest, id: string | null) {
  if (useNewPageName.getState().request !== request) return;
  useNewPageName.setState({ request: null });
  request.resolve(id);
}
