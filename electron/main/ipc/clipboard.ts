import { t } from "../i18n/nativeServices";
import { ClipboardItem, clipboard, ipcMain, nativeImage } from "electron";
import { printHtmlToPdf } from "../printPdf";
import { isNetFetchAllowed } from "./common";

function pngItem(dataUrl: string, extras?: { html?: string; text?: string }): Electron.ClipboardItem {
  const match = /^data:image\/[^;]+;base64,(.+)$/i.exec(String(dataUrl ?? "").trim());
  const bytes = match ? Buffer.from(match[1], "base64") : Buffer.alloc(0);
  if (!bytes.length) throw new Error(t("invalidPng"));
  const image = nativeImage.createFromBuffer(bytes);
  if (image.isEmpty()) throw new Error(t("invalidPng"));
  const pngBytes = bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
    ? bytes
    : image.toPNG();
  const payload: Record<string, Blob | string> = {
    "image/png": new Blob([new Uint8Array(pngBytes)], { type: "image/png" }),
  };
  if (typeof extras?.html === "string" && extras.html) payload["text/html"] = extras.html;
  if (typeof extras?.text === "string" && extras.text) payload["text/plain"] = extras.text;
  return new ClipboardItem(payload);
}

async function readPngDataUrl(): Promise<string | null> {
  const items = await clipboard.read();
  for (const item of items) {
    if (!item.types.includes("image/png")) continue;
    const blob = await item.getType("image/png");
    if (!(blob instanceof Blob) || blob.size === 0) continue;
    const encoded = Buffer.from(await blob.arrayBuffer()).toString("base64");
    return encoded ? `data:image/png;base64,${encoded}` : null;
  }
  return null;
}

export function registerClipboardIpc(): void {
  ipcMain.handle("desktop:writeText", async (_event, text: string) => {
    await clipboard.writeText(text ?? "");
  });

  ipcMain.handle("desktop:writeImage", async (_event, dataUrl: string, extras?: { html?: string; text?: string }) => {
    await clipboard.write([pngItem(dataUrl, extras)]);
  });

  ipcMain.handle("desktop:readText", async () => clipboard.readText());

  ipcMain.handle("desktop:readImage", async () => readPngDataUrl());

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
