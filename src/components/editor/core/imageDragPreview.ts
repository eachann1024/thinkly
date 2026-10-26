import { imageDragWidth } from "./imageDragWidths";

export function preserveImageDragPreviewWidths(source: HTMLElement, preview: HTMLElement): boolean {
  let resized = false;
  for (const image of preview.querySelectorAll<HTMLElement>('[data-content-type="image"]')) {
    const id = image.closest('[data-node-type="blockContainer"]')?.getAttribute("data-id");
    if (!id) continue;
    const wrapper = image.querySelector<HTMLElement>(".bn-file-block-content-wrapper");
    const width = imageDragWidth(source, id);
    if (!wrapper || !width) continue;
    wrapper.style.width = `${width}px`;
    wrapper.style.maxWidth = "none";
    resized = true;
  }
  return resized;
}
