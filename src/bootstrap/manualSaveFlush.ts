export function runManualSaveFlush(
  flush: () => Promise<void>,
  clearFailureNotice: () => Promise<void>,
  reportFailure: (error: unknown) => void,
): void {
  void flush().then(clearFailureNotice).catch(reportFailure);
}
