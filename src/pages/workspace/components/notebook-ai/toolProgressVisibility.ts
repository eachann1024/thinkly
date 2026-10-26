import { CARD_TOOL_NAMES } from "@/lib/notebook-ai/cards/types";
import { getSkillProgressId } from "./toolProgressValues";

export type ToolDisplayPart = {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  toolCallId?: string;
};

const CARD_TOOL_PARTS = new Set<string>(CARD_TOOL_NAMES.map((name) => `tool-${name}`));

export function isVisualArtifactPart(part: ToolDisplayPart) {
  return (
    CARD_TOOL_PARTS.has(part.type) ||
    part.type === "tool-showChart" ||
    part.type === "tool-showDiagram" ||
    part.type === "tool-showSvg"
  );
}

function isCanvasArtifactPart(part: ToolDisplayPart) {
  return part.type === "tool-showSvg";
}

export function isDefaultChatSkillPart(part: ToolDisplayPart) {
  if (part.type !== "tool-loadSkill") return false;
  if (part.state === "output-error" || part.errorText) return false;
  return getSkillProgressId(part) === "chat";
}

export function isHiddenSkillPart(part: ToolDisplayPart) {
  if (part.type !== "tool-loadSkill") return false;
  if (part.state === "output-error" || part.errorText) return false;
  return isDefaultChatSkillPart(part) || !getSkillProgressId(part);
}

export function shouldShowToolProgress(
  parts: ToolDisplayPart[],
  isMessageStreaming: boolean,
) {
  for (const part of parts) {
    if (isHiddenSkillPart(part)) continue;
    if (isMessageStreaming) {
      if (!isCanvasArtifactPart(part)) return true;
    } else if (part.state === "output-error" || part.errorText || !isVisualArtifactPart(part)) {
      return true;
    }
  }
  return false;
}
