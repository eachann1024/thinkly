import { errorMessage } from "./webTransport";

type DesktopWeb = NonNullable<Window["gooseDesktop"]>["web"];

function desktopWeb(): DesktopWeb | null {
  return typeof window !== "undefined" ? window.gooseDesktop?.web ?? null : null;
}

export async function builtinSearch(query: string, maxResults: number) {
  const web = desktopWeb();
  if (!web) return { error: "联网服务暂不可用" };
  try {
    const { engine, results } = await web.search(query, maxResults);
    return { source: engine, query, results, untrustedExternalContent: true };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function builtinRead(url: string) {
  const web = desktopWeb();
  if (!web) return { error: "联网服务暂不可用" };
  try {
    const page = await web.read(url);
    return { source: "web", url: page.url, title: page.title, content: page.content, untrustedExternalContent: true };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function fetchPublicJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const web = desktopWeb();
  if (web) return web.json(url);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`请求失败（HTTP ${response.status}）`);
  return response.json();
}
