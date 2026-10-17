import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/LocalFolderLoadingSkeleton.tsx#localMessages:1">`
zh-Hans:
  loadingFolder_c7a5: "正在读取文件夹"
en:
  loadingFolder_c7a5: "Loading folder"
`;
const uiText = createTranslator(localMessages);
import { Folder } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";

export function LocalFolderLoadingSkeleton() {
  useLocale();
  return <EmptyState icon={Folder} title={uiText("loadingFolder_c7a5")} className="px-3 py-3" />;
}
