import { Component, createRef, type ReactNode } from "react";

type TreeBranchProps = {
  expanded: boolean;
  onReturnFocus: () => void;
  children: ReactNode;
};

// Capture focus before React removes the descendants, then return it to the folder.
// Branches enter/leave layout in one commit, without measuring every tree row.
export class TreeBranch extends Component<TreeBranchProps> {
  private root = createRef<HTMLDivElement>();
  private mounted = false;

  componentDidMount() {
    this.mounted = true;
  }
  getSnapshotBeforeUpdate(previous: TreeBranchProps) {
    return previous.expanded && !this.props.expanded &&
      !!this.root.current?.contains(document.activeElement);
  }
  componentDidUpdate(_previous: TreeBranchProps, _state: unknown, hadFocus: boolean) {
    if (hadFocus) this.props.onReturnFocus();
  }
  render() {
    return this.props.expanded ? (
      <div ref={this.root} className="goose-tree-branch" data-entering={this.mounted || undefined}>
        {this.props.children}
      </div>
    ) : null;
  }
}
