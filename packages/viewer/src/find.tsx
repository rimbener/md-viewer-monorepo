/**
 * Marks hits while the document renders, in the order the text is visited.
 * The count is read after that visit, from the same counter the marks used.
 * Each hit carries its index, so the scroll finds the current one in the DOM.
 */

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';

import { MAX_MATCHES, splitMatches } from './search';
import { useTheme } from './theme';

/** Space left above the current hit when the view scrolls to it. */
const REVEAL_MARGIN = 48;

type Run = readonly { text: string; hit: number }[];

type FindContextValue = {
  query: string;
  active: number;
  runOf: (id: string, text: string) => Run;
};

const FindContext = createContext<FindContextValue | null>(null);

type FindProviderProps = {
  query: string;
  active: number;
  scrollRef: RefObject<HTMLElement | null>;
  onCount: (count: number, capped: boolean) => void;
  children: ReactNode;
};

export function FindProvider({
  query,
  active,
  scrollRef,
  onCount,
  children,
}: FindProviderProps) {
  // Reset before children render. They fill it; the effect below reads it.
  const counter = useRef({ n: 0, capped: false, runs: new Map<string, Run>() });
  counter.current = { n: 0, capped: false, runs: new Map() };

  // Strict Mode renders each run twice; the second render must reuse the first one's hits.
  const runOf = useCallback(
    (id: string, text: string): Run => {
      const pass = counter.current;
      const known = pass.runs.get(id);
      if (known !== undefined) {
        return known;
      }
      const run = splitRun(text, query, pass);
      pass.runs.set(id, run);
      return run;
    },
    [query],
  );

  useEffect(() => {
    onCount(counter.current.n, counter.current.capped);
  });

  useEffect(() => {
    if (query.length > 0) {
      reveal(scrollRef.current, active);
    }
  }, [active, query, scrollRef]);

  return (
    <FindContext.Provider value={{ query, active, runOf }}>
      {children}
    </FindContext.Provider>
  );
}

function reveal(scroll: HTMLElement | null, active: number): void {
  const hit = scroll?.querySelector(`[data-find-hit="${active}"]`);
  if (scroll == null || hit == null) {
    return;
  }
  const top =
    hit.getBoundingClientRect().top -
    scroll.getBoundingClientRect().top +
    scroll.scrollTop;
  scroll.scrollTo?.({
    top: Math.max(0, top - REVEAL_MARGIN),
    behavior: 'smooth',
  });
}

/** With no query the run stays a plain string, not an extra element. */
export function useShowText(): (text: string, key?: number) => ReactNode {
  const find = useContext(FindContext);
  const marking = find !== null && find.query.length > 0;
  return (text: string, key?: number) =>
    marking ? <MarkedRuns key={key} text={text} /> : text;
}

function splitRun(
  text: string,
  query: string,
  pass: { n: number; capped: boolean },
): Run {
  const room = Math.max(0, MAX_MATCHES - pass.n);
  if (room === 0) {
    if (text.toLowerCase().includes(query.toLowerCase())) {
      pass.capped = true;
    }
    return [{ text, hit: -1 }];
  }
  const { parts, more } = splitMatches(text, query, room);
  if (more) {
    pass.capped = true;
  }
  return parts.map(part => {
    if (!part.match) {
      return { text: part.text, hit: -1 };
    }
    pass.n += 1;
    return { text: part.text, hit: pass.n - 1 };
  });
}

function MarkedRuns({ text }: { text: string }) {
  const find = useContext(FindContext);
  const id = useId();
  if (find === null || find.query.length === 0) {
    return <>{text}</>;
  }

  return (
    <>
      {find
        .runOf(id, text)
        .map((part, index) =>
          part.hit < 0 ? (
            <Fragment key={index}>{part.text}</Fragment>
          ) : (
            <Hit key={index} text={part.text} index={part.hit} />
          ),
        )}
    </>
  );
}

function Hit({ text, index }: { text: string; index: number }) {
  const theme = useTheme();
  const find = useContext(FindContext);
  const isActive = find !== null && index === find.active;

  return (
    <mark
      data-find-hit={index}
      style={{
        color: 'inherit',
        backgroundColor: isActive ? theme.searchCurrent : theme.searchHit,
      }}
    >
      {text}
    </mark>
  );
}
