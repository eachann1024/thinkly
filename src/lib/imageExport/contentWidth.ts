export const IMAGE_EXPORT_WIDTHS = [720, 1080, 1440] as const;

export const IMAGE_EXPORT_DEFAULT_WIDTH = 1080;

export type ImageExportWidth = (typeof IMAGE_EXPORT_WIDTHS)[number];
