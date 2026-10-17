import type { CaptionDef } from './layers/Caption';
import { CAP } from './timeline';

const topLeft = { left: 115, top: 110 };
const topCenter = { left: 0, right: 0, top: 110 };

/** 字幕文案与位置（全局帧）；均放在各背景板的留白处，避开鹅。 */
export const CAPTIONS: CaptionDef[] = [
  { title: '早上好，这里是思绪 · Thinkly', ...CAP.s1, box: topCenter },
  {
    title: '想到什么，就写下什么',
    subtitle: '本地 Markdown，所写即所存',
    ...CAP.s2,
    box: topLeft,
  },
  { title: '灵感来了，随手速记', ...CAP.s3, box: topCenter },
  { title: '笔记留在你的电脑里', ...CAP.s4, box: topLeft },
  {
    title: '需要时，请 AI 帮你理一理',
    subtitle: '可随时关闭',
    ...CAP.s5,
    box: topLeft,
  },
  { title: '每一本笔记，都井井有条', ...CAP.s6, box: { left: 0, right: 0, bottom: 64 } },
];
