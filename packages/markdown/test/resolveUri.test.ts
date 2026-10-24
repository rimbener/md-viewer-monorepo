import { resolveUri } from '../src/resolveUri';

const BASE = '/Users/me/notes/guide';

describe('resolveUri', () => {
  it('passes through sources that already have a scheme', () => {
    expect(resolveUri('https://x.dev/a.png', BASE)).toBe('https://x.dev/a.png');
    expect(resolveUri('data:image/png;base64,AA', BASE)).toBe(
      'data:image/png;base64,AA',
    );
  });

  it('resolves relative paths against the document folder', () => {
    expect(resolveUri('img/a.png', BASE)).toBe(
      '/Users/me/notes/guide/img/a.png',
    );
    expect(resolveUri('./a.png', BASE)).toBe('/Users/me/notes/guide/a.png');
    expect(resolveUri('../shared/a.png', BASE)).toBe(
      '/Users/me/notes/shared/a.png',
    );
  });

  it('keeps absolute paths as they are', () => {
    expect(resolveUri('/tmp/a.png', BASE)).toBe('/tmp/a.png');
  });

  it('decodes escapes once', () => {
    expect(resolveUri('my image.png', BASE)).toBe(
      '/Users/me/notes/guide/my image.png',
    );
    expect(resolveUri('my%20image.png', BASE)).toBe(
      '/Users/me/notes/guide/my image.png',
    );
  });

  it('resolves against the folder of a document loaded by URL', () => {
    const base = 'https://raw.example.com/org/repo/main/docs';
    expect(resolveUri('img/a.png', base)).toBe(
      'https://raw.example.com/org/repo/main/docs/img/a.png',
    );
    expect(resolveUri('../a.png', base)).toBe(
      'https://raw.example.com/org/repo/main/a.png',
    );
    expect(resolveUri('/a.png', base)).toBe('https://raw.example.com/a.png');
  });
});
