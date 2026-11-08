import { hasScheme, resolveUri } from '@md-viewer/markdown/resolveUri';

import { isMarkdown } from './scanDirectory';

/** Where a click on a link goes. */
export type LinkTarget =
  | { kind: 'browser'; url: string }
  /** A markdown file in the folder, shown in the viewer. */
  | { kind: 'file'; path: string }
  /** A markdown document by URL, shown in the viewer where the platform can. */
  | { kind: 'document'; url: string };

function withoutSuffix(href: string): string {
  const end = href.search(/[?#]/);
  return end === -1 ? href : href.slice(0, end);
}

function fileUrlPath(href: string): string | null {
  try {
    return decodeURIComponent(new URL(href).pathname);
  } catch {
    return null;
  }
}

/**
 * Web links go to the browser. A link to a markdown file, relative or
 * `file:`, opens in the viewer. Other local files, and an anchor in the same
 * document, do nothing.
 */
export function linkTarget(href: string, basePath: string): LinkTarget | null {
  if (/^file:/i.test(href)) {
    const path = fileUrlPath(withoutSuffix(href));
    return path !== null && isMarkdown(path) ? { kind: 'file', path } : null;
  }
  if (hasScheme(href)) {
    return { kind: 'browser', url: href };
  }
  const target = withoutSuffix(href);
  if (target === '') {
    return null;
  }
  const resolved = resolveUri(target, basePath);
  if (hasScheme(resolved)) {
    return isMarkdown(new URL(resolved).pathname)
      ? { kind: 'document', url: resolved }
      : { kind: 'browser', url: resolved };
  }
  return isMarkdown(resolved) ? { kind: 'file', path: resolved } : null;
}
