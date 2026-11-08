import { linkTarget } from '../src/links';

function target(href: string, base = '/notes/guide'): string {
  const found = linkTarget(href, base);
  return found === null
    ? 'none'
    : `${found.kind} ${'path' in found ? found.path : found.url}`;
}

describe('linkTarget', () => {
  it('sends web links to the browser', () => {
    expect(target('https://example.com/a.md')).toBe(
      'browser https://example.com/a.md',
    );
    expect(target('mailto:me@example.com')).toBe(
      'browser mailto:me@example.com',
    );
  });

  it('opens a linked markdown file in the viewer', () => {
    expect(target('setup.md')).toBe('file /notes/guide/setup.md');
    expect(target('../README.md#install')).toBe('file /notes/README.md');
    expect(target('./rules.mdc?x=1')).toBe('file /notes/guide/rules.mdc');
    expect(target('my%20notes.md')).toBe('file /notes/guide/my notes.md');
    expect(target('file:///Users/me/a%20b.md')).toBe('file /Users/me/a b.md');
  });

  it('does nothing for other local files and for an anchor', () => {
    expect(target('#usage')).toBe('none');
    expect(target('data.csv')).toBe('none');
    expect(target('file:///Users/me/report.pdf')).toBe('none');
  });

  it('resolves links in a document by URL against its URL', () => {
    const base = 'https://raw.example.com/repo/docs';
    expect(target('next.md', base)).toBe(
      'document https://raw.example.com/repo/docs/next.md',
    );
    expect(target('logo.png', base)).toBe(
      'browser https://raw.example.com/repo/docs/logo.png',
    );
  });
});
