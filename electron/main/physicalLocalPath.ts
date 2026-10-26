import { lstatSync, realpathSync } from "node:fs";
import path from "node:path";
import { canonicalLocalPath } from "../../src/lib/canonicalLocalPath";

export function physicalLocalPath(target: string): string | null {
  let current = path.resolve(target);
  const missing: string[] = [];
  for (;;) {
    try {
      return canonicalLocalPath(path.join(realpathSync.native(current), ...missing));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return null;
      try {
        lstatSync(current);
        return null;
      } catch (statError) {
        if ((statError as NodeJS.ErrnoException).code !== "ENOENT") return null;
      }
      const parent = path.dirname(current);
      if (parent === current) return null;
      missing.unshift(path.basename(current));
      current = parent;
    }
  }
}
