import { ensureReflection, type ReflectionData } from "./reflectionRunner";
import type { ReflectionScope } from "./scopeRange";

export interface ReflectionAction {
  type: "ensure" | "refresh";
  scope: ReflectionScope;
  requestId: string;
  data?: ReflectionData;
}

export function reflectionAction(type: ReflectionAction["type"], scope: ReflectionScope, data?: ReflectionData): ReflectionAction {
  return { type, scope, requestId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, data };
}
