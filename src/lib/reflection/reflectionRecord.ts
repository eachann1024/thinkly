import { REFLECTION_SCOPES, type ReflectionScope } from "./scopeRange";

export type ReflectionRecordStatus = "ready" | "loading" | "unavailable";

export interface ReflectionRecordQuery {
  scope: ReflectionScope;
  requestId: string;
}

export function reflectionRecordQuery(scope: ReflectionScope): ReflectionRecordQuery {
  return { scope, requestId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` };
}

export function parseReflectionRecordQuery(detail: unknown): ReflectionRecordQuery | null {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;
  const raw = detail as Partial<ReflectionRecordQuery>;
  if (!REFLECTION_SCOPES.includes(raw.scope as ReflectionScope)) return null;
  if (typeof raw.requestId !== "string" || raw.requestId.length < 1 || raw.requestId.length > 80) return null;
  return { scope: raw.scope as ReflectionScope, requestId: raw.requestId };
}
