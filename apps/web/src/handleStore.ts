/**
 * Folder handles kept across visits. A handle survives in IndexedDB; the
 * permission to read through it may not, and is asked for again on use.
 */

const DATABASE = 'md-viewer';
const STORE = 'folders';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const database = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = operation(
        database.transaction(STORE, mode).objectStore(STORE),
      );
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export function saveHandle(
  key: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  return run('readwrite', store => store.put(handle, key));
}

export function loadHandle(
  key: string,
): Promise<FileSystemDirectoryHandle | undefined> {
  return run('readonly', store => store.get(key));
}
