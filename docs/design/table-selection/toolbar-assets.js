(() => {
  const D = window.TableDesign;
  D.assetUrls = [];
  const localUrl = (blob) => { const url = URL.createObjectURL(blob); D.assetUrls.push(url); return url; };
  const currentAsset = () => {
    if (D.fileAsset) return D.fileAsset;
    const text = D.stage.querySelector(".file-content")?.textContent || "";
    return { name: D.stage.querySelector("[data-filename]")?.textContent || "说明.txt", type: "text/plain", blob: new Blob([text], { type: "text/plain;charset=utf-8" }), text };
  };
  const mediaPreview = (asset) => {
    const type = asset.type.split("/")[0];
    if (["audio", "video", "image"].includes(type)) {
      const node = document.createElement(type === "image" ? "img" : type);
      node.src = asset.url || localUrl(asset.blob);
      if (type === "image") node.alt = asset.name;
      else { node.controls = true; node.preload = "metadata"; }
      node.className = "attachment-preview"; return node;
    }
    const node = document.createElement("pre");
    node.textContent = asset.text ?? `${asset.name}\n\n此文件可下载，浏览器原型不支持内嵌预览。`;
    return node;
  };
  D.previewSelection = () => {
    const dialog = document.querySelector("#preview-dialog"), body = document.querySelector("#preview-body");
    const kind = D.activeContext(); body.replaceChildren();
    if (kind === "image") {
      const figure = D.selectedBlocks()[0].querySelector("figure").cloneNode(true);
      document.querySelector("#preview-title").textContent = figure.querySelector("svg")?.getAttribute("aria-label") || "图片预览";
      body.append(figure);
    } else if (kind === "file") {
      const asset = currentAsset();
      document.querySelector("#preview-title").textContent = asset.name;
      body.append(mediaPreview(asset));
    }
    dialog.showModal();
  };
  D.downloadSelection = () => {
    const kind = D.activeContext(); let asset;
    if (kind === "image") asset = { name: "湖畔山色.svg", blob: new Blob([D.selectionText()], { type: "image/svg+xml" }) };
    else if (kind === "code") {
      const suffix = { JSON: "json", JavaScript: "js", "Plain Text": "txt" }[D.currentLanguage()] || "txt";
      asset = { name: `preferences.${suffix}`, blob: new Blob([D.selectionText()], { type: "text/plain;charset=utf-8" }) };
    } else asset = currentAsset();
    const link = document.createElement("a"), url = localUrl(asset.blob);
    link.href = url; link.download = asset.name; document.body.append(link); link.click(); link.remove();
    D.toast("已发起下载");
  };
  D.stage.addEventListener("click", event => {
    if (!event.target.closest("#choose-file")) return;
    if (D.state.condition === "readonly") return D.toast("只读内容，无法更换附件");
    D.stage.querySelector("#sample-file-input").click();
  });
  D.stage.addEventListener("change", async event => {
    if (event.target.id !== "sample-file-input") return;
    const file = event.target.files[0]; if (!file) return;
    D.remember();
    const asset = { name: file.name, type: file.type, blob: file, url: localUrl(file) };
    if (file.type.startsWith("text/") || file.type === "application/json") asset.text = await file.slice(0, 12000).text();
    D.fileAsset = asset;
    if (D.state.context !== "file") return;
    D.stage.querySelector("[data-filename]").textContent = asset.name;
    const type = { audio: "音频", video: "视频", image: "图片", text: "文本" }[asset.type.split("/")[0]] || "文件";
    D.stage.querySelector("[data-file-meta]").textContent = `${type}附件 · ${Math.max(1, Math.round(file.size / 1024))} KB`;
    const old = D.stage.querySelector(".file-content, .inline-attachment");
    const node = mediaPreview(asset); node.classList.add("inline-attachment");
    old.replaceWith(node); D.updateToolbar();
  });
  document.querySelector("#preview-dialog").addEventListener("close", () => {
    document.querySelectorAll("#preview-body audio, #preview-body video").forEach(node => node.pause());
    D.focusSelection();
  });
  D.resetAssets = () => {
    D.assetUrls.forEach(url => URL.revokeObjectURL(url)); D.assetUrls = []; D.fileAsset = null;
  };
  window.addEventListener("beforeunload", D.resetAssets);
})();
