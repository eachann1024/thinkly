import { useCurrentFrame } from "remotion";
import { C, ramp, sceneFill, track, typed, pop, SCENES } from "../theme";
import { BODY, Caret, H2, Page, Para, SideMenu, Todo } from "../ui/Doc";
import { Pointer } from "../ui/Icons";
import { Menu, MENU_GAP, MENU_INSET, MENU_ROW, type MenuItem } from "../ui/Menu";
import { FileTree } from "../ui/Sidebar";
import { Fill } from "../ui/Skeleton";
import { Caption, Placed } from "../ui/Stage";
import { Window } from "../ui/Window";
import { DOC, DocHead } from "./content";

const LEN = SCENES.blocks.len;
const ROW = BODY.line + 6;
const LIST_TOP = 84 + 174;
const LINE_Y = LIST_TOP + 3 * ROW + 62;
const MENU_TOP = LINE_Y + 32;

const SLASH: MenuItem[] = [
  { icon: "text", label: "正文" },
  { icon: "heading", label: "标题" },
  { icon: "todo", label: "待办清单" },
  { icon: "quote", label: "引用" },
  { icon: "columns", label: "分栏" },
];

const POINTER = [
  [0, 760, 640],
  [30, 760, 640],
  [70, 560, LIST_TOP + 2 * ROW + 16],
  [82, 560, LIST_TOP + 2 * ROW + 16],
  [96, 355, LIST_TOP + 2 * ROW + 16],
  [104, 355, LIST_TOP + 2 * ROW + 16],
  [150, 355, LIST_TOP + ROW + 16],
  [178, 355, LIST_TOP + ROW + 16],
  [206, 389, LIST_TOP + ROW + 16],
  [236, 389, LIST_TOP + ROW + 16],
  [266, 520, LINE_Y + 13],
  [300, 520, LINE_Y + 13],
  [348, 450, MENU_TOP + MENU_INSET + 4 * (MENU_ROW + MENU_GAP) + 16],
  [380, 450, MENU_TOP + MENU_INSET + 4 * (MENU_ROW + MENU_GAP) + 16],
  [420, 700, 600],
] as Parameters<typeof track>[1];

function Columns({ f, fill }: { f: number; fill: number }) {
  const col = (head: string, lines: string[], delay: number) => {
    const t = ramp(f, 372 + delay, 404 + delay) * fill;
    return (
      <div style={{ flex: 1 }}>
        <Fill t={t} width="30%">
          <div style={{ fontSize: BODY.size, lineHeight: `${BODY.line}px`, fontWeight: 600 }}>{head}</div>
        </Fill>
        {lines.map((line, i) => (
          <Fill key={line} t={ramp(f, 380 + delay + i * 6, 412 + delay + i * 6) * fill} width="80%">
            <div style={{ fontSize: BODY.size, lineHeight: `${BODY.line}px`, color: C.text2 }}>· {line}</div>
          </Fill>
        ))}
      </div>
    );
  };
  const flash = ramp(f, 362, 372) * (1 - ramp(f, 400, 440));
  return (
    <div
      style={{
        display: "flex",
        gap: 28,
        margin: "0 -8px",
        padding: "2px 8px",
        borderRadius: 8,
        boxShadow: `inset 0 0 0 1px rgba(84,125,208,${flash * 0.9})`,
        background: `rgba(84,125,208,${flash * 0.05})`,
      }}
    >
      {col("想法", ["路上听到的一句话", "书里折角的那一页"], 0)}
      {col("下一步", ["周五前写成提纲", "约设计一起过一遍"], 10)}
    </div>
  );
}

export function Blocks() {
  const f = useCurrentFrame();
  const fill = sceneFill(f, LEN, -40, 1);
  const p = track(f, POINTER);
  const down = (f >= 100 && f < 160) || (f >= 210 && f < 216) || (f >= 268 && f < 274) || (f >= 384 && f < 390);

  // 拖动：第三条往上挪一格，第二条随之下移。
  const dragging = f >= 100 && f < 160;
  const dy = f < 100 ? 0 : f < 160 ? p.y - (LIST_TOP + 2 * ROW + 16) : -ROW;
  const draggedTop = 2 * ROW + dy;
  const shiftB = ROW * Math.min(1, Math.max(0, (1.85 * ROW - draggedTop) / (0.5 * ROW)));
  const hover = f >= 70 && f < 160;
  const menuOpacity = ramp(f, 72, 80) * (1 - ramp(f, 160, 168));
  const checked = ramp(f, 212, 222);

  const typing = f >= 274;
  const slash = typed("/", f, 292, 30);
  const menuOn = f >= 296 && f < 388;
  const menuAppear = pop(f, 296, 18);
  const hoverItem = Math.max(0, Math.min(SLASH.length - 1, Math.floor((p.y - MENU_TOP - MENU_INSET) / (MENU_ROW + MENU_GAP))));
  const columns = f >= 388;

  const todos = [
    { text: DOC.todos[0], top: 0, on: 1 },
    { text: DOC.todos[1], top: ROW + shiftB, on: 0 },
    { text: DOC.todos[2], top: draggedTop, on: checked, lifted: dragging, menu: true },
  ];

  const main = (
    <Page>
      <DocHead t={fill} />
      <div style={{ position: "relative", height: 3 * ROW }}>
        {dragging && draggedTop < 1.5 * ROW ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: ROW - 1, height: 2, borderRadius: 1, background: C.drop }} />
        ) : null}
        {todos.map((todo) => (
          <div
            key={todo.text}
            style={{
              position: "absolute",
              left: -8,
              right: -8,
              top: todo.top,
              padding: "0 8px",
              borderRadius: 6,
              background: todo.menu && hover ? (todo.lifted ? C.paper : "#f6f6f5") : "transparent",
              boxShadow: todo.lifted ? "0 6px 18px rgba(31,30,29,0.12), 0 0 0 1px rgba(31,30,29,0.06)" : "none",
              zIndex: todo.lifted ? 5 : 1,
            }}
          >
            {todo.menu ? <SideMenu opacity={menuOpacity} grab={f >= 96 && f < 160} /> : null}
            <Todo t={fill} on={todo.on}>
              {todo.text}
            </Todo>
          </div>
        ))}
      </div>
      <H2 t={fill}>{DOC.h2b}</H2>
      {columns ? (
        <Columns f={f} fill={fill} />
      ) : (
        <div style={{ height: BODY.line, fontSize: BODY.size, lineHeight: `${BODY.line}px`, opacity: fill }}>
          {typing ? (
            <>
              {slash}
              <Caret height={20} />
            </>
          ) : null}
        </div>
      )}
      <Para t={fill} style={{ marginTop: 8, color: C.text2 }}>
        {DOC.para}
      </Para>
    </Page>
  );

  const overlay = (
    <>
      {menuOn ? <Menu items={SLASH} active={f < 330 ? 0 : hoverItem} appear={menuAppear} style={{ left: 380, top: MENU_TOP }} /> : null}
      {f >= 30 ? <Pointer x={p.x} y={p.y} down={down} /> : null}
    </>
  );

  return (
    <>
      <Caption num="01" title="块编辑" line="拖一拖、勾一勾、敲个斜杠，结构随手就成" len={LEN} />
      <Placed>
        <Window tabs={[{ name: DOC.title, active: true }]} sidebar={<FileTree />} main={main} overlay={overlay} />
      </Placed>
    </>
  );
}
