let resumeAt = 0;

export function deferWorkspaceMaintenance(): void {
  resumeAt = performance.now() + 200;
}

export function workspaceMaintenanceDelay(): number {
  return Math.max(0, resumeAt - performance.now());
}
