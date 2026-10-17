import { createTranslator, i18nYaml } from "@/i18n/core";

const localMessages = i18nYaml<"src/lib/videoStorage.ts#localMessages:1">`
zh-Hans:
  openALocalFolderNotebookBeforeInsertingAVideo: "请先打开本地文件夹笔记本，再插入视频"
  localFileServicesArenTReadyTheVideoCouldn: "本地文件服务未就绪，无法保存视频"
  couldnTCreateTheVideoFolder: "视频资源目录创建失败"
  couldnTSaveTheCompressedVideo: "压缩后的视频保存失败"
en:
  openALocalFolderNotebookBeforeInsertingAVideo: "Open a local folder notebook before inserting a video"
  localFileServicesArenTReadyTheVideoCouldn: "Local file services aren’t ready. The video couldn’t be saved."
  couldnTCreateTheVideoFolder: "Couldn’t create the video folder"
  couldnTSaveTheCompressedVideo: "Couldn’t save the compressed video"
`;
const uiText = createTranslator(localMessages);
import { HostAdapter } from "@/lib/host/adapter";
import { fs } from "@/lib/electron-platform/fs";
import {
  currentLocalPagePath,
  pageDirectory,
} from "@/lib/currentLocalPagePath";
import { base64ToBlob, blobToBase64 } from "@/lib/imageStorage/utils";
import { resolveToAbsolute } from "@/lib/imageStorage/strategies/file-system";
import {
  transcodeVideo,
  VIDEO_OUTPUT_MIME,
  type VideoTranscodeProgress,
} from "@/lib/videoProcessor";

const VIDEO_ATTACHMENT_PREFIX = "att-video:";
const VIDEO_MIME_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  webm: "video/webm",
};

function videoMimeType(path: string): string {
  const extension = path.split(/[?#]/, 1)[0].split(".").pop()?.toLowerCase();
  return VIDEO_MIME_TYPES[extension || ""] || "application/octet-stream";
}

function attachmentId(ref: string): string {
  return ref.replace(VIDEO_ATTACHMENT_PREFIX, "");
}

export const videoStorage = {
  async save(
    file: File,
    onProgress?: (progress: VideoTranscodeProgress) => void,
  ): Promise<string> {
    const video = await transcodeVideo(file, onProgress);
    const localPagePath = await currentLocalPagePath();

    // Electron 仅本地文件夹模式：无仓库时禁止视频写入内置 db
    if (!localPagePath) {
      throw new Error(uiText("openALocalFolderNotebookBeforeInsertingAVideo"));
    }

    if (!fs.isAvailable())
      throw new Error(uiText("localFileServicesArenTReadyTheVideoCouldn"));
    const assetsDirectory = `${pageDirectory(localPagePath)}/assets`;
    if (
      !(await fs.existsAsync(assetsDirectory)) &&
      !(await fs.mkdir(assetsDirectory))
    ) {
      throw new Error(uiText("couldnTCreateTheVideoFolder"));
    }
    // 转码产物固定 mp4；无 FFmpeg 宿主透传原文件时保留原扩展名，避免 mislabel。
    const passthroughExt =
      video.type && video.type !== VIDEO_OUTPUT_MIME
        ? file.name.split(".").pop()?.toLowerCase() || "mp4"
        : "mp4";
    const filename = `vid_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${passthroughExt}`;
    const saved = await fs.writeFileAsync(
      `${assetsDirectory}/${filename}`,
      (await blobToBase64(video)).split(",")[1],
      "base64",
    );
    if (!saved) throw new Error(uiText("couldnTSaveTheCompressedVideo"));
    return `./assets/${filename}`;
  },

  async load(
    ref: string,
    pageLocalFilePath?: string | null,
  ): Promise<Blob | null> {
    if (ref.startsWith(VIDEO_ATTACHMENT_PREFIX)) {
      const id = attachmentId(ref);
      const data = await HostAdapter.db.getAttachment(id);
      return data
        ? new Blob([data.slice()], {
            type:
              (await HostAdapter.db.getAttachmentType(id)) || VIDEO_OUTPUT_MIME,
          })
        : null;
    }
    if (!pageLocalFilePath) return null;
    const path = resolveToAbsolute(pageDirectory(pageLocalFilePath), ref);
    const gfs = typeof window !== "undefined" ? window.gooseFs : undefined;
    // 原生壳（Electron）无同步 fs，优先异步二进制桥。
    const base64 = gfs?.readFileBase64Async
      ? await gfs.readFileBase64Async(path)
      : (gfs?.readFileBase64?.(path) ?? null);
    if (!base64) return null;
    if (/^data:[^;,]+;base64,/i.test(base64)) return base64ToBlob(base64);
    const binary = atob(base64);
    const data = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1)
      data[index] = binary.charCodeAt(index);
    return new Blob([data], { type: videoMimeType(path) });
  },

  canHandle(ref: string): boolean {
    return (
      ref.startsWith(VIDEO_ATTACHMENT_PREFIX) ||
      /\.(mp4|m4v|mov|webm)$/i.test(ref)
    );
  },
};
