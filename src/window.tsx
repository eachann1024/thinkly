import "./index.css";
import "./fonts.css";
import { installElectronChrome } from "@/windows/chrome";

installElectronChrome();

import { Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n/core";
import type { AuxiliaryWindowState } from "@/lib/auxiliary-window/contract";
import { applyStandaloneAppearance } from "@/windows/appearance";
import { AuxiliaryWindowProvider } from "@/windows/AuxiliaryWindowContext";
import { AUXILIARY_VIEWS } from "@/windows/registry";

const text = createTranslator(i18nYaml<"src/window.tsx#block1:1">`
zh-Hans:
  unavailable: "无法打开这个窗口。"
en:
  unavailable: "This window can’t be opened."
ja:
  unavailable: "このウィンドウを開けません。"
`);

function AuxiliaryApp({ initial }: { initial: AuxiliaryWindowState | null }) {
  useLocale();
  const [state, setState] = useState(initial);
  useEffect(() => window.gooseDesktop?.auxiliary?.onPayload(setState), []);
  if (!state) {
    return <p className="p-6 text-sm text-muted-foreground">{text("unavailable")}</p>;
  }
  const View = AUXILIARY_VIEWS[state.kind];
  return (
    <AuxiliaryWindowProvider value={state}>
      <Suspense fallback={null}>
        <View />
      </Suspense>
    </AuxiliaryWindowProvider>
  );
}

async function start() {
  const appearance = window.gooseDesktop?.appearance;
  try {
    const snapshot = await appearance?.get();
    if (snapshot) applyStandaloneAppearance(snapshot);
  } catch {
    // The shell still paints with the default theme tokens.
  }
  appearance?.onChanged(applyStandaloneAppearance);
  const state = (await window.gooseDesktop?.auxiliary?.get().catch(() => null)) ?? null;
  const root = document.getElementById("root");
  if (!root) return;
  createRoot(root).render(<AuxiliaryApp initial={state} />);
}

void start();
