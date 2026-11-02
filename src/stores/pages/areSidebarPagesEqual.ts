import type { Page } from "@/types";
import { getPageTableSnapshot } from "./pageChanges";
import { sidebarPageSignature } from "./sidebarPageSignature";

const equivalentRevisions = new WeakMap<Record<string, Page>, number>();

export function areSidebarPagesEqual(
  left: Record<string, Page>,
  right: Record<string, Page>,
): boolean {
  if (left === right) return true;
  const leftRevision = getPageTableSnapshot(left)?.sidebarRevision ?? equivalentRevisions.get(left);
  const rightRevision = getPageTableSnapshot(right)?.sidebarRevision;
  if (leftRevision !== undefined && rightRevision !== undefined) {
    return leftRevision === rightRevision;
  }
  // Historical/external tables may predate tracking. No key-array allocations.
  for (const id in left) {
    const a = left[id], b = right[id];
    if (a === b) continue;
    if (!b || sidebarPageSignature(a) !== sidebarPageSignature(b)) return false;
  }
  for (const id in right) if (!(id in left)) return false;
  if (rightRevision !== undefined) equivalentRevisions.set(left, rightRevision);
  return true;
}
