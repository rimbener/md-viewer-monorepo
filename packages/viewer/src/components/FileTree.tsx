import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ancestorPaths } from '../scanDirectory';
import { useTheme } from '../theme';
import type { DirectoryNode, FileNode, TreeNode } from '../types';
import { oneLine } from './text';

const INDENT_PER_LEVEL = 14;
const ROW_HEIGHT = 26;

interface Row {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
}

/** Depth-first walk that emits only the rows currently visible. */
function flatten(
  nodes: TreeNode[],
  expandedPaths: Set<string>,
  depth: number,
  rows: Row[],
): void {
  for (const node of nodes) {
    const isExpanded =
      node.kind === 'directory' && expandedPaths.has(node.path);
    rows.push({ node, depth, isExpanded });

    if (node.kind === 'directory' && isExpanded) {
      flatten(node.children, expandedPaths, depth + 1, rows);
    }
  }
}

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
  // The root starts open, as does the path to a restored selection; everything
  // else starts collapsed.
  const [expandedPaths, setExpandedPaths] = useState(() =>
    initialExpansion(root, selectedPath),
  );
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const collected: Row[] = [];
    flatten([root], expandedPaths, 0, collected);
    return collected;
  }, [root, expandedPaths]);

  // Once, on mount: a restored selection can sit below the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView?.({ block: 'center' });
  }, []);

  const toggleDirectory = useCallback((path: string) => {
    setExpandedPaths(previous => {
      const next = new Set(previous);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  return (
    <div
      ref={listRef}
      role="tree"
      style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}
    >
      {rows.map(({ node, depth, isExpanded }) => {
        const isDirectory = node.kind === 'directory';
        const isSelected = !isDirectory && node.path === selectedPath;
        return (
          <button
            key={node.path}
            type="button"
            role="treeitem"
            className="pressable"
            aria-label={isDirectory ? `${node.name} folder` : node.name}
            aria-expanded={isDirectory ? isExpanded : undefined}
            aria-current={isSelected ? 'true' : undefined}
            onClick={() => {
              if (isDirectory) {
                onSelectDirectory(node);
                toggleDirectory(node.path);
              } else {
                onSelectFile(node);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: 'calc(100% - 8px)',
              height: ROW_HEIGHT,
              margin: '0 4px',
              padding: `0 8px 0 ${8 + depth * INDENT_PER_LEVEL}px`,
              border: 'none',
              borderRadius: 5,
              textAlign: 'left',
              backgroundColor: isSelected
                ? theme.selectedBackground
                : 'transparent',
            }}
          >
            <span
              style={{
                width: 14,
                flexShrink: 0,
                fontSize: 10,
                color: isSelected ? theme.selectedText : theme.mutedText,
              }}
            >
              {isDirectory ? (isExpanded ? '▾' : '▸') : ''}
            </span>
            <span
              style={{
                ...oneLine,
                flex: 1,
                fontSize: 13,
                fontWeight: isDirectory ? 600 : 400,
                color: isSelected ? theme.selectedText : theme.text,
              }}
            >
              {node.name}
            </span>
          </button>
        );
      })}
      {rows.length === 0 ? (
        <p
          style={{
            padding: 16,
            margin: 0,
            fontSize: 12,
            color: theme.mutedText,
          }}
        >
          No markdown files found.
        </p>
      ) : null}
    </div>
  );
}
