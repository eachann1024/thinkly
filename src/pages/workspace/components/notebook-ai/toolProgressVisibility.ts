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

function isVisualArtifactPart(part: ToolDisplayPart) {
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
  const visibleParts = parts.filter((part) => !isHiddenSkillPart(part));
  if (visibleParts.length === 0) return false;
  if (isMessageStreaming) {
    if (visibleParts.every(isCanvasArtifactPart)) return false;
    return true;
  }
  return visibleParts.some((part) => {
    if (part.state === "output-error" || part.errorText) return true;
    return !isVisualArtifactPart(part);
  });
}
