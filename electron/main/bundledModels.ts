import path from "node:path";
import { pathToFileURL } from "node:url";
import { net, protocol } from "electron";

/** 打包后页面走 file://，fetch 不支持该协议；随包的向量模型与 WASM 运行时经此协议提供。 */
export const BUNDLED_MODEL_SCHEME = "goose-model";
const ALLOWED = new Set(["models", "ort"]);

export const bundledModelScheme = {
  scheme: BUNDLED_MODEL_SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
};

export function registerBundledModelProtocol(): void {
  const root = path.join(__dirname, "../renderer");
  protocol.handle(BUNDLED_MODEL_SCHEME, async (request) => {
    const relative = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, "");
    const file = path.normalize(path.join(root, relative));
    if (!ALLOWED.has(relative.split("/")[0]) || !file.startsWith(root + path.sep)) {
      return new Response(null, { status: 404 });
    }
    const response = await net.fetch(pathToFileURL(file).href);
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    if (file.endsWith(".wasm")) headers.set("Content-Type", "application/wasm");
    if (file.endsWith(".mjs")) headers.set("Content-Type", "text/javascript");
    return new Response(response.body, { status: response.status, headers });
  });
}
