/**
 * Turns a markdown image source into a URL or an absolute path. The platform
 * then turns a path into something an `<img>` can load.
 *
 * Relative sources resolve against the directory of the document they appear
 * in, which is a folder path or, for a document loaded by URL, a URL. Anything
 * already carrying a scheme (`https:`, `data:`) is passed through untouched.
 */
export function resolveUri(source: string, basePath: string): string {
  if (hasScheme(source)) {
    return source;
  }
  if (hasScheme(basePath)) {
    try {
      return new URL(source, `${basePath}/`).href;
    } catch {
      return source;
    }
  }
  return source.startsWith('/')
    ? decodeUri(source)
    : joinPath(basePath, decodeUri(source));
}

export function hasScheme(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
}

/** A malformed escape should not take the whole render down. */
function decodeUri(source: string): string {
  try {
    return decodeURIComponent(source);
  } catch {
    return source;
  }
}

/** Resolves `.` and `..` against an absolute base directory. */
function joinPath(base: string, relative: string): string {
  const segments: string[] = [];
  for (const segment of `${base}/${relative}`.split('/')) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return `/${segments.join('/')}`;
}
