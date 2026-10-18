import { H2, Lead, Title } from "../ui/Doc";

export const DOC = {
  title: "把灵感写成下一步",
  lead: "从一闪而过的想法，到可以继续的工作。",
  h2: "今天，留一点时间给创作",
  todos: ["收集散落的灵感与参考", "写下值得继续探索的问题", "整理成清晰的项目笔记"],
  h2b: "一份轻量的创作计划",
  para: "先写下来，再慢慢理清。把零散的灵感、资料与日常记录，收进你自己的 Markdown 文件夹。",
};

/** 页面头部：标题、引言、小节标题，按 stagger 依次从骨架填充。 */
export function DocHead({ t, stagger = 0.12 }: { t: number; stagger?: number }) {
  const k = (i: number) => Math.min(1, Math.max(0, (t - i * stagger) / (1 - 2 * stagger)));
  return (
    <>
      <Title t={k(0)}>{DOC.title}</Title>
      <Lead t={k(1)}>{DOC.lead}</Lead>
      <H2 t={k(2)}>{DOC.h2}</H2>
    </>
  );
}

/** 0–1 的总进度按序号错开，供列表依次填充。 */
export function stag(t: number, i: number, n: number, spread = 0.5) {
  const start = (i / Math.max(1, n - 1)) * spread;
  return Math.min(1, Math.max(0, (t - start) / (1 - spread)));
}
