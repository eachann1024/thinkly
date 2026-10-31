import { scene, nativeIcon, themes, escapeXml, motionCss, legacyCss } from "./motion.mjs";
import { background } from "./backgrounds.mjs";

export const boardWidth=1600, boardHeight=480;
export const font='-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';
export const baseCss=`
body{margin:0}
.variants-board{box-sizing:border-box;width:1600px;height:480px;padding:28px 32px 32px;background:var(--surface);color:var(--ink);font-family:${font}}
.variants-board h1{margin:0;font-size:28px;font-weight:600;line-height:1.4;letter-spacing:-.01em}
.variants-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;margin-top:18px}
.variants-cell{min-width:0;text-align:center}
.variants-cell h2{font-size:20px;font-weight:400;line-height:28px;margin:0 0 12px}
.variants-cell p{font-size:16px;line-height:24px;color:var(--muted);margin:18px auto 0;max-width:300px}
.variants-stage{width:320px;height:208px;max-width:100%;margin:auto;display:flex;align-items:center;justify-content:center}
.variants-stage>svg{max-width:100%;height:auto}
.variants-native{height:26px;margin:10px auto 0;display:flex;justify-content:center;align-items:center}
.variants-native>svg{width:22px;height:22px}
.variants-cell:first-child{border-right:1px solid var(--border);padding-right:18px}
`;

export function oldStage(row,oldSvg) {
  const [w,h]=row.native;
  const scale=row.small?5.1:Math.min(188/w,142/h);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="208" viewBox="0 0 320 208" aria-hidden="true"><g transform="translate(${(320-w*scale)/2} ${(208-h*scale)/2}) scale(${scale})">${oldSvg}</g></svg>`;
}
const cell=(label,art,copy,native="")=>`<div class="variants-cell"><h2>${label}</h2><div class="variants-stage">${art}</div>${native?`<div class="variants-native">${native}</div>`:""}<p>${escapeXml(copy)}</p></div>`;

export function artboard(row,index,oldSvg) {
  const oldNative=row.small?oldSvg:"";
  const old=cell("旧版",oldStage(row,oldSvg),row.copy,oldNative);
  const alternatives=row.variants.map((v,i)=>cell(v.letter,scene(row,v,background(index*3+i)),row.copy,nativeIcon(row,v))).join("\n");
  const props={dark:{editor:"boolean",default:false},animate:{editor:"boolean",default:true},$preview:{width:boardWidth,height:boardHeight}};
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${row.title} · 三版待选</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet><style>${baseCss}${motionCss}${legacyCss}</style></helmet>
<div class="variants-board {{motionClass}}" style="--surface:{{theme.surface}};--ink:{{theme.ink}};--accent:{{theme.accent}};--danger:{{theme.danger}};--muted:{{theme.muted}};--border:{{theme.border}};--goose-accent-solid:{{theme.accent}};--goose-color-danger:{{theme.danger}}">
<h1>${row.title}</h1>
<div class="variants-grid">
${old}
${alternatives}
</div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='${JSON.stringify(props)}'>
class Component extends DCLogic {
renderVals(){return {theme:this.props.dark?${JSON.stringify(themes.dark)}:${JSON.stringify(themes.light)},motionClass:this.props.animate===false?"variants-paused":""};}
}
</script>
</body>
</html>
`;
}

function staticOld(svg,palette) {
  return svg.replaceAll("var(--goose-accent-solid)",palette.accent).replaceAll("var(--goose-color-danger)",palette.danger);
}
export function sheet(row,index,oldSvg,time=0,theme="light") {
  const palette=themes[theme];
  const cells=[oldStage(row,staticOld(oldSvg,palette)),...row.variants.map((v,i)=>scene(row,v,background(index*3+i),palette,time))];
  const left=32, gap=20, w=(1600-64-gap*3)/4;
  let content=`<rect width="1600" height="480" fill="${palette.surface}"/><text x="32" y="65" font-size="28" font-weight="600">${row.title}</text>`;
  const copyLines=row.copy.length>20?[row.copy.slice(0,15),row.copy.slice(15)]:[row.copy];
  cells.forEach((svg,i)=>{
    const x=left+i*(w+gap), cx=x+w/2, sy=140;
    content+=`<text x="${cx}" y="116" font-size="20" text-anchor="middle">${i===0?"旧版":row.variants[i-1].letter}</text><g transform="translate(${cx-160} ${sy})">${svg}</g>`;
    if(row.small){
      const icon=i===0?staticOld(oldSvg,palette):nativeIcon(row,row.variants[i-1],palette,time);
      content+=`<g transform="translate(${cx-11} 359)">${icon}</g>`;
    }
    copyLines.forEach((text,li)=>content+=`<text x="${cx}" y="${(row.small?414:390)+li*24}" font-size="16" fill="${palette.muted}" text-anchor="middle">${escapeXml(text)}</text>`);
  });
  content+=`<path d="M${32+w+1} 92V440" stroke="${palette.border}" stroke-width="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="480" viewBox="0 0 1600 480" fill="${palette.ink}" style="color:${palette.ink};--goose-accent-solid:${palette.accent};--goose-color-danger:${palette.danger}"><style>text{font-family:${font}}${legacyCss.replaceAll("var(--goose-accent-solid)",palette.accent).replaceAll("var(--goose-color-danger)",palette.danger)}</style>${content}</svg>`;
}

export function standalone(row,index,variantIndex,theme="light") {
  const palette=themes[theme], variant=row.variants[variantIndex];
  const raw=scene(row,variant,background(index*3+variantIndex));
  return raw.replace('role="img"',`style="--ink:${palette.ink};--accent:${palette.accent};--danger:${palette.danger};background:${palette.surface}" role="img"`).replace(
    /(<svg[^>]*>)/,`$1<style>${motionCss}</style>`);
}
