import { Img, staticFile, useCurrentFrame } from "remotion";
import { C, FONT_MONO, FONT_UI, HEIGHT, WIDTH, pop, ramp } from "../theme";
import { Page } from "../ui/Doc";
import { FileTree } from "../ui/Sidebar";
import { Placed } from "../ui/Stage";
import { Window } from "../ui/Window";
import { DOC, DocHead } from "./content";

const FEATURES = ["块编辑", "AI 对话", "速记小窗", "分屏", "分享图", "历史"];

export function Outro() {
  const f = useCurrentFrame();
  const away = ramp(f, 0, 40);
  const face = pop(f, 36, 16);
  const word = pop(f, 60, 18);
  const tag = pop(f, 76, 18);
  const list = ramp(f, 96, 126);
  const url = pop(f, 150, 14);
  const blink = (f >= 210 && f < 218) || (f >= 300 && f < 308);

  return (
    <>
      {away < 1 ? (
        <Placed scale={1 - away * 0.08} opacity={1 - away}>
          <Window
            tabs={[{ name: DOC.title, active: true }]}
            sidebar={<FileTree />}
            main={
              <Page>
                <DocHead t={0} />
              </Page>
            }
          />
        </Placed>
      ) : null}
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
          fontFamily: FONT_UI,
        }}
      >
        <Img
          src={staticFile(blink ? "img/a-blink-light.png" : "img/a-main-light.png")}
          style={{
            width: 260,
            height: 260,
            borderRadius: 130,
            background: C.paper,
            boxShadow: `0 0 0 1px ${C.border}`,
            opacity: Math.min(1, face * 1.4),
            transform: `translateY(${(1 - face) * 30}px)`,
          }}
        />
        <div style={{ marginTop: 40, fontSize: 96, fontWeight: 700, letterSpacing: "-0.03em", color: C.text, opacity: word, transform: `translateY(${(1 - word) * 24}px)` }}>
          思绪 <span style={{ color: C.text3, fontWeight: 300 }}>·</span> Thinkly
        </div>
        <div style={{ marginTop: 14, fontSize: 32, color: C.text2, opacity: tag, transform: `translateY(${(1 - tag) * 20}px)` }}>
          把一闪而过的想法，写成下一步。
        </div>
        <div style={{ marginTop: 34, display: "flex", gap: 28, fontFamily: FONT_MONO, fontSize: 20, letterSpacing: "0.08em", color: C.text3 }}>
          {FEATURES.map((name, i) => (
            <span key={name} style={{ opacity: Math.min(1, Math.max(0, list * 6 - i)) }}>
              {String(i + 1).padStart(2, "0")} {name}
            </span>
          ))}
        </div>
        <div
          style={{
            marginTop: 30,
            fontFamily: FONT_MONO,
            fontSize: 24,
            letterSpacing: "0.08em",
            color: C.accent,
            opacity: Math.min(1, url),
            transform: `translateY(${(1 - Math.min(1, url)) * -8}px)`,
          }}
        >
          note.cooool.top
        </div>
      </div>
    </>
  );
}
