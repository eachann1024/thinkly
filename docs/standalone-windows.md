# Standalone windows

Shared Electron windows for features that used to be in-app dialogs. Image export is not one of these windows. Do not register it and do not edit `src/lib/imageExport` or its UI from this work.

Read this file, then the modules it names. The HTML mockups under `designs/image-export-view/project/` are the layout source for a later pass. They are not imported by the app.

## Kinds

Registered in `electron/main/windows/auxiliary/kinds.ts`. One OS window per kind. Opening the same kind again focuses the existing window and replaces its payload. A modal re-open cancels the previous opener.

| Kind | Default | Minimum | Resizable | Modal child |
| --- | --- | --- | --- | --- |
| `reflection` | 1100×760 | 760×560 | yes | no |
| `recovery-drafts` | 960×680 | 720×480 | yes | no |
| `app-update` | 600×680 | 480×420 | yes | no |
| `ai-setup` | 640×680 | 520×520 | yes | no |
| `fullscreen-preview` | 960×720 | 480×360 | yes | no |
| `notebook-edit` | 560×680 | fixed | no | yes |
| `confirm` | 460×400 | 460×240 | no | yes |
| `selection-quote` | 480×420 | 360×280 | yes | yes |

`confirm` is the shared confirm used by settings reset and settings data confirms. The opener may pass `size` to change the height. Width stays at least 460. Other kinds ignore a size that would go under the minimum. The maximum accepted size is 4000.

`fullscreen-preview` has no single content size in the inventory. 960×720 is the default.

Attachment cleanup (`asset-maintenance.html`) is not a kind. It only uses the shared title bar. Its partition stays `asset-maintenance`.

## Add a view

The renderer entry is `window.html` → `src/window.tsx`. It reads the kind and lazy-loads `src/windows/registry.tsx`.

Replace the placeholder file. Keep the export name. Do not edit the registry.

| Kind | File | Export |
| --- | --- | --- |
| `reflection` | `src/windows/views/ReflectionWindow.tsx` | `ReflectionWindow` |
| `recovery-drafts` | `src/windows/views/RecoveryDraftsWindow.tsx` | `RecoveryDraftsWindow` |
| `app-update` | `src/windows/views/AppUpdateWindow.tsx` | `AppUpdateWindow` |
| `ai-setup` | `src/windows/views/AISetupWindow.tsx` | `AISetupWindow` |
| `fullscreen-preview` | `src/windows/views/FullscreenPreviewWindow.tsx` | `FullscreenPreviewWindow` |
| `notebook-edit` | `src/windows/views/NotebookEditWindow.tsx` | `NotebookEditWindow` |
| `confirm` | `src/windows/views/ConfirmWindow.tsx` | `ConfirmWindow` |
| `selection-quote` | `src/windows/views/SelectionQuoteWindow.tsx` | `SelectionQuoteWindow` |

Render `StandaloneWindowShell` as the root of the view. Put user-facing copy in `i18nYaml` for zh-Hans, en, and ja. The title strings in `kinds.ts` are the OS title before the page loads. Pass the same words to the shell so a language change updates the Window menu.

Do not extend `GooseWindowKind` or the workspace window registry. These windows are not workspace, quick note, or search.

## Open, payload, result

From any renderer that has the preload:

```ts
const response = await window.gooseDesktop.auxiliary.open({
  kind: "confirm",
  payload: { title: "Reset settings" },
  size: { width: 460, height: 360 },
});
```

`payload` is JSON. It must serialize and stay under 2_000_000 characters. There is no shared mutable object.

- A non-modal `open` resolves immediately with `{ status: "opened", requestId, kind }`.
- A modal `open` resolves with `AuxiliaryResult` when the window completes or closes.

Inside the view:

```ts
const { kind, requestId, payload, modal, resizable } = useAuxiliaryWindow();
```

`useAuxiliaryWindow` is in `src/windows/AuxiliaryWindowContext.tsx`. It updates when the opener replaces the payload.

```ts
await completeAuxiliary("confirmed", { values: {} });
await completeAuxiliary("cancelled");
await closeAuxiliary();
```

`completeAuxiliary` settles the opener and closes the window. `closeAuxiliary`, the caption close button, ⌘W / Ctrl+W, and Esc (modal kinds only) settle a modal opener as `cancelled` when nothing completed. Closing a non-modal window does not change the `{ status: "opened" }` result the opener already received.

Esc is not a shortcut for non-modal windows.

## Main-window actions

These leave the standalone window open and bring the main window forward.

```ts
await openPageInMain(pageId);
await openPageInMain(pageId, location);
await openSettingsInMain("ai");
```

`openPageInMain` asks the main window to close settings, then opens the page with `openPageFromSidebar(pageId, "permanent")`. An optional `NoteBlockLocation` is the second argument. The main window uses it the same way a note citation does: open the page, then scroll to and highlight that block. Omit it to open the page only. `openSettingsInMain` opens a settings section. Sections: `appearance`, `general`, `shortcuts`, `local-folder`, `git-sync`, `ai`, `data`, `feedback`.

The main window listens for `goose-note:request-close-settings`. Do not dispatch a new close event.

## Shell

`StandaloneWindowShell` in `src/windows/shell/StandaloneWindowShell.tsx`.

| Prop | Meaning |
| --- | --- |
| `title` | Title-bar name. Required. |
| `context` | Secondary text after the name. |
| `windowTitle` | OS title. Defaults to `title`, or `title — context`. |
| `actions` | Right-hand slot, before the caption buttons. Not draggable. |
| `children` | Body. |
| `inset` | Content card, 8px from the edges. Default `true`. Pass `false` for a title-bar-only window. |
| `maximizable` | Windows/Linux maximize button, and Linux double-click maximize. Default `true`. Pass `resizable` from `useAuxiliaryWindow`. |

The bar is the existing title-bar height (`--electron-titlebar-height`), not a hardcoded 44px. It uses `bg-background`. The card uses `bg-card` and `border-border`. Do not hardcode colors.

macOS uses the hidden system title bar and traffic lights. Windows and Linux use `WinWindowControls`. The title and the empty bar drag the window. Buttons, fields, links, and `[data-electron-no-drag]` do not. Linux uses pointer drag and double-click maximize.

The shell sets `document.title` and `desktop:setTitle`, and reports the bar height so the traffic lights stay centered.

## Data

The window partition is `auxiliary`. It does not share `localStorage` with the main window. Do not call `useSettings.persist.rehydrate()`, `useNotebooks.persist.rehydrate()`, `useReflection.persist.rehydrate()`, `usePages.hydrateFromStorage()`, or `loadPagesFromStorage()`. Rehydrate would load empty defaults and reset the theme. `loadPagesFromStorage()` also deletes expired trash.

Ask the main window instead. The full app bootstrap installs the answerer (`installAuxiliaryMainBridge`).

```ts
const settings = await requestMainSnapshot<SettingsShape>("settings");
```

`useMainSnapshot(key)` is the React form. `{ ok: true, value: null }` is a real empty value. `{ ok: false }` means the main window did not answer. The helper retries a few times, then returns `null`. Each unanswered request waits up to 10 seconds. A payload over 8_000_000 characters fails.

Built-in keys, read from the live main-window stores and stripped to JSON:

| Key | Value |
| --- | --- |
| `settings` | settings state, including API keys |
| `notebooks` | `{ notebooks, activeNotebookId }` |
| `reflection` | reports, schedule, consent, generation status |
| `pages` | the in-memory page map |

Do not log `settings`. Register another key from the main window, not from the standalone view. The provider map lives in the main renderer. Add the reader in `src/windows/data/installAuxiliaryBridge.ts`, or call `registerMainSnapshot(key, read)` from a module that full bootstrap imports. The reader runs when the request arrives.

```ts
registerMainSnapshot("example", () => ({ ready: true }));
```

Appearance, UI font size, and language do not use this snapshot. The window applies `appearance.get()` / `appearance.onChanged` through `applyStandaloneAppearance`, and the preload language bridge updates `createTranslator` live. Do not call `startAppearanceSync()` and do not publish appearance from a standalone window.

`installReadOnlyPersistence` is only for the search window, which uses the default session. It does not see this partition.

## Window behavior

- Background color follows `appearanceBackgroundColor`. These windows do not publish appearance.
- Resizable kinds remember position and size in `userData/auxiliary-window-bounds.json`. Modal kinds always re-center on the main window. A resizable modal still remembers its size. Non-resizable kinds do not restore a stored size.
- Bounds are clamped to the display work area, including on show. Maximized and fullscreen windows are not clamped.
- On macOS a modal is a real modal child. On Windows and Linux the main window is disabled until the modal closes, and the child stays enabled.
- Non-modal windows have no parent, so they can move to another display.
- `window.open` for `http:` and `https:` goes to the system browser. Anything else is denied. Navigation and permission requests are denied. The attachment-cleanup window denies every `window.open`, including http.
- The window is in the OS Window menu because it has a title and is not `skipTaskbar`.
- ⌘W / Ctrl+W closes it. It does not close a workspace tab.

## Files

| Path | Role |
| --- | --- |
| `electron/main/windows/auxiliary/kinds.ts` | Kind table, titles, request parse |
| `electron/main/windows/auxiliary/factory.ts` | `openAuxiliaryWindow` |
| `electron/main/windows/auxiliary/frame.ts` | `attachStandaloneFrame` |
| `electron/main/windows/auxiliary/bounds.ts` | Per-kind bounds file |
| `electron/main/windows/auxiliary/session.ts` | Singleton records and modal results |
| `electron/main/windows/auxiliary/ipc.ts` | IPC registration |
| `electron/preload/auxiliary.ts` | Preload bridge |
| `src/lib/auxiliary-window/contract.ts` | Shared types and channel names |
| `src/window.tsx` | Renderer entry |
| `src/windows/registry.tsx` | Lazy views |
| `src/windows/shell/StandaloneWindowShell.tsx` | Title bar and content card |
| `src/windows/AuxiliaryWindowContext.tsx` | Payload hook and actions |
| `src/windows/data/mainSnapshot.ts` | `requestMainSnapshot`, `registerMainSnapshot` |
| `src/windows/data/installAuxiliaryBridge.ts` | Main-window answerer |

`electron/main/windows.ts` must not re-export this factory. `notifications.ts` imports that barrel.
