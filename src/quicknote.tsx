import { bootstrap } from "./main";
import { useQuickNote } from "./stores/useQuickNote";
import { QuickNoteApp } from "./pages/quick-note/QuickNoteApp";
import "./pages/quick-note/quicknote.css";
import "./pages/quick-note/quicknote-save-status.css";

void bootstrap(() => <QuickNoteApp />, {
  mode: "lean",
  beforeInit: () => useQuickNote.persist.rehydrate(),
});
