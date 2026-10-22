/**
 * 浮动窗唤出期间，已隐藏的工作区会被放进一个集合。
 * show 回调见到集合成员会立刻再藏起来。
 * 用户主动聚焦时必须先放开，否则 Dock / 第二实例把窗口拉起来后又藏回去。
 */
export function releaseHeldWorkspace<T extends object>(
  held: { delete(win: T): unknown },
  win: T,
): void {
  held.delete(win);
}
