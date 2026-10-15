import { _electron as electron } from "playwright";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { editNote, extraSteps, marker, openNote, settings, validateSteps } from "./scenes.mjs";

if (process.platform !== "linux") throw new Error("Use a disposable Linux runner for desktop recording");
const source = resolve(process.argv[2]);
const out = resolve(process.argv[3]);
const work = await mkdtemp(join(tmpdir(), "goose-ui-preview-"));
const input = JSON.parse(await readFile(process.env.PREVIEW_INPUT, "utf8"));
validateSteps(input.steps);
const note = join(work, "notes", "Cloud preview.md");
await mkdir(join(work, "notes"), { recursive: true });
await mkdir(out, { recursive: true });
await writeFile(note, "# Cloud preview\n\nThis note exists only on the disposable preview machine.\n");
const manifest = {
  sha: process.env.SOURCE_SHA,
  variant: process.env.PREVIEW_VARIANT,
  platform: "Linux / Electron",
  flow: "incomplete",
  steps: [],
  screenshots: [],
  errors: [],
  notCovered: [
    "macOS and Windows native behavior, global hotkeys, real accounts and external services",
    "Changed feature behavior outside the recorded steps; screenshots require human review",
  ],
};
const persist = () => writeFile(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
let app;
let page;

async function step(name, action) {
  const entry = { name, status: "running" };
  manifest.steps.push(entry);
  await persist();
  try {
    await action();
    entry.status = "completed";
  } catch (error) {
    entry.status = "failed";
    entry.error = error.message;
    throw error;
  } finally {
    await persist();
  }
}

async function shot(name, caption) {
  const file = `${String(manifest.screenshots.length + 1).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: join(out, file), animations: "disabled" });
  manifest.screenshots.push({ file, caption });
  await persist();
}

async function launch() {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    /^(PATH|DISPLAY|LANG|LC_.*|LD_LIBRARY_PATH|XAUTHORITY|DBUS_SESSION_BUS_ADDRESS)$/.test(key)));
  Object.assign(env, {
    HOME: join(work, "home"), XDG_CONFIG_HOME: join(work, "config"),
    XDG_CACHE_HOME: join(work, "cache"), XDG_DATA_HOME: join(work, "data"),
    XDG_STATE_HOME: join(work, "state"),
  });
  await Promise.all(Object.values(env).filter((value) => value.startsWith(work))
    .map((dir) => mkdir(dir, { recursive: true })));
  app = await electron.launch({
    executablePath: join(source, "node_modules/electron/dist/electron"),
    args: [`--user-data-dir=${join(work, "profile")}`, join(source, "dist-electron/app-pack"), note],
    cwd: source,
    env,
    locale: "zh-CN",
    colorScheme: "light",
    timeout: 40_000,
  });
  app.process().stdout?.on("data", (chunk) => appendFileSync(join(out, "electron.log"), chunk));
  app.process().stderr?.on("data", (chunk) => appendFileSync(join(out, "electron.log"), chunk));
  page = await app.firstWindow({ timeout: 40_000 });
  page.setDefaultTimeout(20_000);
  page.on("pageerror", (error) => manifest.errors.push(error.message));
  const window = await app.browserWindow(page);
  await window.evaluate((win) => { win.setSize(1280, 800); win.show(); });
  await openNote(page, step, shot);
}

try {
  await step("Launch the built Electron app with an isolated profile and temporary note", launch);
  await editNote(page, note, step, shot);
  await step("Quit the app and reopen the same note and profile", async () => {
    await app.close();
    app = null;
    await launch();
    await page.locator('.bn-editor[contenteditable="true"]').getByText(marker, { exact: true }).waitFor();
  });
  await shot("reopened", "Saved paragraph is visible after restarting the real desktop app");
  await settings(page, step, shot);
  await extraSteps(page, input.steps, step, shot);
  if (manifest.errors.length) throw new Error("Renderer errors were recorded; review electron.log and manifest.json");
  manifest.flow = "completed";
} catch (error) {
  manifest.flow = "failed";
  manifest.errors.push(error.message);
  if (page && !page.isClosed()) {
    await shot("failure", "State at the failed step").catch(() => {});
  }
  process.exitCode = 1;
} finally {
  if (app) await app.close().catch((error) => {
    manifest.flow = "failed";
    manifest.errors.push(`Shutdown: ${error.message}`);
    process.exitCode = 1;
  });
  await persist();
}
