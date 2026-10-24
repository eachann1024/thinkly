import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { IconButton } from "@/components/ui/icon-button";
import { RotateCw } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { WidgetCardData } from "@/lib/notebook-ai/cards/displayTypes";
import { EASE_OUT_EXPO } from "./cardMotion";
import "./ai-cards-info.css";

const messages = i18nYaml<"src/pages/workspace/components/ai-cards/WidgetCard.tsx#messages:1">`
zh-Hans:
  reload: "重新运行"
en:
  reload: "Run again"
ja:
  reload: "再実行"
`;
const t = createTranslator(messages);

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 720;
const READY_FALLBACK_MS = 2500;
const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; base-uri 'none'; form-action 'none'";
const clampHeight = (value: number) => Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.ceil(value)));

type WidgetTheme = { vars: Record<"fg" | "bg" | "muted" | "accent" | "border", string>; scheme: "light" | "dark" };
const PROBES = { fg: "var(--goose-text-primary)", muted: "var(--goose-text-secondary)", accent: "var(--goose-accent-solid)", border: "hsl(var(--border))" } as const;
const SAFE_COLOR = /^[a-z0-9(),.%\s/-]+$/i;

function safeColor(value: string, fallback: string) {
  return value && SAFE_COLOR.test(value) ? value : fallback;
}

function isDark(color: string) {
  const numbers = (color.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  const scale = color.startsWith("color(") ? 255 : 1;
  if (numbers.length < 3) return false;
  const [r, g, b] = numbers.map(n => n * scale);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

function readTheme(host: HTMLElement): WidgetTheme {
  const probe = document.createElement("span");
  probe.style.display = "none";
  host.appendChild(probe);
  const read = (expression: string, property: "color" | "backgroundColor" = "color") => {
    probe.style[property] = "";
    probe.style[property] = expression;
    return getComputedStyle(probe)[property];
  };
  const card = host.closest<HTMLElement>(".ai-card") ?? host;
  let bg = getComputedStyle(card).backgroundColor;
  if (!bg || bg === "transparent" || /^rgba\(.*,\s*0\)$/.test(bg)) bg = read("var(--goose-editor-bg)", "backgroundColor");
  const vars = {
    fg: safeColor(read(PROBES.fg), "#20242c"),
    bg: safeColor(bg, "#ffffff"),
    muted: safeColor(read(PROBES.muted), "#526071"),
    accent: safeColor(read(PROBES.accent), "#547dd0"),
    border: safeColor(read(PROBES.border), "#e5e5e5"),
  };
  probe.remove();
  return { vars, scheme: isDark(vars.bg) ? "dark" : "light" };
}

function buildDocument(html: string, id: string, theme: WidgetTheme, run: number) {
  const vars = Object.entries(theme.vars).map(([key, value]) => `--${key}:${value};`).join("");
  const script = `(function(){var ID=${JSON.stringify(id).replace(/</g, "\\u003c")};
function send(){var b=document.body;if(!b)return;var h=Math.ceil(Math.max(b.scrollHeight,b.getBoundingClientRect().height));parent.postMessage({type:"goose-widget-height",id:ID,height:h},"*");}
window.addEventListener("message",function(e){if(e.source!==parent)return;var d=e.data;if(!d||d.type!=="goose-widget-theme"||d.id!==ID)return;var s=document.documentElement.style;for(var k in d.vars){s.setProperty("--"+k,d.vars[k]);}s.colorScheme=d.scheme;});
function start(){send();if(window.ResizeObserver){new ResizeObserver(send).observe(document.body);}window.addEventListener("load",send);}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",start);}else{start();}})();`;
  return `<!doctype html><html data-run="${run}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>:root{${vars}color-scheme:${theme.scheme};}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:2px;background:var(--bg);color:var(--fg);font:13px/20px system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased;overflow-wrap:anywhere}
button,input,select,textarea{font:inherit;color:inherit}
button{padding:4px 10px;border:1px solid var(--border);border-radius:8px;background:transparent;cursor:pointer}
button:hover{background:color-mix(in srgb,var(--fg) 6%,transparent)}
input,select,textarea{border:1px solid var(--border);border-radius:6px;background:transparent;padding:3px 6px}
input[type=range],input[type=checkbox],input[type=radio]{accent-color:var(--accent);padding:0}
a{color:var(--accent)}
img,svg,canvas,video{max-width:100%}
</style><script>${script}</script></head><body>${html}</body></html>`;
}

export function WidgetCard({ card }: { card: WidgetCardData }) {
  useLocale();
  const reduce = useReducedMotion();
  const frameId = `goose-widget-${useId()}`;
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const themeRef = useRef<WidgetTheme | null>(null);
  const [themeReady, setThemeReady] = useState(false);
  const [run, setRun] = useState(0);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(() => clampHeight(card.height ?? 180));

  useLayoutEffect(() => {
    if (!hostRef.current) return;
    themeRef.current = readTheme(hostRef.current);
    setThemeReady(true);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let timer = 0;
    const push = () => {
      const theme = readTheme(host);
      themeRef.current = theme;
      frameRef.current?.contentWindow?.postMessage({ type: "goose-widget-theme", id: frameId, ...theme }, "*");
    };
    const schedule = () => {
      window.clearTimeout(timer);
      requestAnimationFrame(push);
      timer = window.setTimeout(push, 360);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", schedule);
    return () => { observer.disconnect(); media.removeEventListener("change", schedule); window.clearTimeout(timer); };
  }, [frameId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      const data = event.data as { type?: unknown; id?: unknown; height?: unknown } | null;
      if (!data || data.type !== "goose-widget-height" || data.id !== frameId) return;
      const next = Number(data.height);
      if (!Number.isFinite(next)) return;
      setHeight(clampHeight(next));
      setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameId]);

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setReady(true), READY_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [ready, run]);

  const srcDoc = useMemo(() => themeReady && themeRef.current ? buildDocument(card.html, frameId, themeRef.current, run) : "",
    [card.html, frameId, themeReady, run]);

  const reload = () => { setReady(false); setRun(n => n + 1); };

  return <div ref={hostRef} className="ai-widget" data-ready={ready || undefined}>
    <motion.div className="ai-widget-frame" initial={false} animate={{ height }}
      transition={reduce ? { duration: 0 } : { duration: 0.42, ease: EASE_OUT_EXPO }}>
      {srcDoc && <iframe key={run} ref={frameRef} title={card.title} srcDoc={srcDoc} sandbox="allow-scripts" referrerPolicy="no-referrer"
        className="ai-widget-iframe" style={{ height }}/>}
      {!ready && <div className="ai-widget-shimmer" aria-hidden="true"/>}
    </motion.div>
    <TooltipProvider delayDuration={600}>
      <Tooltip>
        <TooltipTrigger asChild>
          <IconButton size="xs" tone="muted" type="button" aria-label={t("reload")} onClick={reload} className="ai-widget-reload">
            <RotateCw size={14}/>
          </IconButton>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("reload")}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>;
}
