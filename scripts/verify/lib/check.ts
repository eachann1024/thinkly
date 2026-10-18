/** 验收脚本共用的断言：只打印结果，不抛错，最后返回失败数。 */
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
