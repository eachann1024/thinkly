import type { CSSProperties, PointerEventHandler, ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SidebarRailItem } from "@/stores/settings/slices/sidebarRailSlice";

// 只沿轨道竖向移动，且不拖出图标区。
const lockToRail: Modifier = ({ transform, draggingNodeRect, containerNodeRect }) => {
  let y = transform.y;
  if (draggingNodeRect && containerNodeRect) {
    const min = containerNodeRect.top - draggingNodeRect.top;
    const max = containerNodeRect.bottom - draggingNodeRect.bottom;
    y = Math.min(Math.max(y, min), Math.max(min, max));
  }
  return { ...transform, x: 0, y };
};

export function SidebarRailSortableList({
  order,
  visible,
  onOrderChange,
  children,
}: {
  order: SidebarRailItem[];
  visible: SidebarRailItem[];
  onOrderChange: (order: SidebarRailItem[]) => void;
  children: ReactNode;
}) {
  // 移动超过阈值才进入拖拽；拖拽激活后 dnd-kit 会吞掉松手时的 click。
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    // 在完整顺序上移动，隐藏中的入口保持原位。
    const from = order.indexOf(active.id as SidebarRailItem);
    const to = order.indexOf(over.id as SidebarRailItem);
    if (from < 0 || to < 0) return;
    onOrderChange(arrayMove(order, from, to));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[lockToRail]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={visible} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function useSidebarRailSortable(id: SidebarRailItem) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  return {
    setNodeRef,
    style,
    isDragging,
    onPointerDown: listeners?.onPointerDown as PointerEventHandler<HTMLButtonElement> | undefined,
  };
}
