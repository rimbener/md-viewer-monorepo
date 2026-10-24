import {
  canOpenFolders,
  createWebPlatform,
  openSource,
  sourceFromLocation,
} from '../src/webPlatform';

type FakeEntry = FakeDirectory | FakeFile;

type FakeFile = {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
};

type FakeDirectory = {
  kind: 'directory';
  name: string;
  values: () => AsyncIterable<FakeEntry>;
  getDirectoryHandle: (name: string) => Promise<FakeDirectory>;
  getFileHandle: (name: string) => Promise<FakeFile>;
  isSameEntry: (other: unknown) => Promise<boolean>;
};

/** A directory handle over a nested object; a string value is a file. */
function directory(name: string, tree: Record<string, unknown>): FakeDirectory {
  const entry = (key: string): FakeEntry => {
    const value = tree[key];
    return typeof value === 'string'
      ? {
          kind: 'file',
          name: key,
          // jsdom's File has no text().
          getFile: async () =>
            ({
              text: async () => value,
              lastModified: 1,
              size: value.length,
            }) as unknown as File,
        }
      : directory(key, value as Record<string, unknown>);
  };
  const find = <T extends FakeEntry>(key: string, kind: T['kind']) => {
    if (!(key in tree) || entry(key).kind !== kind) {
      throw new DOMException(key, 'NotFoundError');
    }
    return entry(key) as T;
  };
  const handle: FakeDirectory = {
    kind: 'directory',
    name,
    async *values() {
      for (const key of Object.keys(tree)) {
        yield entry(key);
      }
    },
    getDirectoryHandle: async key => find<FakeDirectory>(key, 'directory'),
    getFileHandle: async key => find<FakeFile>(key, 'file'),
    isSameEntry: async other => other === handle,
  };
  return handle;
}

function pick(handle: FakeDirectory | DOMException) {
  window.showDirectoryPicker = vi.fn(async () => {
    if (handle instanceof DOMException) {
      throw handle;
    }
    return handle as unknown as FileSystemDirectoryHandle;
  });
}

afterEach(() => {
  delete (window as { showDirectoryPicker?: unknown }).showDirectoryPicker;
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});

describe('canOpenFolders', () => {
  it('follows the File System Access API', () => {
    expect(canOpenFolders()).toBe(false);
    pick(directory('notes', {}));
    expect(canOpenFolders()).toBe(true);
  });
});

describe('folders', () => {
  it('names a picked folder by its name and reads through it', async () => {
    pick(directory('notes', { 'a.md': '# A', guide: { 'b.md': '# B' } }));
    const platform = createWebPlatform();

    const root = await platform.askForFolder();

    expect(root).toBe('/notes');
    await expect(platform.readDir('/notes')).resolves.toEqual([
      { name: 'a.md', path: '/notes/a.md', isDirectory: false, isFile: true },
      { name: 'guide', path: '/notes/guide', isDirectory: true, isFile: false },
    ]);
    await expect(platform.readFile('/notes/guide/b.md')).resolves.toBe('# B');
    await expect(platform.folderExists('/notes')).resolves.toBe(true);
    await expect(platform.folderExists('/other')).resolves.toBe(false);
  });

  it('keeps one path per folder, and numbers a second folder of that name', async () => {
    const platform = createWebPlatform();
    const first = directory('notes', { 'a.md': '# First' });
    const second = directory('notes', { 'a.md': '# Second' });

    pick(first);
    expect(await platform.askForFolder()).toBe('/notes');
    pick(second);
    expect(await platform.askForFolder()).toBe('/notes (2)');
    pick(first);
    expect(await platform.askForFolder()).toBe('/notes');

    await expect(platform.readFile('/notes/a.md')).resolves.toBe('# First');
    await expect(platform.readFile('/notes (2)/a.md')).resolves.toBe(
      '# Second',
    );
  });

  it('answers null when the picker is cancelled or not allowed', async () => {
    const platform = createWebPlatform();
    pick(new DOMException('cancelled', 'AbortError'));
    await expect(platform.askForFolder()).resolves.toBeNull();
    pick(new DOMException('no click', 'SecurityError'));
    await expect(platform.askForFolder()).resolves.toBeNull();
  });

  it('refuses a path outside every open folder', async () => {
    await expect(createWebPlatform().readFile('/notes/a.md')).rejects.toThrow(
      'That folder is not open.',
    );
  });
});

describe('documents by URL', () => {
  const url = 'https://example.com/docs/README.md';

  it('reads a document from the address bar', () => {
    expect(sourceFromLocation()).toBeNull();
    window.history.replaceState(null, '', `/?src=${encodeURIComponent(url)}`);
    expect(sourceFromLocation()).toBe(url);
  });

  it('ignores a source that is not an http URL', () => {
    window.history.replaceState(null, '', '/?src=javascript:alert(1)');
    expect(sourceFromLocation()).toBeNull();
  });

  it('puts an opened URL in the address bar and tells the viewer', async () => {
    const platform = createWebPlatform();
    const onOpen = vi.fn();
    const stop = platform.watchOpenedFile(onOpen);

    openSource(url);

    expect(onOpen).toHaveBeenCalledWith(url);
    await expect(platform.takeOpenedFile()).resolves.toBe(url);
    platform.forgetOpenedFile();
    expect(sourceFromLocation()).toBeNull();
    stop();
  });

  it('fetches the text, and says why a fetch failed', async () => {
    const fetch = vi.fn(async (input: string) =>
      input === url
        ? new Response('# Readme')
        : new Response('', { status: 404, statusText: 'Not Found' }),
    );
    vi.stubGlobal('fetch', fetch);
    const platform = createWebPlatform();

    await expect(platform.readFile(url)).resolves.toBe('# Readme');
    await expect(
      platform.readFile('https://example.com/missing.md'),
    ).rejects.toThrow('404 Not Found');
  });

  it('passes a URL image through untouched', async () => {
    await expect(
      createWebPlatform().imageSource('https://example.com/a.png'),
    ).resolves.toBe('https://example.com/a.png');
  });
});
