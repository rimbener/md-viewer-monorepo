import { isMarkdown } from './scanDirectory';

export type NewFileName = { name: string } | { error: string };

/**
 * The file name to create for what was typed. A name without a markdown
 * extension gets `.md`, because the tree shows only markdown files.
 */
export function newFileName(typed: string): NewFileName {
  const name = typed.trim();
  if (name === '') {
    return { error: 'Type a file name.' };
  }
  if (/[/\\]/.test(name)) {
    return { error: 'A file name cannot hold / or \\.' };
  }
  if (name === '.' || name === '..') {
    return { error: 'That is not a file name.' };
  }
  return { name: isMarkdown(name) ? name : `${name}.md` };
}
