import { windowsProbes, linuxProbes, type AppProbe } from "./appsCatalog";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { resolveCommand, firstExisting, type OpenApp } from "./apps";

function macApplicationRoots(): string[] {
  return ["/Applications", path.join(homedir(), "Applications")];
}

async function listMacApps(): Promise<OpenApp[]> {
  const found = new Map<string, OpenApp>();
  for (const [name, appPath] of [
    ["Finder", "/System/Library/CoreServices/Finder.app"],
    ["Terminal", "/System/Applications/Utilities/Terminal.app"],
  ]) {
    if (existsSync(path.join(appPath, "Contents", "Info.plist"))) {
      found.set(name.toLowerCase(), { name, path: appPath });
    }
  }
  for (const root of macApplicationRoots()) {
    if (!existsSync(root)) continue;
    let entries: string[];
    try {
      entries = await readdir(root);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".app")) continue;
      const appPath = path.join(root, entry);
      if (!existsSync(path.join(appPath, "Contents", "Info.plist"))) continue;
      const name = entry.replace(/\.app$/i, "");
      if (!found.has(name.toLowerCase())) {
        found.set(name.toLowerCase(), { name, path: appPath });
      }
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function listProbedApps(probes: AppProbe[]): OpenApp[] {
  const found = new Map<string, OpenApp>();
  for (const probe of probes) {
    const resolved =
      firstExisting(probe.winPaths) ??
      (probe.commands ?? [])
        .map(resolveCommand)
        .find((value): value is string => Boolean(value)) ??
      null;
    if (!resolved) continue;
    const key = probe.name.toLowerCase();
    if (!found.has(key)) found.set(key, { name: probe.name, path: resolved });
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function enumerateOpenApps(): Promise<OpenApp[]> {
  if (process.platform === "darwin") return listMacApps();
  if (process.platform === "win32") return listProbedApps(windowsProbes());
  return listProbedApps(linuxProbes());
}

let snapshot: { apps: OpenApp[]; expires: number } | undefined;
let pending: Promise<OpenApp[]> | undefined;

/** New installations become visible on the next request after the short snapshot expires. */
export function listOpenApps(): Promise<OpenApp[]> {
  if (snapshot && Date.now() < snapshot.expires)
    return Promise.resolve(snapshot.apps);
  if (pending) return pending;
  pending = enumerateOpenApps()
    .then((apps) => {
      snapshot = { apps, expires: Date.now() + (apps.length ? 30_000 : 3_000) };
      return apps;
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
}
