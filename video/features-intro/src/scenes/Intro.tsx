import { useCurrentFrame } from "remotion";
import { C, FONT_UI, HEIGHT, WIDTH, pop, ramp } from "../theme";
import { H2, Page, Para, Todo } from "../ui/Doc";
import { FileTree } from "../ui/Sidebar";
import { Placed } from "../ui/Stage";
import { Window } from "../ui/Window";
import { DOC, DocHead, stag } from "./content";

export function Intro() {
  const f = useCurrentFrame();
  const a = pop(f, 18, 18);
  const b = pop(f, 34, 18);
  const leave = ramp(f, 132, 168);
  const rise = pop(f, 150, 22);
  const side = ramp(f, 190, 250);
  const doc = ramp(f, 200, 292);

  const main = (
    <Page>
      <DocHead t={stag(doc, 0, 6)} />
      <div style={{ height: 96 }}>
        {DOC.todos.map((todo, i) => (
          <Todo key={todo} t={stag(doc, i + 2, 7)} on={i === 0 ? 1 : 0}>
            {todo}
          </Todo>
        ))}
      </div>
      <H2 t={stag(doc, 5, 7)}>{DOC.h2b}</H2>
      <div style={{ height: 26 }} />
      <Para t={stag(doc, 6, 7)} style={{ marginTop: 8, color: C.text2 }}>
        {DOC.para}
      </Para>
    </Page>
  );

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          fontFamily: FONT_UI,
          opacity: 1 - leave,
          transform: `translateY(${-leave * 60}px)`,
        }}
      >
        <div
          style={{
            fontSize: 104,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: C.text,
            opacity: a,
            transform: `translateY(${(1 - a) * 30}px)`,
          }}
        >
          思绪 <span style={{ color: C.text3, fontWeight: 300 }}>·</span> Thinkly
        </div>
        <div style={{ fontSize: 34, color: C.text2, opacity: b, transform: `translateY(${(1 - b) * 24}px)` }}>
          把一闪而过的想法，写成下一步。
        </div>
      </div>
      {f >= 140 ? (
        <Placed y={(1 - rise) * 260} opacity={Math.min(1, rise * 1.4)}>
          <Window tabs={[{ name: DOC.title, active: true }]} sidebar={<FileTree t={side} />} main={main} />
        </Placed>
      ) : null}
    </>
  );
}
