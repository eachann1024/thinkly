import { Folder } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";

export function LocalFolderLoadingSkeleton() {
  return <EmptyState icon={Folder} title="正在读取文件夹" className="px-3 py-3" />;
}
