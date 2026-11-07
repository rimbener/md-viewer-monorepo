/**
 * Case-insensitive find over one string. Kept apart from the field so the
 * mark logic can be tested without the UI.
 */

/** The field stops here. A longer query is not searched. */
export const MAX_QUERY_LENGTH = 200;

/**
 * Past this many hits the marks stop. One element per hit, and more than this
 * stalls the page.
 */
export const MAX_MATCHES = 500;

export type MatchPart = {
  text: string;
  match: boolean;
};

/**
 * Splits `text` on non-overlapping hits of `query`.
 * `limit` caps how many hits this call may mark; the rest of the string stays
 * plain and `more` says a further hit was left unmarked.
 */
export function splitMatches(
  text: string,
  query: string,
  limit: number,
): { parts: MatchPart[]; more: boolean } {
  if (
    query.length === 0 ||
    query.length > MAX_QUERY_LENGTH ||
    limit <= 0 ||
    text.length < query.length
  ) {
    return { parts: [{ text, match: false }], more: false };
  }

  const needle = query.toLowerCase();
  const hay = text.toLowerCase();
  // toLowerCase can grow a character (ß), so an index would slice the wrong span.
  if (needle.length !== query.length || hay.length !== text.length) {
    return { parts: [{ text, match: false }], more: false };
  }

  const parts: MatchPart[] = [];
  let cursor = 0;
  let matched = 0;

  while (cursor <= text.length - query.length && matched < limit) {
    const at = hay.indexOf(needle, cursor);
    if (at === -1) {
      break;
    }
    if (at > cursor) {
      parts.push({ text: text.slice(cursor, at), match: false });
    }
    parts.push({ text: text.slice(at, at + query.length), match: true });
    cursor = at + query.length;
    matched += 1;
  }

  const more = matched >= limit && hay.indexOf(needle, cursor) !== -1;
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), match: false });
  }
  if (parts.length === 0) {
    parts.push({ text, match: false });
  }

  return { parts, more };
}

/**
 * Where each non-overlapping hit of `query` starts in `text`, at most `limit`
 * of them. `more` says a further hit was left out.
 */
export function findMatches(
  text: string,
  query: string,
  limit: number,
): { starts: number[]; more: boolean } {
  const { parts, more } = splitMatches(text, query, limit);
  const starts: number[] = [];
  let cursor = 0;
  for (const part of parts) {
    if (part.match) {
      starts.push(cursor);
    }
    cursor += part.text.length;
  }
  return { starts, more };
}

/** `text` with every hit of `query` swapped for `replacement`, and how many. */
export function replaceAll(
  text: string,
  query: string,
  replacement: string,
): { text: string; count: number } {
  const { parts } = splitMatches(text, query, Number.POSITIVE_INFINITY);
  let count = 0;
  const next = parts
    .map(part => {
      if (!part.match) {
        return part.text;
      }
      count += 1;
      return replacement;
    })
    .join('');
  return { text: next, count };
}
