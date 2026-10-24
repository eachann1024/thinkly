export function createChecker() {
  let failed = 0;
  return {
    check(label: string, ok: unknown, detail?: unknown) {
      if (ok) console.log(`  ✓ ${label}`);
      else {
        failed += 1;
        console.log(`  ✗ ${label}`);
        if (detail !== undefined) console.log(`    ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400)}`);
      }
    },
    get failed() { return failed; },
  };
}
