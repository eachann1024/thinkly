// ── Card Decorations ───────────────────────────────────────────
// 主题专属装饰，全部由 CSS / 内联 SVG（data URI）实现，导出与预览共用。
// 背景层类装饰可叠加；伪元素类装饰各占一个槽位，同槽位后者覆盖前者：
//   card::before   washi-tape / bookmark-ribbon / edge-tab / offset-plate / palette-strip / masthead-rule
//   card::after    crosshair-corners / stitched-border / wax-seal
//   container::after  stamp-seal
//   header::after  title-rule / title-ornament / pen-underline

export type DecorationTarget = "container" | "card";

export type BackgroundDecoration =
  /** 纸张颗粒；fibers 为横向纤维（和纸） */
  | { kind: "grain"; target: DecorationTarget; tone: string; opacity: number; fibers?: boolean }
  | { kind: "dot-grid"; target: DecorationTarget; color: string; gap: number }
  | { kind: "line-grid"; target: DecorationTarget; color: string; gap: number }
  | { kind: "scanlines"; target: DecorationTarget; color: string }
  /** 角落网点，由密到疏 */
  | { kind: "halftone-corner"; color: string; size: number }
  /** 卡片下方的贡献格 */
  | { kind: "contribution-graph"; colors: [string, string, string, string, string] }
  | { kind: "palette-dots"; colors: string[] }
  | { kind: "starfield"; color: string }
  | { kind: "coffee-ring"; color: string }
  | { kind: "synth-horizon"; color: string }
  | { kind: "synth-sun"; color: string }
  /** 四角裁切线 */
  | { kind: "trim-marks"; color: string; inset: number }
  | { kind: "hazard-hatch"; color: string };

export type PseudoDecoration =
  | { kind: "washi-tape"; color: string; angle: number }
  | { kind: "bookmark-ribbon"; color: string }
  | { kind: "edge-tab"; color: string; ink: string }
  /** 套印错位的网点色块（右下 L 形） */
  | { kind: "offset-plate"; color: string; tint: string; offset: number }
  | { kind: "palette-strip"; colors: string[] }
  | { kind: "masthead-rule"; color: string }
  | { kind: "crosshair-corners"; color: string }
  | { kind: "stitched-border"; color: string }
  | { kind: "wax-seal"; color: string }
  | { kind: "stamp-seal"; color: string };

export type TypeDecoration =
  /** 标题下分隔；width 省略为通栏 */
  | { kind: "title-rule"; color: string; thickness: number; width?: number; gap: number }
  | { kind: "title-ornament"; color: string }
  | { kind: "pen-underline"; color: string }
  | { kind: "quote-mark"; color: string }
  | { kind: "quote-rule"; color: string; width: number }
  /** 打字机色带晕墨 */
  | { kind: "ink-bleed"; color: string }
  /** 孔版错版：标题双色偏移 */
  | { kind: "misregistration"; color: string }
  /** 凸版压印 */
  | { kind: "letterpress"; highlight: string }
  | { kind: "mono-footer"; color: string; dashed?: boolean };

export type CardDecoration = BackgroundDecoration | PseudoDecoration | TypeDecoration;
