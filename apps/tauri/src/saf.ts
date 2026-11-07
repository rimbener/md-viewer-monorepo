/**
 * The Android Storage Access Framework, through the Kotlin plugin in
 * `src-tauri/plugins/saf`. A folder is a tree URI the person granted; a
 * document is an id inside that tree.
 */

import { invoke } from '@tauri-apps/api/core';

export type SafFolder = { tree: string; root: string; name: string };

export type SafEntry = { id: string; name: string; isDirectory: boolean };

export type SafStat = { modified: number; size: number };

export interface Saf {
  /** Null when the person cancelled. */
  pickFolder(): Promise<SafFolder | null>;
  /** Null when the grant is gone or the folder was deleted. */
  openTree(tree: string): Promise<SafFolder | null>;
  listChildren(tree: string, document: string): Promise<SafEntry[]>;
  stat(tree: string, document: string): Promise<SafStat>;
  readText(tree: string, document: string): Promise<string>;
  readBase64(
    tree: string,
    document: string,
  ): Promise<{ data: string; mimeType: string }>;
  writeText(tree: string, document: string, contents: string): Promise<void>;
  /** Makes an empty file. Returns its document id. */
  createFile(tree: string, parent: string, name: string): Promise<string>;
}

const call = <T>(command: string, args?: Record<string, unknown>) =>
  invoke<T>(`plugin:saf|${command}`, args);

const folderOrNull = (folder: Partial<SafFolder>): SafFolder | null =>
  folder.tree === undefined ? null : (folder as SafFolder);

export function createSaf(): Saf {
  return {
    async pickFolder() {
      return folderOrNull(await call<Partial<SafFolder>>('pick_folder'));
    },
    async openTree(tree) {
      return folderOrNull(
        await call<Partial<SafFolder>>('open_tree', { tree }),
      );
    },
    async listChildren(tree, document) {
      const listing = await call<{ entries: SafEntry[] }>('list_children', {
        tree,
        document,
      });
      return listing.entries;
    },
    stat(tree, document) {
      return call<SafStat>('stat', { tree, document });
    },
    async readText(tree, document) {
      const text = await call<{ contents: string }>('read_text', {
        tree,
        document,
      });
      return text.contents;
    },
    readBase64(tree, document) {
      return call('read_base64', { tree, document });
    },
    async writeText(tree, document, contents) {
      await call('write_text', { tree, document, contents });
    },
    async createFile(tree, parent, name) {
      const file = await call<{ document: string }>('create_file', {
        tree,
        parent,
        name,
      });
      return file.document;
    },
  };
}
