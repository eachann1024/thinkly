import { Component, createRef, type ReactNode } from "react";

type Props = {
  notebookId: string | null;
  expandedIds: string[];
  dragging: boolean;
  children: ReactNode;
};
type RowPosition = { top: number; opacity: string };
type Snapshot = Map<HTMLElement, RowPosition> | null;

const DURATION = 150;
const EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

// FLIP only the viewport's rows. There is no animation loop or animated layout:
// read before the commit, read the final layout, then let the compositor move it.
export class MainTreeMotion extends Component<Props> {
  private root = createRef<HTMLDivElement>();
  private animations = new Map<HTMLElement, Animation>();
  private reducedMotion: MediaQueryList | null = null;
  private scrollContainer: HTMLElement | null = null;

  componentDidMount() {
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion.addEventListener("change", this.cancelAnimations);
    this.scrollContainer = this.root.current?.parentElement ?? null;
    this.scrollContainer?.addEventListener("scroll", this.cancelAnimations, { passive: true });
  }

  componentWillUnmount() {
    this.cancelAnimations();
    this.reducedMotion?.removeEventListener("change", this.cancelAnimations);
    this.scrollContainer?.removeEventListener("scroll", this.cancelAnimations);
  }

  private cancelAnimations = () => {
    for (const animation of this.animations.values()) animation.cancel();
    this.animations.clear();
  };

  private visibleRows(): [HTMLElement, DOMRect][] {
    const root = this.root.current;
    const viewport = this.scrollContainer?.getBoundingClientRect();
    if (!root || !viewport) return [];
    const visible: [HTMLElement, DOMRect][] = [];
    for (const row of root.querySelectorAll<HTMLElement>(".main-tree-row")) {
      const rect = row.getBoundingClientRect();
      if (rect.bottom > viewport.top && rect.top < viewport.bottom) {
        visible.push([row, rect]);
      }
      // Rows remain in DOM order; skip the potentially large offscreen subtree.
      if (rect.top >= viewport.bottom && !this.animations.size) break;
    }
    return visible;
  }

  getSnapshotBeforeUpdate(previous: Props): Snapshot {
    if (previous.notebookId !== this.props.notebookId || this.props.dragging ||
      this.reducedMotion?.matches || previous.expandedIds === this.props.expandedIds) {
      return null;
    }
    return new Map(this.visibleRows().map(([row, rect]) => [row, {
      top: rect.top,
      // Read the current visual position/opacity before cancelling an interrupted
      // animation, so rapid reversals continue from what the user actually sees.
      opacity: this.animations.has(row) ? getComputedStyle(row).opacity : "1",
    }]));
  }

  componentDidUpdate(previous: Props, _state: unknown, snapshot: Snapshot) {
    if (previous.notebookId !== this.props.notebookId || this.props.dragging) {
      this.cancelAnimations();
      return;
    }
    if (!snapshot) return;
    this.cancelAnimations();
    // Complete every geometry read before starting any animation.
    const rows = this.visibleRows();
    for (const [row, rect] of rows) {
      const before = snapshot.get(row);
      const delta = before ? before.top - rect.top : -4;
      if (before && Math.abs(delta) < 0.5 && before.opacity === "1") continue;
      const animation = row.animate([
        { transform: `translateY(${delta}px)`, opacity: before?.opacity ?? "0" },
        { transform: "translateY(0px)", opacity: "1" },
      ], { duration: DURATION, easing: EASING, fill: "both" });
      this.animations.set(row, animation);
      animation.onfinish = () => {
        if (this.animations.get(row) === animation) {
          this.animations.delete(row);
          animation.cancel();
        }
      };
    }
  }

  render() {
    return <div ref={this.root} className="contents">{this.props.children}</div>;
  }
}
