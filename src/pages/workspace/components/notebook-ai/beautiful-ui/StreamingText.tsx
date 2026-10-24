import type { ReactNode } from "react";

export function StreamingText({
  streaming,
  children,
}: {
  streaming: boolean;
  children: ReactNode;
}) {
  return (
    <div className="bui-streaming" data-streaming={streaming ? "true" : "false"}>
      <span className="bui-stream-tail">{children}</span>
      {streaming ? <span className="bui-stream-caret" aria-hidden /> : null}
    </div>
  );
}
