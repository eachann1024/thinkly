import { useCurrentFrame } from "remotion";
import { C, SCENES, lerp, pop, ramp, sceneFill, track, typed } from "../theme";
import { Caret, Check, H2, Page, Para, Todo, Title } from "../ui/Doc";
import { Icon, Pointer, type IconName } from "../ui/Icons";
import { Keys } from "../ui/Keys";
import { FILES, FileTree, type Row } from "../ui/Sidebar";
import { Caption, Placed } from "../ui/Stage";
import { Window } from "../ui/Window";
import { DOC, DocHead } from "./content";

const LEN = SCENES.quick.len;
const QN = { x: 640, y: 128, w: 480, h: 350 };
const LINE1 = "发布说明周五前给到设计";
const LINE2 = "和 Lucy 确认排期";
const SAVE = { x: QN.x + QN.w - 8 - 11 - 52, y: QN.y + 15 };

const POINTER = [
  [240, 900, 420],
  [286, SAVE.x, SAVE.y],
  [330, SAVE.x, SAVE.y],
  [380, 760, 470],
] as Parameters<typeof track>[1];

function TitleButton({ icon, on = false }: { icon: IconName; on?: boolean }) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        display: "grid",
        placeItems: "center",
        background: on ? C.selected : "transparent",
      }}
    >
      <Icon name={icon} size={14} color={C.text2} />
    </div>
  );
}

function QuickWindow({ f }: { f: number }) {
  const line1 = typed(LINE1, f, 84, 10);
  const todo = f >= 180;
  const line2 = typed(LINE2, f, 186, 11);
  const press = f >= 296 && f < 302;
  return (
    <div
      style={{
        width: QN.w,
        height: QN.h,
        borderRadius: 12,
        background: C.paper,
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(31,30,29,0.10), 0 24px 60px rgba(31,30,29,0.22), 0 6px 16px rgba(31,30,29,0.08)",
      }}
    >
      <div style={{ height: 30, position: "relative", display: "flex", alignItems: "center", padding: "0 8px" }}>
        <span style={{ fontSize: 12, fontWeight: 460, color: C.text2, paddingLeft: 4 }}>速记 1</span>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                color: n === 1 ? C.text : C.text3,
                background: n === 1 ? C.selected : "transparent",
                boxShadow: n === 1 ? `inset 0 0 0 1px ${C.accent}` : "none",
              }}
            >
              {n}
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4 }}>
          <TitleButton icon="filePlus" on={press} />
          <TitleButton icon="alert" />
          <TitleButton icon="x" />
        </div>
      </div>
      <div style={{ padding: "10px 20px", fontSize: 17, lineHeight: "28px" }}>
        <div>
          {line1}
          {f < 156 ? <Caret height={18} /> : null}
        </div>
        {f >= 160 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, height: 32 }}>
            {todo ? <Check /> : <span>{typed("[] ", f, 164, 20)}</span>}
            <span>
              {line2}
              <Caret height={18} />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function QuickNote() {
  const f = useCurrentFrame();
  const fill = sceneFill(f, LEN);
  const p = track(f, POINTER);
  const show = pop(f, 58, 15);
  const fly = ramp(f, 304, 346);
  const saved = f >= 336;
  const swap = ramp(f, 342, 352);
  const noteIn = ramp(f, 356, 392);

  const rows: Row[] = saved
    ? [
        { ...FILES[0], count: 4 },
        { name: LINE1, depth: 1, selected: true, enter: ramp(f, 336, 352), flash: 1 - ramp(f, 360, 420) },
        ...FILES.slice(1).map((r) => ({ ...r, selected: false })),
      ]
    : FILES;

  const docT = fill * (1 - swap);
  const main =
    f < 352 ? (
      <Page>
        <DocHead t={docT} />
        {DOC.todos.map((todo, i) => (
          <Todo key={todo} t={docT} on={i === 0 ? 1 : 0}>
            {todo}
          </Todo>
        ))}
        <H2 t={docT}>{DOC.h2b}</H2>
        <Para t={docT} style={{ color: C.text2 }}>
          {DOC.para}
        </Para>
      </Page>
    ) : (
      <Page>
        <Title t={noteIn * fill}>{LINE1}</Title>
        <Todo t={ramp(f, 366, 398) * fill}>{LINE2}</Todo>
      </Page>
    );

  const flyX = lerp(QN.x, 90, fly);
  const flyY = lerp(QN.y, 112, fly);
  const flyS = lerp(1, 0.08, fly);

  const overlay = (
    <>
      <Keys keys={["⌥", "N"]} f={f} at={30} hold={36} />
      {f >= 58 && fly < 1 ? (
        <div
          style={{
            position: "absolute",
            left: flyX,
            top: flyY,
            transformOrigin: "0 0",
            transform: `translateY(${(1 - show) * 16}px) scale(${(0.92 + show * 0.08) * flyS})`,
            opacity: Math.min(1, show * 1.5) * (1 - ramp(f, 330, 346)),
            zIndex: 50,
          }}
        >
          <QuickWindow f={f} />
        </div>
      ) : null}
      {f >= 240 && f < 400 ? <Pointer x={p.x} y={p.y} down={f >= 296 && f < 302} /> : null}
    </>
  );

  return (
    <>
      <Caption num="03" title="速记小窗" line="⌥N 随时唤出，记完一点就收进笔记" len={LEN} />
      <Placed>
        <Window
          tabs={[{ name: f < 352 ? DOC.title : LINE1, active: true }]}
          sidebar={<FileTree rows={rows} />}
          main={main}
          overlay={overlay}
        />
      </Placed>
    </>
  );
}
