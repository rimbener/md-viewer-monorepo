import { useEffect, useMemo, useRef } from 'react';

import { selectionManager } from '@m3e/web/core/a11y';

import {
  M3eTree,
  M3eTreeItem,
  type M3eTreeElement,
  type M3eTreeItemElement,
} from '../m3e';
import { ancestorPaths, isInside } from '../scanDirectory';
import { useTheme } from '../theme';
import type { DirectoryNode, FileNode, TreeNode } from '../types';
import { typescale } from '../typescale';
import { oneLine } from './text';

type TreeItem = HTMLElement & {
  selected: boolean;
  open: boolean;
  updateComplete: Promise<unknown>;
};

let nextItemId = 0;

/**
 * The root, plus every directory on the way down to an already-selected file —
 * a selection restored from the last session has to be visible to be useful.
 */
function initialExpansion(
  root: DirectoryNode,
  selectedPath: string | null,
): Set<string> {
  const expanded = new Set([root.path]);
  if (selectedPath !== null) {
    for (const ancestor of ancestorPaths(selectedPath, root.path)) {
      expanded.add(ancestor);
    }
  }
  return expanded;
}

function indexNodes(node: TreeNode, into: Map<string, TreeNode>): void {
  into.set(node.path, node);
  if (node.kind === 'directory') {
    node.children.forEach(child => indexNodes(child, into));
  }
}

interface FileTreeProps {
  root: DirectoryNode;
  selectedPath: string | null;
  onSelectFile: (file: FileNode) => void;
  onSelectDirectory: (directory: DirectoryNode) => void;
}

export function FileTree({
  root,
  selectedPath,
  onSelectFile,
  onSelectDirectory,
}: FileTreeProps) {
  const theme = useTheme();
  const treeRef = useRef<M3eTreeElement>(null);
  const nodes = useMemo(() => {
    const index = new Map<string, TreeNode>();
    indexNodes(root, index);
    return index;
  }, [root]);
  const latest = useRef({
    selectedPath,
    nodes,
    onSelectFile,
    onSelectDirectory,
  });
  latest.current = { selectedPath, nodes, onSelectFile, onSelectDirectory };

  // Once, on mount. `open` is not a prop: @lit/react sets every prop again on
  // each render, which would close what the person opened.
  useEffect(() => {
    const items = Array.from(
      treeRef.current?.querySelectorAll<TreeItem>('m3e-tree-item') ?? [],
    );
    const opened = initialExpansion(root, selectedPath);
    for (const item of items) {
      item.open = opened.has(item.dataset.path ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A linked file joins the tree only after its folders are read.
  const pending = useRef(selectedPath);
  const restored = useRef(selectedPath);
  useEffect(() => {
    pending.current = selectedPath;
    if (selectedPath !== restored.current) {
      restored.current = null;
    }
  }, [selectedPath]);
  useEffect(() => {
    if (pending.current !== null && !isInside(pending.current, root.path)) {
      pending.current = null;
    }
    if (pending.current === null) {
      return;
    }
    const items = Array.from(
      treeRef.current?.querySelectorAll<TreeItem>('m3e-tree-item') ?? [],
    );
    const selected = items.find(item => item.dataset.path === pending.current);
    if (selected === undefined) {
      return;
    }
    pending.current = null;
    const opened = initialExpansion(root, selected.dataset.path ?? null);
    const opening = items.filter(item => opened.has(item.dataset.path ?? ''));
    for (const item of opening) {
      item.open = true;
    }
    // A restored file can sit far below the fold; a later one is near.
    const block =
      selected.dataset.path === restored.current ? 'center' : 'nearest';
    restored.current = null;
    // The opened folders show their items on m3e's next update.
    void Promise.all(opening.map(item => item.updateComplete)).then(() =>
      selected.scrollIntoView?.({ block }),
    );
  }, [selectedPath, root]);

  // The tree lists its items only when its own children change. A folder read
  // on click adds nested items, which a click could not select until listed.
  useEffect(() => {
    const tree = treeRef.current;
    if (tree === null) {
      return;
    }
    const items = Array.from(
      tree.querySelectorAll<M3eTreeItemElement>('m3e-tree-item'),
    );
    for (const item of items) {
      item.id ||= `file-tree-item-${nextItemId++}`;
    }
    tree[selectionManager].setItems(items);
  }, [nodes]);

  const onChange = (event: Event) => {
    const tree = event.currentTarget as M3eTreeElement;
    if (event.target !== tree) {
      return;
    }
    const { selectedPath: current, nodes: index } = latest.current;
    const picked = (tree.selected[0] as TreeItem | undefined)?.dataset.path;
    const node = picked === undefined ? undefined : index.get(picked);
    if (node?.kind === 'directory') {
      // A folder is never selected: the selection stays on the open file.
      tree
        .querySelectorAll<TreeItem>('m3e-tree-item')
        .forEach(item => (item.selected = item.dataset.path === current));
      latest.current.onSelectDirectory(node);
    } else if (node?.kind === 'file') {
      latest.current.onSelectFile(node);
    }
  };

  if (root.children.length === 0) {
    return (
      <p style={{ ...styles.empty, color: theme.mutedText }}>
        No markdown files found.
      </p>
    );
  }

  const renderNode = (node: TreeNode) =>
    node.kind === 'directory' ? (
      <M3eTreeItem
        key={node.path}
        data-path={node.path}
        // Without it the name would include every child label.
        aria-label={`${node.name} folder`}
      >
        <span slot="label" style={{ ...oneLine, fontWeight: 600 }}>
          {node.name}
        </span>
        {node.isUnread ? (
          // m3e shows the toggle and opens a folder only when it has items.
          <M3eTreeItem disabled aria-label="Loading">
            <span slot="label" style={oneLine}>
              Loading…
            </span>
          </M3eTreeItem>
        ) : (
          node.children.map(renderNode)
        )}
      </M3eTreeItem>
    ) : (
      <M3eTreeItem
        key={node.path}
        data-path={node.path}
        aria-label={node.name}
        selected={node.path === selectedPath}
      >
        <span slot="label" style={oneLine}>
          {node.name}
        </span>
      </M3eTreeItem>
    );

  return (
    <M3eTree ref={treeRef} onChange={onChange} style={styles.tree}>
      {renderNode(root)}
    </M3eTree>
  );
}

const styles = {
  tree: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
  },
  empty: {
    padding: 16,
    margin: 0,
    ...typescale('body-small'),
  },
} as const;
