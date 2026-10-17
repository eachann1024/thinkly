import { useId } from "react";
import { COLORS } from "../theme";

/** 点阵底：8px 栅格，模拟纸上 1-bit 网点。 */
export function DotGrid({
  color = COLORS.ink,
  opacity = 0.1,
  pitch = 16,
  radius = 1.4,
}: {
  color?: string;
  opacity?: number;
  pitch?: number;
  radius?: number;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
      <defs>
        <pattern id={id} width={pitch} height={pitch} patternUnits="userSpaceOnUse">
          <circle cx={pitch / 2} cy={pitch / 2} r={radius} fill={color} opacity={opacity} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** 用点阵网点遮罩文字或图形，保持 1-bit 半调质感。 */
export function HalftoneText({
  text,
  width,
  height,
  fontSize,
  pitch = 8,
  radius = 2,
  color = COLORS.ink,
  weight = 700,
  fontFamily,
  opacity = 1,
}: {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  pitch?: number;
  radius?: number;
  color?: string;
  weight?: number;
  fontFamily?: string;
  opacity?: number;
}) {
  const raw = useId().replace(/:/g, "");
  const patternId = `p-${raw}`;
  const maskId = `m-${raw}`;
  return (
    <svg width={width} height={height} style={{ overflow: "visible", opacity }} aria-hidden="true">
      <defs>
        <pattern id={patternId} width={pitch} height={pitch} patternUnits="userSpaceOnUse">
          <circle cx={pitch / 2} cy={pitch / 2} r={radius} fill={color} />
        </pattern>
        <mask id={maskId}>
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontFamily={fontFamily}
            fontWeight={weight}
            fontSize={fontSize}
            letterSpacing="-0.03em"
          >
            {text}
          </text>
        </mask>
      </defs>
      <rect width={width} height={height} fill={`url(#${patternId})`} mask={`url(#${maskId})`} />
    </svg>
  );
}
