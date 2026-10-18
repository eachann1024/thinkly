import { Img, staticFile, useCurrentFrame } from "remotion";
import { C, FONT_MONO, FONT_UI, SCENES, pop, ramp, sceneFill, track } from "../theme";
import { Check, H2, Page, Para, Todo } from "../ui/Doc";
import { Icon, Pointer } from "../ui/Icons";
import { Menu, type MenuItem } from "../ui/Menu";
import { FileTree } from "../ui/Sidebar";
import { Fill } from "../ui/Skeleton";
import { Caption, Placed } from "../ui/Stage";
import { Toast } from "../ui/Toast";
import { Window } from "../ui/Window";
import { DOC, DocHead } from "./content";

const LEN = SCENES.share.len;

type Theme = { name: string; bg: string; card: string; text: string; sub: string; mono?: boolean };
const THEMES: Theme[] = [
  { name: "极简白", bg: "#f4f4f2", card: "#ffffff", text: "#1f1e1d", sub: "#5e5d59" },
  { name: "原研哉·白", bg: "#fefefe", card: "#fefefe", text: "#1f1e1d", sub: "#8a8983" },
  { name: "复古打字机", bg: "#f5f0e6", card: "#faf6ed", text: "#3b3226", sub: "#7a6d5a", mono: true },
  { name: "手账便签", bg: "#fef9e7", card: "#fffef5", text: "#3d3527", sub: "#8b7b5c" },
  { name: "摩卡慕斯", bg: "#f5ede0", card: "#fdf8ee", text: "#4a3a2c", sub: "#8a7360" },
  { name: "GitHub 深", bg: "#0d1117", card: "#161b22", text: "#e6edf3", sub: "#8d96a0" },
];

const PAGE_MENU: MenuItem[] = [
  { icon: "file", label: "在新窗口打开" },
  { icon: "download", label: "导入" },
  { icon: "image", label: "生成图片" },
  { icon: "download", label: "导出" },
  { icon: "history", label: "页面历史" },
];

const DLG = { x: 110, y: 64, w: 960, h: 548 };
const GRID_X = DLG.x + 24 + 560 + 24;
const CARD_W = (DLG.w - 24 - 560 - 24 - 24 - 12) / 2;
const cardPos = (i: number) => ({ x: GRID_X + (i % 2) * (CARD_W + 12) + CARD_W / 2, y: DLG.y + 92 + Math.floor(i / 2) * 116 + 50 });

const PICKS: [number, number][] = [
  [0, 0],
  [236, 4],
  [282, 5],
  [328, 3],
];

const POINTER = [
  [36, 900, 420],
  [70, 1160, 22],
  [82, 1160, 22],
  [104, 990, 44 + 6 + 2 * 34 + 16],
  [120, 990, 134],
  [210, 980, 400],
  [230, cardPos(4).x, cardPos(4).y],
  [276, cardPos(5).x, cardPos(5).y],
  [322, cardPos(3).x, cardPos(3).y],
  [354, DLG.x + DLG.w - 24 - 50, DLG.y + DLG.h - 24 - 16],
  [400, DLG.x + DLG.w - 24 - 50, DLG.y + DLG.h - 24 - 16],
  [448, 780, 470],
] as Parameters<typeof track>[1];

function pick(f: number) {
  let current = 0;
  for (const [at, i] of PICKS) if (f >= at) current = i;
  return current;
}

function ShareCard({ theme, t }: { theme: Theme; t: number }) {
  const font = theme.mono ? FONT_MONO : FONT_UI;
  return (
    <div style={{ width: 340, padding: "26px 28px 18px", borderRadius: 12, background: theme.card, color: theme.text, fontFamily: font, boxShadow: "0 10px 30px rgba(0,0,0,0.10)" }}>
      <Fill t={t} width="70%">
        <div style={{ fontSize: 24, lineHeight: "32px", fontWeight: 700 }}>{DOC.title}</div>
      </Fill>
      <Fill t={t} width="80%" style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, lineHeight: "20px", color: theme.sub }}>{DOC.lead}</div>
      </Fill>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        {DOC.todos.map((todo, i) => (
          <Fill key={todo} t={t} width="66%">
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <div style={{ transform: "scale(0.8)" }}>
                <Check on={i === 0 ? 1 : 0} />
              </div>
              {todo}
            </div>
          </Fill>
        ))}
      </div>
      <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${theme.sub}33`, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: theme.sub, fontFamily: FONT_UI }}>
        <Img src={staticFile("img/a-main-light.png")} style={{ width: 18, height: 18, borderRadius: 9 }} />
        <span style={{ flex: 1 }}>思绪 · Thinkly</span>
        <span style={{ fontFamily: FONT_MONO }}>2026-10-19</span>
      </div>
    </div>
  );
}

function ThemeCard({ theme, on }: { theme: Theme; on: boolean }) {
  return (
    <div
      style={{
        height: 104,
        padding: 10,
        borderRadius: 10,
        background: C.paper,
        boxShadow: on ? `0 0 0 1px ${C.accent}, 0 4px 12px rgba(84,125,208,0.14)` : "0 0 0 1px rgba(31,30,29,0.09)",
      }}
    >
      <div style={{ height: 58, borderRadius: 6, background: theme.bg, padding: "10px 12px", boxShadow: "inset 0 0 0 1px rgba(31,30,29,0.05)" }}>
        <div style={{ width: "60%", height: 6, borderRadius: 3, background: theme.text, opacity: 0.8 }} />
        <div style={{ width: "85%", height: 4, borderRadius: 2, background: theme.sub, opacity: 0.5, marginTop: 8 }} />
        <div style={{ width: "70%", height: 4, borderRadius: 2, background: theme.sub, opacity: 0.5, marginTop: 6 }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 460, color: on ? C.text : C.text2 }}>{theme.name}</div>
    </div>
  );
}

function Dialog({ f }: { f: number }) {
  const current = THEMES[pick(f)];
  const t = ramp(f, 134, 176);
  const press = f >= 360 && f < 366;
  return (
    <div style={{ position: "absolute", left: DLG.x, top: DLG.y, width: DLG.w, height: DLG.h, borderRadius: 12, background: C.paper, boxShadow: "0 0 0 1px rgba(31,30,29,0.08), 0 30px 80px rgba(31,30,29,0.24)" }}>
      <div style={{ height: 64, padding: "20px 24px 0", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 560, flex: 1 }}>生成图片</span>
        <Icon name="x" size={18} color={C.text3} />
      </div>
      <div style={{ position: "absolute", left: 24, top: 64, width: 560, bottom: 24, borderRadius: 10, background: current.bg, display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 1px rgba(31,30,29,0.06)" }}>
        <ShareCard theme={current} t={t} />
      </div>
      <div style={{ position: "absolute", left: 24 + 560 + 24, right: 24, top: 64 }}>
        <div style={{ fontSize: 13, color: C.text2, height: 28 }}>选择卡片主题</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {THEMES.map((theme, i) => (
            <ThemeCard key={theme.name} theme={theme} on={i === pick(f)} />
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", right: 24, bottom: 24, display: "flex", gap: 8 }}>
        <div style={{ height: 32, padding: "0 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 13, background: C.hover }}>
          <Icon name="copy" size={14} color={C.text2} />复制
        </div>
        <div style={{ height: 32, padding: "0 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 460, background: C.selected, boxShadow: `inset 0 0 0 1px ${C.accent}`, transform: `scale(${press ? 0.96 : 1})` }}>
          <Icon name="download" size={14} color={C.text} />保存图片
        </div>
      </div>
    </div>
  );
}

export function Share() {
  const f = useCurrentFrame();
  const fill = sceneFill(f, LEN);
  const p = track(f, POINTER);
  const menu = f >= 82 && f < 114 ? pop(f, 82, 18) : 0;
  const open = f >= 116 && f < 372 ? pop(f, 116, 18) : 0;
  const close = ramp(f, 366, 380);
  const dlg = f >= 116 && f < 380;
  const downs = [76, 112, 236, 282, 328, 360];
  const down = downs.some((d) => f >= d && f < d + 6);

  const main = (
    <Page>
      <DocHead t={fill} />
      {DOC.todos.map((todo, i) => (
        <Todo key={todo} t={fill} on={i === 0 ? 1 : 0}>
          {todo}
        </Todo>
      ))}
      <H2 t={fill}>{DOC.h2b}</H2>
      <Para t={fill} style={{ color: C.text2 }}>
        {DOC.para}
      </Para>
    </Page>
  );

  const scale = dlg ? (f < 372 ? 0.96 + open * 0.04 : 1 - close * 0.03) : 1;
  const overlay = (
    <>
      {menu > 0 ? <Menu items={PAGE_MENU} width={240} appear={menu} active={f >= 100 ? 2 : -1} style={{ left: 1176 - 240 - 4, top: 44, transformOrigin: "top right" }} /> : null}
      {dlg ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 70, background: `rgba(31,30,29,${0.16 * Math.min(1, open) * (1 - close)})` }}>
          <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, open * 1.4) * (1 - close), transform: `scale(${scale})` }}>
            <Dialog f={f} />
          </div>
        </div>
      ) : null}
      <Toast text="图片已保存" f={f} at={380} hold={46} />
      {f >= 36 ? <Pointer x={p.x} y={p.y} down={down} /> : null}
    </>
  );

  return (
    <>
      <Caption num="05" title="分享图" line="一篇笔记一键排成卡片，换主题即见即得" len={LEN} />
      <Placed>
        <Window tabs={[{ name: DOC.title, active: true }]} sidebar={<FileTree />} main={main} overlay={overlay} />
      </Placed>
    </>
  );
}
