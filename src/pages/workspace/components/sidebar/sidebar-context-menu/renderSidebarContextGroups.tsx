import type { useSidebarContextMenu } from "./useSidebarContextMenu";
import { buildSidebarCreateGroups } from "./groups/buildSidebarCreateGroups";
import { appendSidebarOpenMoveGroups } from "./groups/appendSidebarOpenMoveGroups";
import { appendSidebarDeleteGroups } from "./groups/appendSidebarDeleteGroups";

export function renderSidebarContextGroups(
  argument: ReturnType<typeof useSidebarContextMenu>,
) {
  const sidebarCreateGroupsContext = buildSidebarCreateGroups(argument);
  const sidebarOpenMoveGroupsContext = appendSidebarOpenMoveGroups(
    sidebarCreateGroupsContext,
  );
  const sidebarDeleteGroupsContext = appendSidebarDeleteGroups(
    sidebarOpenMoveGroupsContext,
  );
  const context = sidebarDeleteGroupsContext;
  const { sections } = context;

  return sections;
}
