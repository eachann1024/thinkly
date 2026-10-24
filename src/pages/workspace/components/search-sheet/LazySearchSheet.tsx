import { Suspense, lazy, useState } from "react";
import { useSearchSession } from "../sidebar/useSearchSession";

const SearchSheet = lazy(() =>
  import("./SearchSheet").then((mod) => ({ default: mod.SearchSheet })),
);

export function LazySearchSheet(props: { aiNotebookId: string | null }) {
  const open = useSearchSession((state) => state.view.phase !== "closed");
  const [everOpened, setEverOpened] = useState(false);
  if (open && !everOpened) setEverOpened(true);
  if (!everOpened) return null;
  return (
    <Suspense fallback={null}>
      <SearchSheet {...props} />
    </Suspense>
  );
}
