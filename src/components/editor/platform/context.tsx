import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { EditorPlatform } from "./types";
import { noopPlatform } from "./noopPlatform";

const EditorPlatformContext = createContext<EditorPlatform>(noopPlatform);

let currentPlatform: EditorPlatform = noopPlatform;

export function getEditorPlatform(): EditorPlatform {
  return currentPlatform;
}

export function EditorPlatformProvider({
  platform,
  children,
}: {
  platform: EditorPlatform;
  children: ReactNode;
}) {
  currentPlatform = platform;

  useEffect(() => {
    currentPlatform = platform;
    return () => {
      currentPlatform = noopPlatform;
    };
  }, [platform]);

  return (
    <EditorPlatformContext.Provider value={platform}>
      {children}
    </EditorPlatformContext.Provider>
  );
}

export function useEditorPlatform(): EditorPlatform {
  return useContext(EditorPlatformContext);
}
