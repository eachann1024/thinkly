// Keep background search maintenance out of the 170 ms workspace entrance animation.
let resumeAt = 0;

export function deferWorkspaceMaintenance(): void {
  resumeAt = performance.now() + 200;
}

export function workspaceMaintenanceDelay(): number {
  return Math.max(0, resumeAt - performance.now());
}
