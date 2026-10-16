import type { ReactNode } from 'react';
import { useCurrentFrame } from 'remotion';

/** 遮挡转场的切点：镜头在 Sequence 内第 `from` 帧前保持隐藏。 */
export const Gate = ({ from, children }: { from: number; children: ReactNode }) =>
  useCurrentFrame() < from ? null : <>{children}</>;
