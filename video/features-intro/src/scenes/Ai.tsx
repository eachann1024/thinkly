import { useCurrentFrame } from "remotion";
import { C, SCENES, lerp, pop, ramp, sceneFill, track, typed } from "../theme";
import { AI_W, AiHeader, Composer, Mention, UserBubble } from "../ui/AiPanel";
import { BODY, H2, Page, Para, Todo } from "../ui/Doc";
import { Icon, Pointer } from "../ui/Icons";
import { Keys } from "../ui/Keys";
import { FileTree } from "../ui/Sidebar";
import { Fill, Skel } from "../ui/Skeleton";
import { Caption, Placed } from "../ui/Stage";
import { Window } from "../ui/Window";
import { DOC, DocHead } from "./content";

const LEN = SCENES.ai.len;
const ASK = "整理成行动清单";
const STEPS = ["今天先把项目笔记整理完", "把待探索的问题写成提纲", "周五前约设计一起过一遍"];

const POINTER = [
  [150, 1060, 470],
  [192, 1134, 614],
  [300, 1134, 614],
  [350, 920, 357],
  [420, 920, 357],
  [448, 760, 470],
] as Parameters<typeof track>[1];

function Answer({ f }: { f: number }) {
  const appear = pop(f, 222, 18);
  const done = f >= 262;
  const head = ramp(f, 262, 282);
  const button = pop(f, 352, 18);
  const press = f >= 392 && f < 398;
  return (
    <div
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        top: 116,
        padding: 14,
        borderRadius: 12,
        background: C.paper,
        boxShadow: "0 0 0 1px rgba(31,30,29,0.06), 0 4px 14px rgba(31,30,29,0.06)",
        opacity: appear,
        transform: `translateY(${(1 - appear) * 20}px)`,
      }}
    >
      <div style={{ height: 18, fontSize: 12, color: C.text3 }}>{done ? "处理完成" : "正在处理"}</div>
      <Fill t={head} width="70%" style={{ marginTop: 4 }}>
        <div style={{ height: 24, fontSize: 16, lineHeight: "24px", fontWeight: 600 }}>已整理《{DOC.title}》</div>
      </Fill>
      <div style={{ height: 20, marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.text2 }}>
        <Icon name="chevronRight" size={12} color={C.text3} />1 步 · 读取笔记
      </div>
      <div style={{ marginTop: 8 }}>
        {STEPS.map((step, i) => {
          const start = 286 + i * 24;
          const text = typed(step, f, start, 26);
          return (
            <div key={step} style={{ height: 26, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              {f < start ? (
                <Skel w={`${86 - i * 12}%`} h={10} />
              ) : (
                <>
                  <span style={{ width: 16, color: C.text3 }}>{i + 1}.</span>
                  <span>{text}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ height: 30, marginTop: 10 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 30,
            padding: "0 12px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 460,
            background: press ? C.selected : C.hover,
            boxShadow: `inset 0 0 0 1px ${press ? C.accent : "transparent"}`,
            opacity: button,
            transform: `scale(${0.94 + button * 0.06})`,
          }}
        >
          <Icon name="plus" size={14} color={C.text} />
          插入到笔记
        </div>
      </div>
    </div>
  );
}

export function Ai() {
  const f = useCurrentFrame();
  const open = ramp(f, 52, 84) * (1 - ramp(f, 414, 444));
  const fill = sceneFill(f, LEN) * (1 - ramp(f, 46, 56) * (1 - ramp(f, 84, 104)));
  const p = track(f, POINTER);
  const sent = f >= 204;
  const askText = typed(ASK, f, 122, 12);
  const inserted = f >= 404;
  const flash = ramp(f, 404, 414) * (1 - ramp(f, 424, 446));

  const main = (
    <Page>
      <DocHead t={fill} />
      {DOC.todos.map((todo, i) => (
        <Todo key={todo} t={fill} on={i < 2 ? 1 : 0}>
          {[DOC.todos[0], DOC.todos[2], DOC.todos[1]][i]}
        </Todo>
      ))}
      <H2 t={fill}>{DOC.h2b}</H2>
      {inserted ? (
        <div
          style={{
            margin: "0 -8px 6px",
            padding: "0 8px",
            borderRadius: 8,
            background: `rgba(84,125,208,${0.08 * flash})`,
            boxShadow: `inset 0 0 0 1px rgba(84,125,208,${flash})`,
          }}
        >
          {STEPS.map((step, i) => (
            <div key={step} style={{ fontSize: BODY.size, lineHeight: `${BODY.line + 4}px`, opacity: ramp(f, 404 + i * 4, 416 + i * 4) * fill }}>
              <span style={{ color: C.text3, marginRight: 8 }}>{i + 1}.</span>
              {step}
            </div>
          ))}
        </div>
      ) : null}
      <Para t={fill} lines={3} style={{ color: C.text2 }}>
        {DOC.para}
      </Para>
    </Page>
  );

  const right = (
    <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: AI_W }}>
      <AiHeader title={sent ? "整理行动清单" : "新对话"} />
      <div style={{ position: "absolute", left: 16, right: 16, top: 68 }}>
        {sent ? (
          <UserBubble appear={pop(f, 204, 18)}>
            <Mention name="把灵感写成下一步" />
            {ASK}
          </UserBubble>
        ) : null}
      </div>
      {f >= 222 ? (
        <Answer f={f} />
      ) : null}
      <Composer caret={!sent && f >= 112} ready={!sent && askText.length > 0} press={f >= 198 && f < 204}>
        {!sent && f >= 112 ? (
          <>
            <Mention name="把灵感写成下一步" />
            {askText}
          </>
        ) : null}
      </Composer>
    </div>
  );

  const overlay = (
    <>
      <Keys keys={["⌘", "J"]} f={f} at={30} hold={40} />
      {f >= 150 && f < 440 ? <Pointer x={p.x} y={p.y} down={(f >= 198 && f < 204) || (f >= 392 && f < 398)} /> : null}
    </>
  );

  return (
    <>
      <Caption num="02" title="AI 对话" line="选中笔记直接问，回答一键插回正文" len={LEN} />
      <Placed>
        <Window
          tabs={[{ name: DOC.title, active: true }]}
          sidebar={<FileTree />}
          main={main}
          right={right}
          rightWidth={lerp(0, AI_W, open)}
          overlay={overlay}
        />
      </Placed>
    </>
  );
}
