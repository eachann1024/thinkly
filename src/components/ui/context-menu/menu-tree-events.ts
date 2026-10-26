type MenuOpenEvent = { nodeId: string | undefined; parentId: string | null };
type MenuEvents = {
  on: (name: string, listener: (event: MenuOpenEvent) => void) => void;
  off: (name: string, listener: (event: MenuOpenEvent) => void) => void;
};

export function subscribeToSiblingMenus(events: MenuEvents, own: MenuOpenEvent, close: () => void) {
  const onOpen = (event: MenuOpenEvent) => {
    if (event.nodeId !== own.nodeId && event.parentId === own.parentId) close();
  };
  events.on("menuopen", onOpen);
  return () => events.off("menuopen", onOpen);
}
