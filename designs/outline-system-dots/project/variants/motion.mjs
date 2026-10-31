export const themes = {
  light: { surface: "#fafafa", ink: "#1f1e1d", accent: "#547dd0", danger: "#b42318", muted: "#5e5d59", border: "#dededb" },
  dark: { surface: "#222222", ink: "#f0efec", accent: "#779de8", danger: "#ffb4ab", muted: "#c3c2b7", border: "#494946" },
};

export const motionCss = `
.alt-motion{animation-duration:var(--period,12s);animation-delay:var(--delay,0s);animation-iteration-count:infinite;animation-timing-function:ease-in-out;transform-box:view-box;transform-origin:var(--origin,160px 104px)}
.alt-breathe{animation-name:alt-breathe}.alt-rise{animation-name:alt-rise}.alt-sway{animation-name:alt-sway}.alt-ripple{animation-name:alt-ripple}
@keyframes alt-breathe{0%,100%{opacity:1}50%{opacity:var(--low,.55)}}
@keyframes alt-rise{0%,100%{opacity:1;transform:translateY(0)}50%{opacity:var(--low,.55);transform:translateY(calc(-1 * var(--amplitude,1.2px)))}}
@keyframes alt-sway{0%,100%{opacity:1;transform:translateX(0)}50%{opacity:var(--low,.55);transform:translateX(var(--amplitude,1.2px))}}
@keyframes alt-ripple{0%,100%{opacity:var(--low,.55);transform:scale(.992)}50%{opacity:1;transform:scale(1.008)}}
.variants-paused .alt-motion,[data-offscreen] .alt-motion{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){.alt-motion{animation:none!important;transform:none!important;opacity:1!important}}
`;

export const legacyCss = `.goose-empty-art-ink{fill:currentColor}.goose-empty-art-accent{fill:var(--goose-accent-solid)}.goose-empty-art-danger{fill:var(--goose-color-danger)}.goose-empty-art-soft{opacity:.24}.goose-empty-art-secondary{opacity:.5}.goose-empty-art-body{opacity:.8}`;
const n = value => Number(value.toFixed(3));
// Match CSS ease-in-out, including the reversal at the halfway keyframe.
function eased(progress) {
  let lo=0, hi=1;
  for(let i=0;i<20;i++){
    const t=(lo+hi)/2, x=3*(1-t)*(1-t)*t*.42+3*(1-t)*t*t*.58+t*t*t;
    if(x<progress)lo=t;else hi=t;
  }
  const t=(lo+hi)/2;
  return 3*(1-t)*t*t+t*t*t;
}
export const escapeXml = s => String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
function primitive(part, palette) {
  const color = palette ? palette[part.tone] : `var(--${part.tone})`;
  if (part.r !== undefined) return `<circle cx="${part.x}" cy="${part.y}" r="${part.r}" fill="${color}" opacity="${part.alpha}"/>`;
  return `<path d="${part.d}" fill="none" stroke="${color}" stroke-opacity="${part.alpha}" stroke-width="${part.width}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray=".01 ${part.gap}"/>`;
}
export function drawGroup(group,palette,time) {
  const contents=group.parts.map(p=>primitive(p,palette)).join("");
  if (!group.motion) return `<g>${contents}</g>`;
  if (time === undefined) {
    const style=`--period:${group.period}s;--delay:-${group.phase}s;--low:${group.low};--amplitude:${group.amplitude}px;--origin:${group.origin[0]}px ${group.origin[1]}px`;
    return `<g class="alt-motion alt-${group.motion}" style="${style}">${contents}</g>`;
  }
  const phase=((time+group.phase)%group.period)/group.period;
  const q=eased(1-Math.abs(phase*2-1));
  const ripple=group.motion==="ripple";
  const opacity=ripple ? group.low+(1-group.low)*q : 1-(1-group.low)*q;
  let transform="";
  if (group.motion==="rise") transform=`translate(0 ${n(-group.amplitude*q)})`;
  if (group.motion==="sway") transform=`translate(${n(group.amplitude*q)} 0)`;
  if (ripple) transform=`translate(${group.origin.join(" ")}) scale(${n(.992+.016*q)}) translate(${-group.origin[0]} ${-group.origin[1]})`;
  return `<g opacity="${n(opacity)}" transform="${transform}">${contents}</g>`;
}
export function foreground(row,variant,palette,time) {
  const [w,h]=row.plane??[128,96];
  const scale=row.small ? 5.1 : row.key==="Reflection" ? .9 : 1.24;
  const x=(320-w*scale)/2, y=(208-h*scale)/2;
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${scale})">${variant.groups.map(g=>drawGroup(g,palette,time)).join("")}</g>`;
}
export function scene(row,variant,bg,palette,time) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 208" width="320" height="208" role="img" aria-label="${escapeXml(row.title)} ${variant.letter}">${bg.groups.map(g=>drawGroup(g,palette,time)).join("")}${foreground(row,variant,palette,time)}</svg>`;
}
export function nativeIcon(row,variant,palette,time) {
  if(!row.small)return "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" width="22" height="22" role="img" aria-label="22px ${variant.letter}">${variant.groups.map(g=>drawGroup(g,palette,time)).join("")}</svg>`;
}
