import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { C, SCENES, lerp, ramp, sceneFill, track } from "../theme";
import { H2, Page, Para, Todo, Title } from "../ui/Doc";
import { Icon, Pointer } from "../ui/Icons";
import { FileTree, withSelected } from "../ui/Sidebar";
import { Caption, Placed } from "../ui/Stage";
import { Window } from "../ui/Window";
import { DOC, DocHead } from "./content";

const LEN = SCENES.split.len;
const MAIN_W = 872;
const GAP = 8;
const MEETING = "会议纪要 10·18";

const POINTER = [
  [30, 760, 480],
  [80, 190, 199],
  [104, 190, 199],
  [160, 940, 340],
  [176, 940, 340],
  [210, 900, 420],
  [280, 520, 430],
  [312, 520, 430],
  [336, 740, 360],
  [350, 740, 360],
  [384, 676, 360],
  [420, 676, 360],
  [448, 760, 470],
] as Parameters<typeof track>[1];

function PaneHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        height: 32,
        padding: "0 6px 0 10px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderBottom: `1px solid ${C.line}`,
      }}
    >
      <span style={{ flex: 1, fontSize: 13, color: C.text2, whiteSpace: "nowrap", overflow: "hidden" }}>{title}</span>
      <Icon name="grip" size={14} color={C.text3} stroke={2.4} />
      <Icon name="x" size={14} color={C.text3} />
    </div>
  );
}

function Pane({
  left,
  width,
  focus,
  title,
  children,
}: {
  left: number;
  width: number;
  focus: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: 0,
        bottom: 0,
        width,
        borderRadius: 10,
        overflow: "hidden",
        background: C.paper,
      }}
    >
      {title ? <PaneHeader title={title} /> : null}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: title ? 33 : 0 }}>{children}</div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 10,
          boxShadow: focus ? `inset 0 0 0 1px ${C.accent}` : "none",
        }}
      />
    </div>
  );
}

function Meeting({ t }: { t: number }) {
  const k = (i: number) => Math.min(1, Math.max(0, (t - i * 0.06) / 0.58));
  return (
    <Page top={28}>
      <Title t={k(0)}>{MEETING}</Title>
      <H2 t={k(1)} style={{ marginTop: 0 }}>
        结论
      </H2>
      {["首页先上速记入口", "分享图默认用极简白", "下周三前完成走查"].map((line, i) => (
        <Para key={line} t={k(i + 2)} lines={1} style={{ marginBottom: 2 }}>
          <span style={{ color: C.text3, marginRight: 8 }}>•</span>
          {line}
        </Para>
      ))}
      <H2 t={k(5)}>待办</H2>
      <Todo t={k(6)}>整理走查问题</Todo>
      <Todo t={k(7)}>同步给设计</Todo>
    </Page>
  );
}

export function Split() {
  const f = useCurrentFrame();
  const fill = sceneFill(f, LEN);
  const p = track(f, POINTER);
  const dragging = f >= 104 && f < 176;
  const overRight = dragging && p.x > 304 + MAIN_W / 2;
  const split = ramp(f, 176, 206);
  const resize = f >= 350 ? p.x - 740 : 0;
  const leftW = lerp(MAIN_W, (MAIN_W - GAP) / 2, split) + resize;
  const focusLeft = f >= 312;
  const meetingT = ramp(f, 196, 250) * fill;

  const main = (
    <div style={{ position: "absolute", inset: 0, background: split > 0 ? C.shell : C.paper }}>
      <Pane left={0} width={leftW} focus={split >= 1 && focusLeft} title={split > 0 ? DOC.title : undefined}>
        <Page top={split > 0 ? 28 : 40}>
          <DocHead t={fill} />
          {DOC.todos.map((todo, i) => (
            <Todo key={todo} t={fill} on={i === 0 ? 1 : 0}>
              {todo}
            </Todo>
          ))}
          <H2 t={fill}>{DOC.h2b}</H2>
          <Para t={fill} lines={3} style={{ color: C.text2 }}>
            {DOC.para}
          </Para>
        </Page>
      </Pane>
      {split > 0 ? (
        <Pane left={leftW + GAP} width={MAIN_W - leftW - GAP} focus={split >= 1 && !focusLeft} title={MEETING}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: (MAIN_W - GAP) / 2 - resize }}>
            <Meeting t={meetingT} />
          </div>
        </Pane>
      ) : null}
      {split >= 1 && f >= 330 ? (
        <div
          style={{
            position: "absolute",
            left: leftW + GAP / 2 - 1,
            top: 120,
            height: 120,
            width: 2,
            borderRadius: 1,
            background: `rgba(94,93,89,${0.35 * ramp(f, 330, 342) * (1 - ramp(f, 400, 420))})`,
          }}
        />
      ) : null}
      {overRight ? (
        <div
          style={{
            position: "absolute",
            left: MAIN_W / 2 + GAP / 2,
            right: 6,
            top: 6,
            bottom: 6,
            display: "grid",
            placeItems: "center",
            borderRadius: 9,
            border: `2px solid ${C.accent}`,
            background: "rgba(84,125,208,0.19)",
          }}
        >
          <span
            style={{
              padding: "6px 11px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 460,
              color: C.accent,
              background: "rgba(255,255,255,0.94)",
              border: "1px solid rgba(84,125,208,0.42)",
              boxShadow: "0 3px 12px rgba(31,30,29,0.06)",
            }}
          >
            在右侧分屏
          </span>
        </div>
      ) : null}
    </div>
  );

  const overlay = (
    <>
      {dragging ? (
        <div
          style={{
            position: "absolute",
            left: p.x + 14,
            top: p.y + 10,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 9,
            borderRadius: 9,
            fontSize: 13,
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(84,125,208,0.55)",
            boxShadow: "0 6px 16px rgba(31,30,29,0.12)",
            zIndex: 60,
          }}
        >
          <Icon name="file" size={14} color={C.text2} />
          {MEETING}
        </div>
      ) : null}
      {f >= 30 ? <Pointer x={p.x} y={p.y} down={dragging || (f >= 312 && f < 318) || (f >= 350 && f < 384)} /> : null}
    </>
  );

  const tabs = [{ name: split >= 1 && !focusLeft ? MEETING : DOC.title, active: true }];

  return (
    <>
      <Caption num="04" title="分屏" line="把另一篇拖进来，左右对照着写" len={LEN} />
      <Placed>
        <Window
          tabs={tabs}
          sidebar={<FileTree rows={withSelected(split >= 1 && !focusLeft ? MEETING : DOC.title)} />}
          main={main}
          overlay={overlay}
        />
      </Placed>
    </>
  );
}

