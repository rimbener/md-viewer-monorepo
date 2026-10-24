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
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';

import { MAX_MATCHES, splitMatches } from './search';
import { useTheme } from './theme';

/** Space left above the current hit when the view scrolls to it. */
const REVEAL_MARGIN = 48;

type FindContextValue = {
  query: string;
  active: number;
  remaining: () => number;
  claim: () => number;
  cap: () => void;
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
  const counter = useRef({ n: 0, capped: false });
  counter.current = { n: 0, capped: false };

  const remaining = useCallback(
    () => Math.max(0, MAX_MATCHES - counter.current.n),
    [],
  );
  const claim = useCallback(() => {
    if (counter.current.n >= MAX_MATCHES) {
      counter.current.capped = true;
      return -1;
    }
    const index = counter.current.n;
    counter.current.n += 1;
    return index;
  }, []);
  const cap = useCallback(() => {
    counter.current.capped = true;
  }, []);

  useEffect(() => {
    onCount(counter.current.n, counter.current.capped);
  });

  useEffect(() => {
    if (query.length > 0) {
      reveal(scrollRef.current, active);
    }
  }, [active, query, scrollRef]);

  return (
    <FindContext.Provider value={{ query, active, remaining, claim, cap }}>
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

function MarkedRuns({ text }: { text: string }) {
  const find = useContext(FindContext);
  if (find === null || find.query.length === 0) {
    return <>{text}</>;
  }

  const room = find.remaining();
  if (room === 0) {
    if (text.toLowerCase().includes(find.query.toLowerCase())) {
      find.cap();
    }
    return <>{text}</>;
  }

  const { parts, more } = splitMatches(text, find.query, room);
  if (more) {
    find.cap();
  }

  return (
    <>
      {parts.map((part, index) => {
        const hit = part.match ? find.claim() : -1;
        return hit < 0 ? (
          <Fragment key={index}>{part.text}</Fragment>
        ) : (
          <Hit key={index} text={part.text} index={hit} />
        );
      })}
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
