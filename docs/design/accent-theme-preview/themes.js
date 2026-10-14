/* Production snapshot: accentColor.ts + accentOutlineTokens.ts at 78db53e1 (1.7.205). */
window.accentThemes = [
  { id: "ocean", name: "海蓝", accent: "#547dd0", selected: "#e5edfc", dark: "#779de8" },
  { id: "iris", name: "鸢尾", accent: "#8174cb", selected: "#eceafa", dark: "#9484e5" },
  { id: "pine", name: "松绿", accent: "#559369", selected: "#e4f1e8", dark: "#6aae83" },
  { id: "coral", name: "朱砂", accent: "#b76e4a", selected: "#fbeadf", dark: "#d28f68" },
  { id: "rose", name: "莓红", accent: "#c36a83", selected: "#f8e7eb", dark: "#d486a0" },
  { id: "grape", name: "葡萄", accent: "#9d6abf", selected: "#f1e8f8", dark: "#b088cc" },
  { id: "mono", name: "叶脉", accent: "#756b42", selected: "#fcfcf7", dark: "#b3a575", shell: "linear-gradient(158deg,#ece8dd,#f5f3eb)", sidebar: "#f7f5ed", editor: "linear-gradient(165deg,#fcfbf7,#fffffc)", surface: "#fcfbf7" },
  { id: "amber", name: "浅秋", accent: "#c9b894", selected: "#fffdf7", dark: "#928365", shell: "linear-gradient(180deg,#f1e7cd,#f6f0e1)", sidebar: "linear-gradient(#f7f1e2,#faf6ec)", editor: "linear-gradient(#fcfaf4,#fdfcf8)", surface: "#fcfaf4" },
  { id: "wheat", name: "麦笺", accent: "#aeb18e", selected: "#fcfbf3", dark: "#838d69", shell: "linear-gradient(#e9e6d6,#f1efe4)", sidebar: "linear-gradient(#f3f1e6,#f7f5ed)", editor: "linear-gradient(#faf9f2,#fdfcf7)", surface: "#faf9f2" }
];
window.accentColorMath = (() => {
  // Snapshot order: light focus, light text, dark text, production light hover.
  const roles = {
    ocean: ["#547dd0", "#4668ad", "#779de8", "#eef3fc"],
    iris: ["#8174cb", "#6a5fa6", "#a092e8", "#f3f1fb"],
    pine: ["#559369", "#437453", "#6aae83", "#edf5ef"],
    coral: ["#b76e4a", "#985b3d", "#d28f68", "#fcf2ec"],
    rose: ["#c16982", "#985366", "#d487a1", "#fbf0f2"],
    grape: ["#9d6abf", "#81579d", "#b58fcf", "#f7f1fb"],
    mono: ["#756b42", "#6c623d", "#b3a575", "#e3e1d5"],
    amber: ["#877b63", "#69604d", "#a99d85", "#e9dfc7"],
    wheat: ["#7a7c63", "#60614e", "#99a284", "#e0ddc8"]
  };
  const rgb = (hex) => hex.replace("#", "").match(/.{2}/g).map((x) => parseInt(x, 16));
  function luminance(hex) {
    return rgb(hex).map((x) => x / 255).map((x) => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((n, x, i) => n + x * [.2126, .7152, .0722][i], 0);
  }
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
  function resolve(theme, dark) {
    const [lightFocus, lightText, darkText, lightHover] = roles[theme.id];
    const accent = dark ? theme.dark : theme.accent;
    const surface = dark ? "#181818" : theme.surface || "#ffffff";
    const shell = dark ? "#343434" : theme.shell || "#f1f1f1";
    const sidebar = dark ? "#222222" : theme.sidebar || "#fafafa";
    const editor = dark ? "#181818" : theme.editor || "#ffffff";
    const selected = dark ? "#343434" : theme.selected;
    const hover = dark ? "#303030" : "#e9eaec";
    const textSurfaces = [...new Set([shell, sidebar, editor, selected, dark ? "#2c2c2c" : lightHover].flatMap((value) => value.match(/#[0-9a-f]{6}/gi)))];
    const surfaces = [...new Set([...textSurfaces, hover])];
    return {
      accent, selected,
      "on-accent": contrast(accent, "#000000") > contrast(accent, "#ffffff") ? "#000000" : "#ffffff",
      "accent-text": dark ? darkText : lightText, focus: dark ? accent : lightFocus,
      shell, sidebar, editor, surface, surfaces, textSurfaces,
      ink: dark ? "#ececec" : "#20242c", muted: dark ? "#b4b4b4" : "#526071",
      line: dark ? "#404040" : "#dedfe3", hover
    };
  }
  return { contrast, resolve };
})();
