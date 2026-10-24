export function createQuicknoteActivateSuppression(
  ttlMs = 1_500,
  now: () => number = Date.now,
): { mark: () => void; shouldSuppress: () => boolean } {
  let expiresAt = 0;

  return {
    mark: () => {
      expiresAt = now() + ttlMs;
    },
    shouldSuppress: () => expiresAt > now(),
  };
}
