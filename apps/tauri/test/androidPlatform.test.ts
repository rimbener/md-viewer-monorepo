import type { Platform } from '@md-viewer/viewer/platform';

import { createAndroidPlatform } from '../src/androidPlatform';
import type { Saf, SafFolder } from '../src/saf';

type Node = { name: string; parent: string | null; text?: string };

/**
 * Document trees in memory. A document id is `<tree>:<path>`, as the
 * external storage provider makes it. A name ending in `/` is a folder.
 */
function createFakeSaf(trees: Record<string, string[]>) {
  const nodes = new Map<string, Node>();
  const granted = new Set<string>();
  let picks: string[] = [];

  for (const [tree, entries] of Object.entries(trees)) {
    const name = tree.split('/').pop() as string;
    nodes.set(`${tree}:`, { name, parent: null });
    granted.add(tree);
    for (const entry of entries) {
      const path = entry.replace(/\/$/, '');
      const slash = path.lastIndexOf('/');
      nodes.set(`${tree}:${path}`, {
        name: path.slice(slash + 1),
        parent: `${tree}:${path.slice(0, Math.max(slash, 0))}`,
        text: entry.endsWith('/') ? undefined : `text of ${path}`,
      });
    }
  }

  const folder = (tree: string): SafFolder => ({
    tree,
    root: `${tree}:`,
    name: (nodes.get(`${tree}:`) as Node).name,
  });
  const node = (id: string) => {
    const found = nodes.get(id);
    if (found === undefined) {
      throw new Error(`no ${id}`);
    }
    return found;
  };

  const saf = {
    pickFolder: vi.fn(async () => {
      const tree = picks.shift();
      return tree === undefined ? null : folder(tree);
    }),
    openTree: vi.fn(async (tree: string) =>
      granted.has(tree) ? folder(tree) : null,
    ),
    listChildren: vi.fn(async (_tree: string, document: string) =>
      [...nodes]
        .filter(([, child]) => child.parent === document)
        .map(([id, child]) => ({
          id,
          name: child.name,
          isDirectory: child.text === undefined,
        })),
    ),
    stat: vi.fn(async (_tree: string, document: string) => ({
      modified: 0,
      size: (node(document).text ?? '').length,
    })),
    readText: vi.fn(
      async (_tree: string, document: string) => node(document).text ?? '',
    ),
    readBase64: vi.fn(async () => ({ data: '', mimeType: 'image/png' })),
    writeText: vi.fn(
      async (_tree: string, document: string, contents: string) => {
        node(document).text = contents;
      },
    ),
    createFile: vi.fn(async (_tree: string, parent: string, name: string) => {
      const id = `${parent}${parent.endsWith(':') ? '' : '/'}${name}`;
      nodes.set(id, { name, parent, text: '' });
      return id;
    }),
  } satisfies Saf;

  return {
    saf,
    willPick(...next: string[]) {
      picks = next;
    },
    revoke(tree: string) {
      granted.delete(tree);
    },
    text: (id: string) => nodes.get(id)?.text,
  };
}

const TREES = {
  'content://docs/notes': ['a.md', 'sub/', 'sub/b.md'],
  'content://cloud/notes': ['c.md'],
};

async function pick(platform: Platform) {
  return platform.askForFolder();
}

describe('createAndroidPlatform', () => {
  it('names a picked folder after it, and a second one with a number', async () => {
    const fake = createFakeSaf(TREES);
    const platform = createAndroidPlatform(fake.saf);
    fake.willPick('content://docs/notes', 'content://cloud/notes');

    expect(await pick(platform)).toBe('/notes');
    expect(await pick(platform)).toBe('/notes (2)');
    expect(await platform.readFile('/notes (2)/c.md')).toBe('text of c.md');
  });

  it('gives null when the picker is cancelled', async () => {
    const platform = createAndroidPlatform(createFakeSaf(TREES).saf);

    expect(await pick(platform)).toBeNull();
  });

  it('lists a folder with paths under it', async () => {
    const fake = createFakeSaf(TREES);
    const platform = createAndroidPlatform(fake.saf);
    fake.willPick('content://docs/notes');
    await pick(platform);

    const entries = await platform.readDir('/notes');

    expect(
      entries.map(e => `${e.path} ${e.isDirectory ? 'dir' : 'file'}`),
    ).toEqual(['/notes/a.md file', '/notes/sub dir']);
  });

  it('reads a nested file before its folder was listed', async () => {
    const fake = createFakeSaf(TREES);
    const platform = createAndroidPlatform(fake.saf);
    fake.willPick('content://docs/notes');
    await pick(platform);

    expect(await platform.readFile('/notes/sub/b.md')).toBe('text of sub/b.md');
    await platform.readFile('/notes/sub/b.md');
    expect(fake.saf.listChildren).toHaveBeenCalledTimes(2);
  });

  it('rejects a path outside every open folder, or missing in one', async () => {
    const fake = createFakeSaf(TREES);
    const platform = createAndroidPlatform(fake.saf);
    fake.willPick('content://docs/notes');
    await pick(platform);

    await expect(platform.readFile('/other/a.md')).rejects.toThrow();
    await expect(platform.readFile('/notes/gone.md')).rejects.toThrow();
    expect(await platform.folderExists('/notes/sub')).toBe(true);
    expect(await platform.folderExists('/notes/gone')).toBe(false);
  });

  it('writes over a file', async () => {
    const fake = createFakeSaf(TREES);
    const platform = createAndroidPlatform(fake.saf);
    fake.willPick('content://docs/notes');
    await pick(platform);

    await platform.writeFile?.('/notes/a.md', 'new');

    expect(fake.text('content://docs/notes:a.md')).toBe('new');
  });

  it('creates a file, and refuses a name that is taken', async () => {
    const fake = createFakeSaf(TREES);
    const platform = createAndroidPlatform(fake.saf);
    fake.willPick('content://docs/notes');
    await pick(platform);

    await platform.createFile?.('/notes/sub/new.md', '# New');

    expect(await platform.readFile('/notes/sub/new.md')).toBe('# New');
    await expect(platform.createFile?.('/notes/a.md', 'x')).rejects.toThrow(
      'already exists',
    );
  });

  it('opens a folder again from its bookmark', async () => {
    const fake = createFakeSaf(TREES);
    const first = createAndroidPlatform(fake.saf);
    fake.willPick('content://cloud/notes', 'content://docs/notes');
    await pick(first);
    const path = await pick(first);
    const bookmark = (await first.bookmarkFolder(path as string)) as string;

    const next = createAndroidPlatform(fake.saf);

    expect(await next.openFolder(bookmark)).toEqual({
      path: '/notes (2)',
      isStale: false,
    });
    expect(await next.readFile('/notes (2)/a.md')).toBe('text of a.md');
  });

  it('gives null for a bookmark whose grant is gone, or that is not one', async () => {
    const fake = createFakeSaf(TREES);
    const platform = createAndroidPlatform(fake.saf);
    fake.willPick('content://docs/notes');
    const bookmark = (await platform.bookmarkFolder(
      (await pick(platform)) as string,
    )) as string;
    fake.revoke('content://docs/notes');

    expect(
      await createAndroidPlatform(fake.saf).openFolder(bookmark),
    ).toBeNull();
    expect(await platform.openFolder('/notes')).toBeNull();
  });

  it('calls back when a watched file changes', async () => {
    vi.useFakeTimers();
    try {
      const fake = createFakeSaf(TREES);
      const platform = createAndroidPlatform(fake.saf);
      fake.willPick('content://docs/notes');
      await pick(platform);
      const onChange = vi.fn();

      const stop = platform.watchFile('/notes/a.md', onChange);
      await vi.advanceTimersByTimeAsync(1000);
      await platform.writeFile?.('/notes/a.md', 'longer text');
      await vi.advanceTimersByTimeAsync(1000);
      stop();

      expect(onChange).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
