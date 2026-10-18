import { useCurrentFrame } from "remotion";
import { C, SCENES, pop, ramp, sceneFill, track } from "../theme";
import { H2, Lead, Page, Para, Title, Todo } from "../ui/Doc";
import { Icon, Pointer } from "../ui/Icons";
import { Menu, type MenuItem } from "../ui/Menu";
import { FileTree } from "../ui/Sidebar";
import { Skel } from "../ui/Skeleton";
import { Caption, Placed } from "../ui/Stage";
import { Toast } from "../ui/Toast";
import { Window } from "../ui/Window";
import { DOC, DocHead } from "./content";

const LEN = SCENES.history.len;

const PAGE_MENU: MenuItem[] = [
  { icon: "file", label: "在新窗口打开" },
  { icon: "download", label: "导入" },
  { icon: "image", label: "生成图片" },
  { icon: "download", label: "导出" },
  { icon: "history", label: "页面历史" },
];

type Version = { time: string; meta: string; group?: string; milestone?: boolean };
const VERSIONS: Version[] = [
  { time: "01:12", meta: "自动 · 412 字", group: "今天" },
  { time: "00:48", meta: "自动 · 380 字 · 变化 3" },
  { time: "00:21", meta: "手动 · 296 字", milestone: true },
  { time: "22:15", meta: "自动 · 118 字", group: "昨天" },
  { time: "18:02", meta: "自动 · 64 字" },
];
const ROW = 44;
const rowY = (i: number) => 132 + i * ROW + (i >= 3 ? 24 : 0) + ROW / 2;
const RESTORE = { x: 1110, y: 66 };

const POINTER = [
  [36, 900, 420],
  [70, 1160, 22],
  [84, 1160, 22],
  [110, 990, 202],
  [126, 990, 202],
  [160, 170, rowY(3)],
  [190, 170, rowY(3)],
  [228, 170, rowY(2)],
  [262, 170, rowY(2)],
  [308, RESTORE.x, RESTORE.y],
  [340, RESTORE.x, RESTORE.y],
  [400, 760, 470],
] as Parameters<typeof track>[1];

function HistoryList({ selected, t }: { selected: number; t: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, padding: "8px 8px 0", opacity: t }}>
      <div style={{ padding: "6px 8px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 650 }}>
          <Icon name="history" size={14} color={C.text} />
          页面历史
        </div>
        <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>选择时间点预览后还原</div>
      </div>
      {VERSIONS.map((v, i) => {
        const on = i === selected;
        return (
          <div key={v.time}>
            {v.group ? (
              <div style={{ height: 24, padding: "0 8px", display: "flex", alignItems: "center", fontSize: 11, letterSpacing: "0.06em", color: C.text3 }}>
                {v.group}
              </div>
            ) : null}
            <div
              style={{
                height: ROW,
                padding: "0 8px 0 10px",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: on ? C.selected : "transparent",
                boxShadow: on ? `inset 0 0 0 1px ${C.accent}` : "none",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 4, flex: "none", background: on ? C.accent : "transparent", boxShadow: `inset 0 0 0 1.5px ${on ? C.accent : "#c4c3be"}` }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 460, fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center", gap: 6 }}>
                  {v.time}
                  {v.milestone ? <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, color: C.accent, background: C.selected }}>里程碑</span> : null}
                </div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{v.meta}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Toolbar({ label, press }: { label: string; press: boolean }) {
  return (
    <div style={{ height: 44, padding: "0 16px 0 12px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.line}` }}>
      <div style={{ height: 32, padding: "0 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 14, background: C.hover }}>
        <Icon name="arrowLeft" size={15} color={C.text2} />
        返回
      </div>
      <div style={{ width: 1, height: 20, background: C.line }} />
      <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{DOC.title}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.text2 }}>
        <Icon name="history" size={15} color={C.text2} />
        {label}
      </span>
      <div style={{ height: 32, padding: "0 16px", borderRadius: 8, display: "flex", alignItems: "center", fontSize: 14, fontWeight: 460, background: C.selected, boxShadow: `inset 0 0 0 1px ${C.accent}`, transform: `scale(${press ? 0.96 : 1})` }}>
        还原此版本
      </div>
    </div>
  );
}

function VersionDoc({ v, t }: { v: number; t: number }) {
  if (v === 3) {
    return (
      <Page top={28}>
        <Title t={t}>{DOC.title}</Title>
        <Lead t={t}>{DOC.lead}</Lead>
        <Para t={t} lines={2} style={{ color: C.text2 }}>
          {DOC.para}
        </Para>
      </Page>
    );
  }
  return (
    <Page top={28}>
      <DocHead t={t} />
      {DOC.todos.slice(0, v === 2 ? 2 : 3).map((todo, i) => (
        <Todo key={todo} t={t} on={v === 0 && i === 0 ? 1 : 0}>
          {todo}
        </Todo>
      ))}
      <H2 t={t}>{DOC.h2b}</H2>
      {v === 0 ? (
        <Para t={t} style={{ color: C.text2 }}>
          {DOC.para}
        </Para>
      ) : null}
    </Page>
  );
}

export function History() {
  const f = useCurrentFrame();
  const fill = sceneFill(f, LEN);
  const p = track(f, POINTER);
  const menu = f >= 84 && f < 122 ? pop(f, 84, 18) : 0;
  const inHistory = f >= 124 && f < 352;
  const selected = f < 196 ? 0 : f < 268 ? 3 : 2;
  const switchAt = selected === 3 ? 196 : selected === 2 ? 268 : 124;
  const docT = ramp(f, switchAt + 4, switchAt + 34);
  const back = ramp(f, 352, 384) * fill;
  const downs = [78, 120, 190, 262, 334];
  const down = downs.some((d) => f >= d && f < d + 6);
  const label = selected === 3 ? "昨天 22:15" : selected === 2 ? "今天 00:21" : "今天 01:12";

  const main = inHistory ? (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ opacity: ramp(f, 124, 140) }}>
        <Toolbar label={label} press={f >= 334 && f < 340} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 45, bottom: 0 }}>
        <VersionDoc v={selected} t={docT} />
      </div>
    </div>
  ) : f < 124 ? (
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
  ) : (
    <Page>
      <DocHead t={back} />
      {DOC.todos.slice(0, 2).map((todo) => (
        <Todo key={todo} t={back}>
          {todo}
        </Todo>
      ))}
      <H2 t={back}>{DOC.h2b}</H2>
    </Page>
  );

  const sidebar = inHistory ? (
    <>
      <HistoryList selected={selected} t={ramp(f, 128, 150)} />
      {f < 150 ? (
        <div style={{ position: "absolute", left: 16, right: 16, top: 140, display: "flex", flexDirection: "column", gap: 26, opacity: 1 - ramp(f, 140, 150) }}>
          {[70, 55, 62, 48].map((w) => (
            <Skel key={w} w={`${w}%`} h={10} />
          ))}
        </div>
      ) : null}
    </>
  ) : (
    <FileTree />
  );

  const overlay = (
    <>
      {menu > 0 ? <Menu items={PAGE_MENU} width={240} appear={menu} active={f >= 108 ? 4 : -1} style={{ left: 1176 - 240 - 4, top: 44, transformOrigin: "top right" }} /> : null}
      <Toast text="已还原到 00:21 的版本" f={f} at={354} />
      {f >= 36 && f < 420 ? <Pointer x={p.x} y={p.y} down={down} /> : null}
    </>
  );

  return (
    <>
      <Caption num="06" title="历史" line="每一次改动都留着，随时回到那个版本" len={LEN} />
      <Placed>
        <Window tabs={[{ name: DOC.title, active: true }]} rail="folder" sidebar={sidebar} main={main} overlay={overlay} />
      </Placed>
    </>
  );
}
