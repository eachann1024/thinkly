import { createChecker } from "./lib/check";
import {
  MAX_LOCAL_ASSET_BYTES,
  MAX_LOCAL_ASSET_BATCH_BYTES,
  canAcceptLocalAssetBytes,
  getLocalAssetKindForFile,
} from "@/lib/local-file-asset-contract";
import {
  getSidebarFileDragState,
  isExternalFileTransfer,
  readExternalDroppedFiles,
} from "@/lib/external-file-drop";
import { isSupportedTextImportFile } from "@/lib/local-folder-import";
import {
  createVideoPlaybackRateController,
  VIDEO_HOLD_DELAY_MS,
} from "@/components/editor/blocks/video/videoPlaybackRate";

const checker = createChecker();
const file = (name: string, type = "") => ({ name, type }) as File;

checker.check("asset byte limits include exact edges and reject invalid sizes", [
  canAcceptLocalAssetBytes(1),
  canAcceptLocalAssetBytes(MAX_LOCAL_ASSET_BYTES),
  !canAcceptLocalAssetBytes(MAX_LOCAL_ASSET_BYTES + 1),
  canAcceptLocalAssetBytes(1, MAX_LOCAL_ASSET_BATCH_BYTES - 1),
  !canAcceptLocalAssetBytes(1, MAX_LOCAL_ASSET_BATCH_BYTES),
  !canAcceptLocalAssetBytes(0),
  !canAcceptLocalAssetBytes(Number.NaN),
  !canAcceptLocalAssetBytes(Number.POSITIVE_INFINITY),
  !canAcceptLocalAssetBytes(1, -1),
].every(Boolean));

checker.check("preview classification is conservative for mismatched and active formats", [
  getLocalAssetKindForFile(file("photo.png", "image/png")) === "image",
  getLocalAssetKindForFile(file("voice.ogg", "application/ogg")) === "audio",
  getLocalAssetKindForFile(file("clip.mp4", "video/mp4")) === "video",
  getLocalAssetKindForFile(file("photo.png", "text/html")) === "file",
  getLocalAssetKindForFile(file("vector.svg", "image/svg+xml")) === "file",
  getLocalAssetKindForFile(file("unknown.bin", "application/octet-stream")) === "file",
].every(Boolean));

checker.check("sidebar accepts only Markdown extensions; editor import helper accepts ordinary Files", [
  isSupportedTextImportFile(file("note.md")),
  isSupportedTextImportFile(file("note.markdown")),
  !isSupportedTextImportFile(file("note.mdown")),
  !isSupportedTextImportFile(file("note.txt")),
  !isSupportedTextImportFile(file("photo.png")),
].every(Boolean));

const transfer = (files: File[] = [], items: DataTransferItem[] = [], types = ["Files"]) => ({
  files, items, types,
}) as unknown as DataTransfer;
checker.check("sidebar drag feedback distinguishes visible MD, protected data, and other files", [
  getSidebarFileDragState(transfer([file("a.md")])) === "accepted",
  getSidebarFileDragState(transfer([file("a.markdown")])) === "accepted",
  getSidebarFileDragState(transfer([file("a.txt")])) === "rejected",
  getSidebarFileDragState(transfer([], [{ kind: "file", type: "text/markdown" } as DataTransferItem])) === "accepted",
  getSidebarFileDragState(transfer([], [{ kind: "file", type: "text/plain" } as DataTransferItem])) === "pending",
  getSidebarFileDragState(transfer([], [{ kind: "file", type: "application/pdf" } as DataTransferItem])) === "rejected",
].every(Boolean));

const internal = transfer([], [], ["Files", "application/x-goose-page"]);
const external = transfer([], [], ["Files"]);
checker.check("native external file drags are handled without consuming app page drags", [
  isExternalFileTransfer(external),
  !isExternalFileTransfer(internal),
].every(Boolean));

let reads = 0;
const dropped = readExternalDroppedFiles(transfer([], [
  { kind: "file", getAsFile: () => file("first.md"), webkitGetAsEntry: () => ({ isDirectory: false }) },
  { kind: "file", getAsFile: () => file("folder"), webkitGetAsEntry: () => ({ isDirectory: true }) },
  { kind: "file", getAsFile: () => { reads++; return null; }, webkitGetAsEntry: () => null },
] as unknown as DataTransferItem[]));
checker.check("drop snapshot preserves file order and counts directories/unreadable entries", [
  dropped.files.length === 1,
  dropped.files[0]?.name === "first.md",
  dropped.skippedCount === 2,
  reads === 1,
].every(Boolean));

let now = 0;
let nextId = 1;
const timers = new Map<number, { at: number; callback: () => void }>();
const scheduler = {
  schedule(callback: () => void, delay: number) {
    const id = nextId++;
    timers.set(id, { at: now + delay, callback });
    return id;
  },
  cancel(id: number) { timers.delete(id); },
};
const advance = (ms: number) => {
  now += ms;
  for (const [id, timer] of [...timers]) {
    if (timer.at <= now) { timers.delete(id); timer.callback(); }
  }
};
const media = { playbackRate: 1 };
const states: Array<{ selectedRate: number; boosting: boolean }> = [];
const rate = createVideoPlaybackRateController(media, state => states.push(state), scheduler);
rate.selectRate(1.5);
rate.beginHold();
advance(VIDEO_HOLD_DELAY_MS - 1);
rate.endHold();
checker.check("short right-button press cancels boost and preserves the selected speed", [
  media.playbackRate === 1.5,
  !rate.getState().boosting,
].every(Boolean));
rate.beginHold();
advance(VIDEO_HOLD_DELAY_MS);
checker.check("long press temporarily selects 3× without changing the stored speed", [
  media.playbackRate === 3,
  rate.getState().boosting,
  rate.getState().selectedRate === 1.5,
].every(Boolean));
rate.endHold();
checker.check("release restores selected speed; invalid selections are ignored", [
  media.playbackRate === 1.5,
  !rate.getState().boosting,
].every(Boolean));
rate.selectRate(9);
checker.check("unsupported speed cannot overwrite the previous selection", [
  rate.getState().selectedRate === 1.5,
  states.length > 0,
].every(Boolean));

export default async function run() {
  return checker.failed;
}
