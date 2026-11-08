import {
  canStepBack,
  canStepNext,
  initialFolderSession,
  reduceFolderSession,
  type FolderEvent,
  type FolderSession,
} from '../src/folderSession';
import type { DirectoryNode, FileNode } from '../src/types';

function run(
  events: FolderEvent[],
  from = initialFolderSession,
): FolderSession {
  return events.reduce(reduceFolderSession, from);
}

function line(state: FolderSession): string {
  const flags = [
    state.tree !== null && `tree=${state.tree.path}`,
    state.selected !== null && `selected=${state.selected.path}`,
    state.scan !== null && `scan#${state.scan.id}`,
    state.error !== null && `error=${state.error}`,
    state.history.paths.length > 0 &&
      `history=${state.history.paths.join(',')}@${state.history.index}`,
    canStepBack(state) && 'back',
    canStepNext(state) && 'next',
  ].filter(Boolean);
  return [`${state.phase} ${state.folder}`, ...flags].join(' ');
}

function file(path: string): FileNode {
  return { kind: 'file', name: path.slice(path.lastIndexOf('/') + 1), path };
}

function tree(folder: string, ...names: string[]): DirectoryNode {
  return {
    kind: 'directory',
    name: folder.slice(1),
    path: folder,
    children: names.map(name => file(`${folder}/${name}`)),
  };
}

function scanId(state: FolderSession): number {
  if (state.scan === null) {
    throw new Error('no scan is running');
  }
  return state.scan.id;
}

function scanned(state: FolderSession, node: DirectoryNode): FolderSession {
  return run([{ type: 'scanned', id: scanId(state), tree: node }], state);
}

const restored = run([
  { type: 'restored', folder: '/docs', target: '/docs/b.md' },
]);
const open = scanned(restored, tree('/docs', 'a.md', 'b.md'));

describe('reduceFolderSession', () => {
  it('restores a folder, scans it, then selects the stored file', () => {
    expect(line(initialFolderSession)).toBe('restoring null');
    expect(line(restored)).toBe('scanning /docs scan#1');
    expect(line(open)).toBe('open /docs tree=/docs selected=/docs/b.md');
  });

  it('opens nothing when nothing was stored', () => {
    expect(line(run([{ type: 'nothingRestored' }]))).toBe('idle null');
  });

  it('lets a pick made while restoring win over the restore', () => {
    const picked = run([
      { type: 'picked', folder: '/notes', resume: null },
      { type: 'restored', folder: '/docs', target: null },
      { type: 'nothingRestored' },
    ]);
    expect(line(picked)).toBe('scanning /notes scan#1');
  });

  it('ignores a scan result once a newer pick is under way', () => {
    const picked = run(
      [{ type: 'picked', folder: '/notes', resume: null }],
      restored,
    );
    const stale = run(
      [{ type: 'scanned', id: scanId(restored), tree: tree('/docs', 'a.md') }],
      picked,
    );
    expect(stale).toBe(picked);
    expect(line(scanned(picked, tree('/notes', 'n.md')))).toBe(
      'open /notes tree=/notes',
    );
  });

  it('keeps the folder but shows the error when the scan fails', () => {
    const failed = run(
      [{ type: 'scanFailed', id: scanId(restored), message: 'denied' }],
      restored,
    );
    expect(line(failed)).toBe('failed /docs error=denied');
  });

  it('closes the folder on cancel, rather than going back to the last one', () => {
    const replacing = run(
      [{ type: 'picked', folder: '/huge', resume: null }],
      open,
    );
    expect(line(run([{ type: 'cancelled' }], replacing))).toBe('idle null');
    expect(run([{ type: 'cancelled' }], open)).toBe(open);
  });

  it('shows a file from outside over a running scan, and drops the scan', () => {
    const outside = run(
      [{ type: 'openedFromOutside', path: '/inbox/x.md' }],
      restored,
    );
    expect(line(outside)).toBe(
      'external null tree=/inbox selected=/inbox/x.md',
    );
    expect(
      run(
        [{ type: 'scanned', id: scanId(restored), tree: tree('/docs') }],
        outside,
      ),
    ).toBe(outside);
    expect(
      run([{ type: 'openedFromOutside', path: '/inbox/x.md' }], outside),
    ).toBe(outside);
  });

  it('keeps the selection over a reload while the file is still there', () => {
    const reloading = run([{ type: 'reloaded' }], open);
    expect(line(reloading)).toBe(
      'scanning /docs tree=/docs selected=/docs/b.md scan#3',
    );
    expect(line(scanned(reloading, tree('/docs', 'b.md', 'c.md')))).toBe(
      'open /docs tree=/docs selected=/docs/b.md',
    );
    expect(line(scanned(reloading, tree('/docs', 'a.md')))).toBe(
      'open /docs tree=/docs',
    );
  });

  it('records visits, then steps back and next through them', () => {
    const visited = run(
      [
        { type: 'selected', file: file('/docs/a.md') },
        { type: 'selected', file: file('/docs/b.md') },
      ],
      open,
    );
    expect(line(visited)).toBe(
      'open /docs tree=/docs selected=/docs/b.md history=/docs/a.md,/docs/b.md@1 back',
    );
    const back = run([{ type: 'stepped', direction: 'back' }], visited);
    expect(line(back)).toBe(
      'open /docs tree=/docs selected=/docs/a.md history=/docs/a.md,/docs/b.md@0 next',
    );
    expect(run([{ type: 'stepped', direction: 'back' }], back)).toBe(back);
    expect(line(run([{ type: 'stepped', direction: 'next' }], back))).toBe(
      line(visited),
    );
  });

  it('reads the tree again for a history step it does not hold', () => {
    const visited = run(
      [
        { type: 'selected', file: file('/docs/deep/z.md') },
        { type: 'selected', file: file('/docs/a.md') },
        { type: 'stepped', direction: 'back' },
      ],
      open,
    );
    expect(visited.reveal?.path).toBe('/docs/deep/z.md');
    const revealed = run(
      [
        {
          type: 'revealed',
          id: visited.reveal?.id ?? -1,
          tree: {
            ...tree('/docs', 'a.md'),
            children: [tree('/docs/deep', 'z.md')],
          },
        },
      ],
      visited,
    );
    expect(revealed.selected?.path).toBe('/docs/deep/z.md');
  });

  it('replays early visits onto the history read from storage', () => {
    const loading = run([{ type: 'selected', file: file('/docs/a.md') }], open);
    const loaded = run(
      [
        {
          type: 'historyLoaded',
          id: restored.historyLoad?.id ?? -1,
          stored: { paths: ['/docs/old.md'], index: 0 },
        },
      ],
      loading,
    );
    expect(loaded.history.paths).toEqual([
      '/docs/old.md',
      '/docs/b.md',
      '/docs/a.md',
    ]);
    expect(
      run([{ type: 'historyLoaded', id: 99, stored: loaded.history }], loaded),
    ).toBe(loaded);
  });

  it('keeps only the newest recent folder list', () => {
    const first = run([{ type: 'recentAsked' }]);
    const second = run([{ type: 'recentAsked' }], first);
    const folder = { path: '/docs', bookmark: null };
    expect(
      run(
        [{ type: 'recentLoaded', id: first.recentId, folders: [folder] }],
        second,
      ),
    ).toBe(second);
    expect(
      run(
        [{ type: 'recentLoaded', id: second.recentId, folders: [folder] }],
        second,
      ).recent,
    ).toEqual([folder]);
  });
});
