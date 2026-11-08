/**
 * Shape of the markdown tree rendered in the left panel.
 */

export interface FileNode {
  kind: 'file';
  /** Last path component, e.g. `README.md` */
  name: string;
  /** Absolute path on disk */
  path: string;
}

export interface DirectoryNode {
  kind: 'directory';
  name: string;
  path: string;
  /** Directories first, then files; both alphabetical. */
  children: TreeNode[];
  /** Past the walk: not read yet, so its children are not known. */
  isUnread?: boolean;
}

export type TreeNode = FileNode | DirectoryNode;
