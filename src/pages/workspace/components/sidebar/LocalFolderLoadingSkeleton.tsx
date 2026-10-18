import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/LocalFolderLoadingSkeleton.tsx#localMessages:1">`
zh-Hans:
  loadingFolder_c7a5: "正在读取文件夹"
en:
  loadingFolder_c7a5: "Loading folder"
ja:
  loadingFolder_c7a5: "フォルダを読み込んでいます"
`;
const uiText = createTranslator(localMessages);
import { SkeletonList } from "@/components/ui/skeleton";

/** 本地文件夹首次读取：以文件树行高的骨架占位，读屏仍播报读取状态。 */
export function LocalFolderLoadingSkeleton() {
  useLocale();
  return <SkeletonList density="compact" lines={1} label={uiText("loadingFolder_c7a5")} className="px-2 py-1" />;
}
