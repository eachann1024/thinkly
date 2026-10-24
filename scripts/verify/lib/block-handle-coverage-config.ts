type Env = Record<string, string | undefined>;
type PriorCheck = { name: string; passed: boolean };
const sequenceTypes = ["image", "codeBlock", "file", "table"];

export function latestCoverageChecks(proofs: { checks: PriorCheck[]; modifiedAt: number }[]) {
  return proofs.reduce<{ checks: PriorCheck[]; modifiedAt: number } | undefined>(
    (latest, proof) => !latest || proof.modifiedAt > latest.modifiedAt ? proof : latest,
    undefined,
  )?.checks ?? [];
}

export function blockHandleCoverageConfig(env: Env, priorChecks: PriorCheck[] = []) {
  const scope = env.THINKLY_EGO_COVERAGE_SCOPE ?? "all";
  if (!["all", "sequence", "failed-sequence"].includes(scope)) throw new Error(`未知覆盖范围：${scope}`);
  const sequenceCases = sequenceTypes.map((type) => ({ type, steady: true, cancel: true }));
  if (scope === "failed-sequence") {
    for (const item of sequenceCases) {
      const failures = priorChecks.filter((check) => !check.passed && check.name.startsWith(`${item.type} `));
      const incomplete = failures.some((check) => check.name.includes("工具栏实际悬停流程完成"));
      item.steady = incomplete || failures.some((check) => check.name.includes("200ms"));
      item.cancel = incomplete || failures.some((check) => check.name.includes("快速离开"));
    }
    if (!sequenceCases.some((item) => item.steady || item.cancel)) throw new Error("最新证据中没有失败的时序项");
  }
  return {
    task: env.THINKLY_EGO_TASK, page: env.THINKLY_EGO_PAGE, origin: env.THINKLY_EGO_ORIGIN,
    scope, sequenceCases: sequenceCases.filter((item) => item.steady || item.cancel),
    proofPath: scope === "all" ? "/tmp/thinkly-block-handles-coverage.json" : "/tmp/thinkly-block-handles-coverage-sequence.json",
  };
}
