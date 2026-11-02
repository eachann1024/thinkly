import { Activity, createContext, useCallback, useContext, useInsertionEffect, useRef, useState, type ReactNode } from "react";
import type { EditorRuntime } from "./useEditorSession";

type Editor = EditorRuntime["editor"];

// Activity disconnects refs while hidden. BlockNote normally destroys its
// ProseMirror View on ref(null), so give cached editors an explicit owner that
// outlives the Activity effects and releases Views only on actual removal.
function createViewOwner() {
  const retained = new Map<Editor, { release: () => void }>();
  return {
    retain(editor: Editor) {
      const previous = retained.get(editor);
      if (previous) return previous;
      const mount = editor.mount;
      const unmount = editor.unmount;
      let element: HTMLElement | null = null;
      let mountedEditable: boolean | undefined;
      editor.mount = (next: HTMLElement, options?: { portalTarget?: HTMLElement | null }) => {
        if (element === next && mountedEditable === editor.isEditable && !editor.prosemirrorView.isDestroyed) return;
        // Preserve BlockNote's normal remount when editable changes (tabIndex).
        if (element) unmount();
        element = next;
        mountedEditable = editor.isEditable;
        mount(next, options);
      };
      editor.unmount = () => {};
      const lease = {
        release: () => {
          if (!retained.delete(editor)) return;
          editor.mount = mount;
          editor.unmount = unmount;
          element = null;
          unmount();
        },
      };
      retained.set(editor, lease);
      return lease;
    },
    release() {
      for (const lease of retained.values()) lease.release();
    },
  };
}

const ViewOwnerContext = createContext<ReturnType<typeof createViewOwner> | null>(null);

export function useEditorActivityRetention(editor: Editor) {
  const owner = useContext(ViewOwnerContext);
  // Install before DOM refs attach, without retaining abandoned renders.
  // Activity disconnects layout/passive effects, but keeps insertion effects.
  useInsertionEffect(() => {
    const lease = owner?.retain(editor);
    return () => {
      // Let the editor's layout cleanups flush content and save undo history.
      queueMicrotask(() => lease?.release());
    };
  }, [owner, editor]);
}

export function EditorActivity({ visible, children }: { visible: boolean; children: ReactNode }) {
  const [owner] = useState(createViewOwner);
  const root = useRef<HTMLDivElement | null>(null);
  const setRoot = useCallback((node: HTMLDivElement | null) => {
    root.current = node;
    if (!node) queueMicrotask(() => {
      if (!root.current) owner.release();
    });
  }, [owner]);
  return (
    <ViewOwnerContext.Provider value={owner}>
      <div ref={setRoot} className="h-full min-h-0" hidden={!visible} inert={!visible} aria-hidden={!visible}
        style={visible ? undefined : { display: "none" }}>
        <Activity mode={visible ? "visible" : "hidden"}>{children}</Activity>
      </div>
    </ViewOwnerContext.Provider>
  );
}
