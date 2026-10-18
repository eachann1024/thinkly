import { staticFile } from "remotion";

export function Fonts() {
  const css = `
@font-face { font-family: "Inter Var"; font-weight: 100 900; src: url("${staticFile("fonts/inter.woff2")}") format("woff2-variations"); }
@font-face { font-family: "JB Mono"; font-weight: 400; src: url("${staticFile("fonts/JetBrainsMono-Regular.woff2")}") format("woff2"); }
`;
  return <style>{css}</style>;
}
