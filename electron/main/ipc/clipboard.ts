import { t } from "../i18n/nativeServices";
import { clipboard, ipcMain, nativeImage } from "electron";
import { printHtmlToPdf } from "../printPdf";
import { isNetFetchAllowed } from "./common";

export function registerClipboardIpc(): void {
  ipcMain.handle("desktop:writeText", async (_event, t: string) => {
    clipboard.writeText(t ?? "");
  });

  ipcMain.handle("desktop:writeImage", async (_event, dataUrl: string, extras?: { html?: string; text?: string }) => {
    const trimmed = String(dataUrl ?? "").trim();
    const match = /^data:image\/[^;]+;base64,(.+)$/i.exec(trimmed);
    if (!match) {
      throw new Error(t("invalidPng"));
    }
    const pngBuffer = Buffer.from(match[1], "base64");
    if (!pngBuffer.length) {
      throw new Error(t("invalidPng"));
    }
    const image = nativeImage.createFromBuffer(pngBuffer);
    const html = typeof extras?.html === "string" ? extras.html : "";
    const text = typeof extras?.text === "string" ? extras.text : "";
    if (html || text) {
      clipboard.write({ image, ...(html ? { html } : {}), ...(text ? { text } : {}) });
      return;
    }
    if (process.platform === "darwin") {
      clipboard.writeBuffer("public.png", pngBuffer);
      clipboard.writeImage(image);
    } else {
      clipboard.writeImage(image);
    }
  });

  ipcMain.handle("desktop:readText", async () => clipboard.readText());

  ipcMain.handle("desktop:readImage", async () => {
    const toDataUrl = (bytes: Buffer | Uint8Array) =>
      bytes.length ? `data:image/png;base64,${Buffer.from(bytes).toString("base64")}` : null;
    for (const format of ["public.png", "image/png", "PNG"]) {
      try {
        if (!clipboard.has(format)) continue;
        const dataUrl = toDataUrl(clipboard.readBuffer(format));
        if (dataUrl) return dataUrl;
      } catch {
        // 这个格式当前平台不认，继续看下一种。
      }
    }
    const image = clipboard.readImage();
    if (image.isEmpty()) return null;
    return toDataUrl(image.toPNG());
  });

  ipcMain.handle("desktop:printHtmlToPdf", async (_event, html: string) => {
    return printHtmlToPdf(html);
  });

  ipcMain.handle(
    "desktop:netFetch",
    async (
      _event,
      url: string,
      init?: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
      },
    ) => {
      if (!isNetFetchAllowed(url)) {
        throw new Error(t("netFetchOnly"));
      }
      const response = await fetch(url, {
        method: init?.method,
        headers: init?.headers,
        body: init?.body,
      });
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      const body = await response.text();
      return { status: response.status, headers, body };
    },
  );
}
