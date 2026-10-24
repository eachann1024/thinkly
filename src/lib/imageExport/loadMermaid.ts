
type MermaidModule = typeof import("mermaid");

let pending: Promise<MermaidModule> | null = null;

export function preloadMermaid(): Promise<MermaidModule> {
  pending ??= import("mermaid");
  return pending;
}

export async function loadMermaid() {
  const mod = await preloadMermaid();
  return mod.default;
}

export function pageHasMermaidBlock(content: unknown): boolean {
  if (!Array.isArray(content)) return false;
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const node = block as {
      type?: string;
      props?: { language?: string };
      children?: unknown;
    };
    if (node.type === "codeBlock" && node.props?.language === "mermaid") {
      return true;
    }
    if (pageHasMermaidBlock(node.children)) return true;
  }
  return false;
}
