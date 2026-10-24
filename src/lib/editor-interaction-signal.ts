let _lastInteractionAt = 0;

export function markUserInteraction(): void {
  _lastInteractionAt = Date.now();
}

export function wasRecentlyInteracting(windowMs = 2000): boolean {
  return Date.now() - _lastInteractionAt < windowMs;
}
