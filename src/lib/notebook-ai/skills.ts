import agentInstructions from "@/agent/AGENTS.md?raw";
import chatSkill from "@/agent/chat/SKILL.md?raw";
import createNooteSkill from "@/agent/createNoote/SKILL.md?raw";
import deleteNoteSkill from "@/agent/deleteNote/SKILL.md?raw";
import searchNotesSkill from "@/agent/searchNotes/SKILL.md?raw";
import updateNoteSkill from "@/agent/updateNote/SKILL.md?raw";
import visualSkill from "@/agent/visual/SKILL.md?raw";
import webResearchSkill from "@/agent/webResearch/SKILL.md?raw";
import liveInfoSkill from "@/agent/liveInfo/SKILL.md?raw";
import type { NotebookSkillId } from "./skillIds";
import { CARD_GUIDE } from "./cardGuide";

export type { NotebookSkillId } from "./skillIds";

export const NOTEBOOK_AGENT_INSTRUCTIONS = agentInstructions.replace("{{CARD_GUIDE}}", CARD_GUIDE).trim();

export const NOTEBOOK_SKILLS = {
  createNoote: {
    description: "在本轮确定的笔记本和目录新建页面",
    content: createNooteSkill.trim(),
    tools: ["listFolder", "readPage", "executeBatchPlan"],
  },
  updateNote: {
    description: "改写、追加、补充或重命名当前页",
    content: updateNoteSkill.trim(),
    tools: ["readPage", "executeBatchPlan"],
  },
  deleteNote: {
    description: "把本轮授权的页面移入垃圾箱",
    content: deleteNoteSkill.trim(),
    tools: [
      "listPages",
      "listFolder",
      "searchNotes",
      "readPage",
      "executeBatchPlan",
    ],
  },
  searchNotes: {
    description: "在本轮来源范围搜索并读取页面",
    content: searchNotesSkill.trim(),
    tools: ["listPages", "listFolder", "searchNotes", "readPage"],
  },
  chat: {
    description: "仅解释或建议，不改笔记",
    content: chatSkill.trim(),
    tools: ["readPage"],
  },
  visual: {
    description: "生成表格、图表、流程图或图片",
    content: visualSkill.trim(),
    tools: ["showTable", "showChart", "showDiagram", "showSvg"],
  },
  webResearch: {
    description: "读取网页、联网搜索并基于来源研究",
    content: webResearchSkill.trim(),
    tools: ["searchWeb", "readWebPage"],
  },
  liveInfo: {
    description: "天气、汇率、世界时间等实时信息卡片",
    content: liveInfoSkill.trim(),
    tools: ["getWeather", "getExchangeRate", "getWorldTime", "searchWeb"],
  },
} as const;

export function getSkillToolNames(skillIds: Iterable<NotebookSkillId>) {
  return [...new Set([...skillIds].flatMap((id) => NOTEBOOK_SKILLS[id].tools))];
}
