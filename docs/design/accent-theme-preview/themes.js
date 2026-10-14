/* Source: src/lib/accentColor.ts. Dark values restore theme CSS candidates, not current runtime. */
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
  const rgb = (hex) => hex.replace("#", "").match(/.{2}/g).map((x) => parseInt(x, 16));
  function luminance(hex) {
    return rgb(hex).map((x) => x / 255).map((x) => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((n, x, i) => n + x * [.2126, .7152, .0722][i], 0);
  }
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
  function mix(a, b, amount) {
    const end = rgb(b);
    return "#" + rgb(a).map((x, i) => Math.round(x + (end[i] - x) * amount).toString(16).padStart(2, "0")).join("");
  }
  function readableAccent(accent, surfaces, target) {
    const end = luminance(surfaces[0]) < .2 ? "#ffffff" : "#000000";
    for (let i = 0; i <= 100; i++) {
      const candidate = mix(accent, end, i / 100);
      if (surfaces.every((surface) => contrast(candidate, surface) >= target)) return candidate;
    }
    return end;
  }
  function resolve(theme, dark) {
    const accent = dark ? theme.dark : theme.accent;
    const surface = dark ? "#181818" : theme.surface || "#ffffff";
    const shell = dark ? "#343434" : theme.shell || "#f1f1f1";
    const sidebar = dark ? "#222222" : theme.sidebar || "#fafafa";
    const editor = dark ? "#181818" : theme.editor || "#ffffff";
    const surfaces = [...new Set([shell, sidebar, editor].flatMap((value) => value.match(/#[0-9a-f]{6}/gi)))];
    return {
      accent, selected: dark ? "#343434" : theme.selected,
      "on-accent": contrast(accent, "#000000") > contrast(accent, "#ffffff") ? "#000000" : "#ffffff",
      "accent-text": readableAccent(accent, surfaces, 4.6), focus: readableAccent(accent, surfaces, 3.1),
      shell, sidebar, editor, surface, surfaces,
      ink: dark ? "#ececec" : "#20242c", muted: dark ? "#b4b4b4" : "#526071",
      line: dark ? "#404040" : "#dedfe3", hover: dark ? "#303030" : "#e9eaec"
    };
  }
  return { contrast, resolve };
})();
