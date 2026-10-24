type ChunkGroup = {
  name: string;
  test: RegExp;
  priority: number;
  entriesAware?: boolean;
};

export const codeSplittingGroups: ChunkGroup[] = [
  {
    name: "vendor-react",
    test: /[\\/]node_modules[\\/](react|react-dom|scheduler|use-sync-external-store|zustand)[\\/]/,
    priority: 50,
  },
  {
    name: "vendor-prosemirror",
    test: /[\\/]node_modules[\\/]prosemirror-[^\\/]+[\\/]/,
    priority: 40,
  },
  {
    name: "vendor-blocknote",
    test: /[\\/]node_modules[\\/]@blocknote[\\/](core|react|mantine)[\\/]/,
    priority: 39,
  },
  {
    name: "vendor-export",
    test: /[\\/]node_modules[\\/](docx|jszip|@react-pdf[\\/]renderer)[\\/]/,
    priority: 38,
    entriesAware: true,
  },
  {
    name: "vendor-ai",
    test: /[\\/]node_modules[\\/](ai|openai|typebox|@ai-sdk[\\/][^\\/]+|@earendil-works[\\/][^\\/]+|@anthropic-ai[\\/]sdk|@assistant-ui[\\/][^\\/]+)[\\/]/,
    priority: 30,
    entriesAware: true,
  },
  {
    name: "vendor-mermaid",
    test: /[\\/]node_modules[\\/](mermaid|@mermaid-js[\\/][^\\/]+|cytoscape|cytoscape-[^\\/]+|dagre-d3-es|roughjs|khroma|@braintree[\\/]sanitize-url|d3-sankey|@upsetjs[\\/]venn\.js|stylis|ts-dedent)[\\/]/,
    priority: 37,
    entriesAware: true,
  },
  {
    name: "vendor-katex",
    test: /[\\/]node_modules[\\/]katex[\\/]/,
    priority: 36,
    entriesAware: true,
  },
  {
    name: "vendor-markdown",
    test: /[\\/]node_modules[\\/](unified|remark-[^\\/]+|rehype-[^\\/]+|hast-[^\\/]+|hastscript|mdast-[^\\/]+|micromark|micromark-[^\\/]+|markdown-it|markdown-table|lowlight|highlight\.js|prosemirror-highlight|property-information|space-separated-tokens|comma-separated-tokens|decode-named-character-reference|character-entities[^\\/]*|trim-lines|trough|vfile|vfile-[^\\/]+|bail|is-plain-obj|zwitch|html-void-elements|web-namespaces|ccount|escape-string-regexp|mdurl|entities|linkify-it|uc\.micro|punycode\.js|devlop)[\\/]/,
    priority: 35,
  },
  {
    name: "vendor-prettier",
    test: /[\\/]node_modules[\\/]prettier[\\/]/,
    priority: 34,
    entriesAware: true,
  },
  {
    name: "vendor-echarts",
    test: /[\\/]node_modules[\\/](echarts|zrender)[\\/]/,
    priority: 25,
    entriesAware: true,
  },
  {
    name: "vendor-motion",
    test: /[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/,
    priority: 24,
  },
  {
    name: "vendor-dnd",
    test: /[\\/]node_modules[\\/]@dnd-kit[\\/]/,
    priority: 23,
  },
  {
    name: "vendor-router",
    test: /[\\/]node_modules[\\/](react-router|react-router-dom)[\\/]/,
    priority: 22,
  },
  {
    name: "vendor-ui",
    test: /[\\/]node_modules[\\/](@radix-ui[\\/][^\\/]+|@floating-ui[\\/][^\\/]+|lucide-react|cmdk|sonner|class-variance-authority|clsx|tailwind-merge|date-fns)[\\/]/,
    priority: 20,
  },
  {
    name: "vendor",
    test: /[\\/]node_modules[\\/]/,
    priority: 1,
    entriesAware: true,
  },
];
