import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

export const marker = "Cloud preview: saved through the real editor.";
const editorSelector = '.bn-editor[contenteditable="true"]';

export async function waitUntil(read, description, timeout = 20_000) {
  const until = Date.now() + timeout;
  do {
    if (await read()) return;
    await delay(200);
  } while (Date.now() < until);
  throw new Error(`Timed out: ${description}`);
}

export async function openNote(page, step, shot) {
  await page.locator(`${editorSelector}, [aria-label="设置引导"]`).first().waitFor();
  if (await page.getByRole("main", { name: "设置引导" }).isVisible()) {
    await shot("setup", "Fresh profile: setup guide");
    await step("Exit setup using its normal button", () =>
      page.getByRole("button", { name: "退出引导", exact: true }).click());
  }
  await page.locator(editorSelector).waitFor();
  await page.locator(editorSelector).getByText("Cloud preview", { exact: true }).waitFor();
}

export async function editNote(page, note, step, shot) {
  await shot("opened", "Markdown opened through the desktop file association");
  await step("Append a paragraph using the editor", async () => {
    await page.locator(editorSelector).click();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.insertText(marker);
    await page.locator(editorSelector).getByText(marker, { exact: true }).waitFor();
  });
  await step("Observe the paragraph written to the Markdown file", () =>
    waitUntil(async () => (await readFile(note, "utf8")).includes(marker), "Markdown save"));
  await shot("saved", "Paragraph is visible and its Markdown file has been saved");
}

export async function settings(page, step, shot) {
  await step("Open settings from the sidebar", () =>
    page.getByRole("button", { name: "设置", exact: true }).click());
  const navigation = page.locator('[data-settings-navigation]:visible');
  for (const [label, tab] of [["通用", "general"], ["外观与主题", "appearance"]]) {
    await step(`Open settings: ${tab}`, async () => {
      await navigation.getByRole("button", { name: label, exact: true }).click();
      await page.locator(`[data-settings-tab="${tab}"]:visible`).waitFor();
    });
    await shot(`settings-${tab}`, `Settings: ${tab}`);
  }
  await step("Close settings", () =>
    page.getByRole("button", { name: "关闭设置", exact: true }).click());
}

export function validateSteps(steps) {
  if (!Array.isArray(steps) || steps.length > 40) throw new Error("Invalid preview steps");
  const actions = new Set(["click", "fill", "press", "waitFor", "shot"]);
  for (const item of steps) {
    if (!item || !actions.has(item.action)) throw new Error("Unknown preview action");
    if (item.action !== "shot" && typeof item.selector !== "string") throw new Error("Missing selector");
    for (const value of Object.values(item)) {
      if (typeof value !== "string" || value.length > 2000) throw new Error("Invalid action value");
    }
    if (item.action === "fill" && typeof item.value !== "string") throw new Error("Missing fill value");
    if (item.action === "press" && typeof item.key !== "string") throw new Error("Missing key");
  }
}

export async function extraSteps(page, steps, step, shot) {
  validateSteps(steps);
  for (const [i, item] of steps.entries()) {
    if (item.action === "shot") {
      await shot(`extra-${i + 1}`, item.caption || `Additional scene ${i + 1}`);
      continue;
    }
    await step(item.caption || `${item.action}: ${item.selector}`, async () => {
      const target = page.locator(item.selector);
      if (item.action === "click") await target.click();
      else if (item.action === "fill") await target.fill(item.value);
      else if (item.action === "press") await target.press(item.key);
      else await target.waitFor({ state: "visible" });
    });
  }
}
