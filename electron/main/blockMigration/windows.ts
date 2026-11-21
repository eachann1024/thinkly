import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const UNINSTALL_KEY = "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Block";
const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

async function registryLocation(view: "/reg:64" | "/reg:32"): Promise<string | null> {
  try {
    const { stdout } = await exec("reg.exe", ["query", UNINSTALL_KEY, "/v", "InstallLocation", view], { windowsHide: true });
    const match = /InstallLocation\s+REG_\w+\s+(.+)/.exec(stdout);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

async function findBlockExe(): Promise<string | null> {
  const locations = [await registryLocation("/reg:64"), await registryLocation("/reg:32"),
    process.env.ProgramW6432 ? path.join(process.env.ProgramW6432, "Block") : null,
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "Block") : null];
  for (const location of locations) {
    const exe = location ? path.join(location, "block.exe") : "";
    if (exe && existsSync(exe)) return exe;
  }
  return null;
}

function powershell(script: string): Promise<{ stdout: string }> {
  return exec("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { windowsHide: true, timeout: 10 * 60_000 });
}

async function runInstaller(setup: string): Promise<void> {
  const { stdout } = await powershell(
    `$p = Start-Process -FilePath ${quote(setup)} -ArgumentList '/S' -Verb RunAs -Wait -PassThru; exit $p.ExitCode`);
  if (stdout.trim()) console.info("[block-migration]", stdout.trim());
}

function scheduleThinklyUninstall(): void {
  const uninstaller = path.join(path.dirname(process.execPath), "Uninstall Thinkly.exe");
  if (!existsSync(uninstaller)) return;
  const script = `Wait-Process -Id ${process.pid} -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2; ` +
    `Start-Process -FilePath ${quote(uninstaller)} -ArgumentList '/S'`;
  spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-Command", script],
    { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

export async function installBlockWindows(setup: string, prepare: () => void): Promise<void> {
  let exe = await findBlockExe();
  if (!exe) {
    await runInstaller(setup);
    exe = await findBlockExe();
  }
  if (!exe) throw new Error("Block was not installed");
  prepare();
  spawn(exe, [], { detached: true, stdio: "ignore", cwd: path.dirname(exe) }).unref();
  scheduleThinklyUninstall();
}
