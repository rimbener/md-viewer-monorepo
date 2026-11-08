import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

// false declines, so the key passes on; a promise holds back the later handlers.
type ShortcutHandler = () => void | false | Promise<unknown>;

interface ShortcutOptions {
  withShift?: boolean;
  first?: boolean;
}

interface Entry {
  key: string;
  withShift: boolean;
  first: boolean;
  handler: RefObject<ShortcutHandler | null>;
}

interface ModifierState {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

const entries: Entry[] = [];

export function isCommand(event: ModifierState): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey;
}

function run(queue: Entry[]): boolean {
  let isClaimed = false;
  for (const [index, entry] of queue.entries()) {
    const result = entry.handler.current?.();
    if (result === false) {
      continue;
    }
    isClaimed = true;
    if (result instanceof Promise) {
      const rest = queue.slice(index + 1);
      result.then(() => run(rest.filter(later => entries.includes(later))));
      return true;
    }
  }
  return isClaimed;
}

function onKeyDown(event: KeyboardEvent): void {
  if (!isCommand(event)) {
    return;
  }
  const key = event.key.toLowerCase();
  const queue = entries
    .filter(entry => entry.key === key && (entry.withShift || !event.shiftKey))
    .sort((a, b) => Number(b.first) - Number(a.first));
  if (run(queue)) {
    event.preventDefault();
  }
}

function register(entry: Entry): () => void {
  if (entries.length === 0) {
    window.addEventListener('keydown', onKeyDown);
  }
  entries.push(entry);
  return () => {
    entries.splice(entries.indexOf(entry), 1);
    if (entries.length === 0) {
      window.removeEventListener('keydown', onKeyDown);
    }
  };
}

// A null handler still keeps the browser's own action off.
export function useShortcut(
  key: string,
  handler: ShortcutHandler | null,
  { withShift = false, first = false }: ShortcutOptions = {},
): void {
  const latest = useRef(handler);
  useLayoutEffect(() => {
    latest.current = handler;
  });
  useEffect(
    () => register({ key, withShift, first, handler: latest }),
    [key, withShift, first],
  );
}
