import type { Node as ProseMirrorNode } from "prosemirror-model";
import { Decoration, DecorationSet } from "prosemirror-view";
import { collectMatches, type FindMatch } from "./findInPagePlugin";

type CachedQuery = {
  matches: FindMatch[];
  decorations: Map<number, DecorationSet>;
};

const MAX_QUERIES_PER_DOCUMENT = 2;
const MAX_SELECTIONS_PER_QUERY = 2;
// Immutable document identities invalidate edited content without retaining old documents.
const documents = new WeakMap<ProseMirrorNode, Map<string, CachedQuery>>();

function remember<K, V>(cache: Map<K, V>, key: K, value: V, limit: number): void {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > limit) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
}

function getQuery(doc: ProseMirrorNode, query: string): CachedQuery {
  let queries = documents.get(doc);
  if (!queries) {
    queries = new Map();
    documents.set(doc, queries);
  }
  const cached = queries.get(query) ?? {
    matches: collectMatches(doc, query, false),
    decorations: new Map<number, DecorationSet>(),
  };
  remember(queries, query, cached, MAX_QUERIES_PER_DOCUMENT);
  return cached;
}

export function getCachedSearchSessionMatches(doc: ProseMirrorNode, query: string): FindMatch[] {
  return getQuery(doc, query).matches;
}

export function getCachedSearchSessionDecorations(
  doc: ProseMirrorNode,
  query: string,
  current: number,
): DecorationSet {
  const cached = getQuery(doc, query);
  const decorations = cached.decorations.get(current) ?? DecorationSet.create(
    doc,
    cached.matches.map((match, index) => Decoration.inline(match.from, match.to, {
      class: index === current
        ? "goose-search-session-match goose-search-session-match--current"
        : "goose-search-session-match",
    })),
  );
  remember(cached.decorations, current, decorations, MAX_SELECTIONS_PER_QUERY);
  return decorations;
}
