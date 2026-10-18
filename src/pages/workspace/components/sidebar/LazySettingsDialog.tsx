import { Suspense, lazy, useState } from "react";
import type { SettingsDialogProps } from "./settings-dialog/shared";

const SettingsDialog = lazy(() =>
  import("./SettingsDialog").then((mod) => ({ default: mod.SettingsDialog })),
);

/**
 * 设置面板的懒加载门：面板带着 WebDAV 客户端、导入导出与备份恢复约 130KB，
 * 普通记录笔记时用不到。首次打开后再常驻挂载，之后的开关行为与原来一致。
 */
export function LazySettingsDialog(props: SettingsDialogProps) {
  const [everOpened, setEverOpened] = useState(props.open);
  if (props.open && !everOpened) setEverOpened(true);
  if (!everOpened) return null;
  return (
    <Suspense fallback={null}>
      <SettingsDialog {...props} />
    </Suspense>
  );
}
