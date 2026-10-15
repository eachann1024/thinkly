(() => {
  const D = window.TableDesign, S = D.state;
  const bar = document.querySelector(".toolbar"), slot = document.querySelector(".toolbar-slot");
  const tip = document.querySelector("#toolbar-tooltip");
  D.bar = bar;
  D.actionButton = (key, menu = false) => {
    const def = D.actions[key], disabled = D.disabledReason(key), state = def.toggle ? D.actionState(key) : null;
    const label = D.actionLabel(key);
    let icon = def.icon;
    if (key === "copy" && D.copyStatus === "success") icon = "Check";
    if (key === "copy" && (D.copyStatus === "error" || S.condition === "error")) icon = "WarningCircle";
    const busy = key === "copy" && (D.copyStatus === "busy" || S.condition === "busy");
    const expanded = def.menu && D.popoverOpen === def.menu;
    return `<button type="button" data-tool="${key}" data-priority="${def.priority}" data-group="${def.group}" tabindex="-1"
      aria-label="${D.escape(menu ? label : def.text ? label : def.label)}"
      ${menu ? `role="${def.toggle ? "menuitemcheckbox" : "menuitem"}"` : ""}
      ${state !== null ? `aria-${menu ? "checked" : "pressed"}="${state}"` : ""}
      ${disabled ? `aria-disabled="true" data-reason="${D.escape(disabled)}"` : ""}
      ${def.menu ? `aria-haspopup="${["link", "color", "ai", "alt", "rename"].includes(def.menu) ? "dialog" : "menu"}" aria-expanded="${Boolean(expanded)}" aria-controls="toolbar-popover"` : ""}
      ${busy ? 'aria-busy="true"' : ""} ${state === "mixed" ? 'data-mixed="true"' : ""}>
      ${busy ? '<span class="copy-spinner" aria-hidden="true"></span>' : D.icon(icon)}
      ${menu || ["type", "language"].includes(key) ? `<span class="${menu ? "menu-label" : "tool-label"}">${D.escape(label)}</span>` : ""}
      ${menu && def.shortcut ? `<kbd>${def.shortcut}</kbd>` : ""}
      ${def.menu ? D.icon(menu ? "CaretRight" : "CaretDown") : ""}</button>`;
  };
  D.fitToolbar = () => {
    if (bar.hidden) return;
    const items = [...bar.querySelectorAll("[data-tool]")], more = bar.querySelector("[data-more]");
    items.forEach(button => { button.hidden = false; });
    const groups = [...bar.querySelectorAll(".tool-group")];
    const syncGroups = () => groups.forEach(group => { group.hidden = ![...group.children].some(node => !node.hidden); });
    syncGroups(); more.hidden = !items.some(button => button.hidden);
    const protectedTools = new Set(["type", "language", "copy"]);
    const candidates = items.filter(button => !button.hidden && !protectedTools.has(button.dataset.tool)).sort((a, b) => Number(a.dataset.priority) - Number(b.dataset.priority) || Number(a.dataset.group || 0) - Number(b.dataset.group || 0));
    for (const button of candidates) {
      if (bar.scrollWidth <= bar.clientWidth + 1) break;
      more.hidden = false; button.hidden = true; syncGroups();
    }
    D.overflowActions = items.filter(button => button.hidden).map(button => button.dataset.tool);
    const visible = [...bar.querySelectorAll("button")].filter(button => !button.hidden && !button.closest("[hidden]"));
    visible.forEach(button => { button.tabIndex = -1; });
    const current = visible.find(button => button === document.activeElement) || visible[0];
    if (current) current.tabIndex = 0;
  };
  D.updateToolbar = () => {
    if (!D.bounds) return;
    const has = D.hasSelection();
    slot.dataset.empty = String(!has); bar.hidden = !has;
    document.querySelector(".selection-idle").hidden = has;
    D.syncPreviewState();
    if (!has) { D.closePopover?.(false); return; }
    const focused = bar.contains(document.activeElement) ? document.activeElement.dataset.tool || "more" : null;
    const kind = D.activeContext(), keys = D.contextActions[kind] || D.contextActions.text;
    const groups = [...new Set(keys.map(key => D.actions[key].group))];
    const showLabel = !keys.includes("type") && !keys.includes("language");
    const html = `${S.condition === "readonly" ? `<span class="readonly-mark" title="只读">${D.icon("LockSimple")}</span>` : ""}
      ${showLabel && ["grid", "mixed", "file"].includes(kind) ? `<span class="selection-label" title="${D.escape(D.contextLabel())}">${D.escape(D.contextLabel())}</span>` : ""}
      ${groups.map(group => `<div class="tool-group" data-group="${group}">${keys.filter(key => D.actions[key].group === group).map(key => D.actionButton(key)).join("")}</div>`).join("")}
      <button type="button" data-more aria-label="更多操作" aria-haspopup="menu" aria-expanded="${D.popoverOpen === "more"}" aria-controls="toolbar-popover" tabindex="-1">${D.icon("DotsThree")}</button>`;
    if (bar.dataset.content !== html) { bar.innerHTML = html; bar.dataset.content = html; }
    bar.dataset.context = kind; bar.dataset.inactive = String(S.inactive);
    D.fitToolbar();
    if (focused && !D.popoverOpen) {
      const next = focused === "more" ? bar.querySelector("[data-more]") : bar.querySelector(`[data-tool="${focused}"]`);
      (next && !next.hidden ? next : bar.querySelector("[data-more]"))?.focus({ preventScroll: true });
    }
    const live = document.querySelector("#toolbar-live");
    const status = `${D.contextLabel()}${S.condition === "readonly" ? "，只读" : ""}`;
    if (live.textContent !== status) live.textContent = status;
  };
  D.focusSelection = () => {
    if (D.savedRange?.startContainer.isConnected) { D.restoreRange(); return; }
    const target = D.isTable() ? D.table.querySelector(".active-cell") || D.table.querySelector("td") : D.selectedBlocks()[0] || D.stage;
    target?.focus({ preventScroll: true });
  };
  D.clearSelection = () => {
    D.closePopover(false); D.clearNativeRange(); D.nativeTarget = null;
    if (D.isTable()) D.select(null);
    else { S.sampleSelected = false; D.updateToolbar(); }
    document.querySelector("#selection-state").value = "empty";
    D.focusSelection();
  };
  D.hideTooltip = () => { clearTimeout(D.tipTimer); tip.hidden = true; };
  const tooltip = (button, immediate = false) => {
    D.hideTooltip();
    if (D.popoverOpen || !button) return;
    D.tipTimer = setTimeout(() => {
      const def = D.actions[button.dataset.tool];
      tip.innerHTML = `${D.escape(button.dataset.reason || def?.label || "更多操作")}${def?.shortcut ? `<kbd>${def.shortcut}</kbd>` : ""}${button.dataset.mixed ? '<span>部分选中</span>' : ""}`;
      tip.hidden = false;
      const rect = button.getBoundingClientRect(), box = tip.getBoundingClientRect();
      tip.style.left = `${Math.max(8, Math.min(innerWidth - box.width - 8, rect.left + (rect.width - box.width) / 2))}px`;
      tip.style.top = `${rect.top > box.height + 16 ? rect.top - box.height - 8 : rect.bottom + 8}px`;
    }, immediate ? 100 : 450);
  };
  bar.addEventListener("pointerdown", event => {
    if (event.target.closest("button") && event.button === 0) event.preventDefault();
    D.hideTooltip();
  });
  bar.addEventListener("click", event => {
    const button = event.target.closest("button"); if (!button) return;
    if (button.matches("[data-more]")) return D.openPopover("more", button);
    const key = button.dataset.tool; if (!key) return;
    if (D.disabledReason(key)) { D.toast(D.disabledReason(key)); return; }
    if (D.actions[key].menu) D.openPopover(D.actions[key].menu, button);
    else { D.closePopover(false); D.runAction(key); }
  });
  bar.addEventListener("pointerover", event => tooltip(event.target.closest("button")));
  bar.addEventListener("pointerout", D.hideTooltip);
  bar.addEventListener("focusin", event => tooltip(event.target.closest("button"), true));
  bar.addEventListener("focusout", D.hideTooltip);
  bar.addEventListener("keydown", event => {
    const buttons = [...bar.querySelectorAll("button")].filter(button => !button.hidden && !button.closest("[hidden]"));
    const index = buttons.indexOf(document.activeElement);
    const moves = { ArrowRight: (index + 1) % buttons.length, ArrowLeft: (index + buttons.length - 1) % buttons.length, Home: 0, End: buttons.length - 1 };
    if (Object.hasOwn(moves, event.key)) {
      event.preventDefault(); buttons.forEach(button => { button.tabIndex = -1; });
      buttons[moves[event.key]].tabIndex = 0; buttons[moves[event.key]].focus();
    } else if (event.key === "ArrowDown" && document.activeElement.hasAttribute("aria-haspopup")) {
      event.preventDefault(); document.activeElement.click();
    }
  });
  document.addEventListener("keydown", event => {
    if (document.querySelector("dialog[open]") || event.target.matches("input,textarea")) return;
    if (event.altKey && event.key === "F10" && D.hasSelection()) {
      event.preventDefault(); bar.querySelector('button[tabindex="0"]')?.focus(); return;
    }
    if (event.key === "Escape" && !D.popoverOpen && (bar.contains(event.target) || D.stage.contains(event.target))) {
      event.preventDefault(); D.clearSelection();
    }
    if (!(event.metaKey || event.ctrlKey) || !D.hasSelection() || !document.querySelector(".document").contains(event.target)) return;
    const key = { b: "bold", i: "italic", u: "underline", k: "link", c: "copy" }[event.key.toLowerCase()];
    if (key && (D.contextActions[D.activeContext()] || []).includes(key)) {
      if (key === "copy" && D.isTable()) return;
      event.preventDefault();
      if (D.disabledReason(key)) return D.toast(D.disabledReason(key));
      if (D.actions[key].menu) D.openPopover(D.actions[key].menu, bar.querySelector(`[data-tool="${key}"]:not([hidden])`) || bar.querySelector("[data-more]"));
      else D.runAction(key);
    }
  });
  new ResizeObserver(() => { D.closePopover?.(false); D.fitToolbar(); }).observe(slot);
})();
