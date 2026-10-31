import { baseCss, oldStage, font } from "./layout.mjs";
import { scene, nativeIcon, themes, motionCss, legacyCss, escapeXml } from "./motion.mjs";
import { background } from "./backgrounds.mjs";

const vars=theme=>Object.entries(theme).map(([k,v])=>`--${k}:${v}`).join(";");
export function gallery(catalog,oldSvgs) {
  const nav=catalog.map(row=>`<a href="#${row.key}">${row.title}</a>`).join("");
  const sections=catalog.map((row,index)=>{
    const old=oldSvgs[row.key];
    const cell=(head,art,small="")=>`<div class="variants-cell">${head}<div class="variants-stage">${art}</div>${small?`<div class="variants-native">${small}</div>`:""}<p>${escapeXml(row.copy)}</p></div>`;
    return `<section id="${row.key}" class="variant-section"><h2>${row.title}</h2><div class="comparison-scroll"><div class="gallery-grid">${cell('<h3>旧版</h3>',oldStage(row,old),row.small?old:"")}${row.variants.map((v,i)=>cell(`<h3><button class="pick" data-case="${row.key}" data-letter="${v.letter}" aria-label="${row.title} 选择 ${v.letter}" aria-pressed="false">${v.letter}</button></h3>`,scene(row,v,background(index*3+i)),nativeIcon(row,v))).join("")}</div></div></section>`;
  }).join("\n");
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>点阵插画 · 三版待选</title>
<style>
${baseCss}${motionCss}${legacyCss}
:root{${vars(themes.light)};--goose-accent-solid:var(--accent);--goose-color-danger:var(--danger);color-scheme:light}
:root[data-theme="dark"]{${vars(themes.dark)};color-scheme:dark}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:130px}
body{background:var(--surface);color:var(--ink);font-family:${font};font-size:16px;line-height:1.5}
::selection{background:var(--accent);color:var(--surface)}
button,a{font:inherit;color:inherit}
button{min-height:44px;border:1px solid var(--border);border-radius:7px;background:var(--surface);padding:8px 14px;cursor:pointer}
button:hover,button:focus-visible,a:focus-visible{outline:none;background:color-mix(in srgb,var(--accent) 10%,var(--surface))}
button:disabled{cursor:default;color:var(--muted)}
a{text-underline-offset:4px}
header{position:sticky;top:0;z-index:2;background:var(--surface);border-bottom:1px solid var(--border);padding:18px 32px 12px}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
h1{font-size:26px;line-height:1.4;font-weight:600;margin:0}
.controls{display:flex;gap:8px;flex-wrap:wrap}
nav{display:flex;gap:8px 20px;flex-wrap:wrap;margin-top:8px}
nav a{display:inline-flex;align-items:center;min-height:36px;text-decoration:none;color:var(--muted)}
main{max-width:1720px;margin:auto;padding:0 32px 40px}
.variant-section{padding:30px 0 36px;border-bottom:1px solid var(--border)}
.variant-section>h2{font-size:24px;font-weight:600;margin:0 0 20px}
.comparison-scroll{overflow:auto;scrollbar-color:var(--border) var(--surface);scrollbar-width:thin}
.gallery-grid{display:grid;grid-template-columns:repeat(4,minmax(260px,1fr));gap:20px;min-width:1120px}
.variants-cell h3{font-size:20px;font-weight:400;line-height:44px;margin:0 0 10px;height:44px}
.pick{min-width:68px;border-color:transparent}
.pick[aria-pressed="true"]{border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 8%,var(--surface))}
.variants-stage{width:320px}
.selection{padding-top:28px}
.selection h2{font-size:24px;margin:0 0 12px}
output{display:block;white-space:pre-line;font-size:16px;line-height:1.8;margin-bottom:16px}
.variant-section[data-offscreen] .alt-motion{animation-play-state:paused}
@media(max-width:640px){header{padding:16px}.topbar{gap:12px}main{padding:0 16px 28px}h1{font-size:24px}nav{gap:4px 14px}html{scroll-padding-top:210px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
</head>
<body>
<header><div class="topbar"><h1>点阵插画 · 三版待选</h1><div class="controls"><button id="motion" aria-pressed="false">暂停动画</button><button id="theme" aria-pressed="false">切换深色</button></div></div><nav aria-label="插画位置">${nav}</nav></header>
<main>${sections}<section class="selection"><h2>已选方案</h2><output id="choices" aria-live="polite"></output><button id="copy" disabled>复制选择</button></section></main>
<script>
const cases=${JSON.stringify(catalog.map(row=>({key:row.key,title:row.title})))};
const selected={};
let paused=false;
const output=document.getElementById('choices');
const copy=document.getElementById('copy');
const format=()=>cases.map(row=>row.title+'：'+(selected[row.key]??'待选')).join('\n');
function updateSelection(){output.textContent=format();copy.textContent='复制选择';copy.disabled=Object.keys(selected).length===0;document.querySelectorAll('.pick').forEach(button=>button.setAttribute('aria-pressed',String(selected[button.dataset.case]===button.dataset.letter)));}
document.querySelectorAll('.pick').forEach(button=>button.addEventListener('click',()=>{selected[button.dataset.case]=button.dataset.letter;updateSelection();}));
function updatePlayback(){document.documentElement.classList.toggle('variants-paused',paused||document.hidden);}
document.getElementById('motion').addEventListener('click',event=>{paused=!paused;event.currentTarget.textContent=paused?'播放动画':'暂停动画';event.currentTarget.setAttribute('aria-pressed',String(paused));updatePlayback();});
document.addEventListener('visibilitychange',updatePlayback);
document.getElementById('theme').addEventListener('click',event=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';event.currentTarget.textContent=dark?'切换浅色':'切换深色';event.currentTarget.setAttribute('aria-pressed',String(dark));});
copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(format());copy.textContent='已复制';}catch{const range=document.createRange();range.selectNodeContents(output);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);copy.textContent='已选中文字，可手动复制';}});
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.toggleAttribute('data-offscreen',!entry.isIntersecting)),{rootMargin:'80px'});document.querySelectorAll('.variant-section').forEach(section=>observer.observe(section));}
updateSelection();updatePlayback();
</script>
</body>
</html>
`;
}
