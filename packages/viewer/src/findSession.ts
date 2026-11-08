export interface FindSession {
  query: string;
  replacement: string;
  active: number;
  count: number;
  capped: boolean;
  // After a replace, the next current hit is the first source hit from here.
  resumeAt: number | null;
  replaceFocusKey: number;
}

export type FindEvent =
  | { type: 'reset' }
  | { type: 'queried'; query: string }
  | { type: 'replacementChanged'; replacement: string }
  | { type: 'chose'; active: number }
  | {
      type: 'counted';
      count: number;
      capped: boolean;
      starts?: readonly number[];
    }
  | { type: 'replacedOne'; resumeAt: number }
  | { type: 'replaceAsked' }
  | { type: 'replaceFocused' };

export const initialFindSession: FindSession = {
  query: '',
  replacement: '',
  active: 0,
  count: 0,
  capped: false,
  resumeAt: null,
  replaceFocusKey: 0,
};

export function clampActive(active: number, count: number): number {
  return count === 0 ? 0 : Math.min(active, count - 1);
}

export function stepActive(
  active: number,
  direction: number,
  count: number,
): number {
  return count <= 0 ? active : (active + direction + count) % count;
}

export function resumeIndex(starts: readonly number[], from: number): number {
  const next = starts.findIndex(start => start >= from);
  return next === -1 ? 0 : next;
}

export function replaceOneIn(
  text: string,
  start: number,
  query: string,
  replacement: string,
): { text: string; resumeAt: number } {
  return {
    text: text.slice(0, start) + replacement + text.slice(start + query.length),
    resumeAt: start + replacement.length,
  };
}

// The preview reports its count after every render, so an unchanged session must stay the same object.
function patch(state: FindSession, changes: Partial<FindSession>): FindSession {
  const keys = Object.keys(changes) as (keyof FindSession)[];
  return keys.every(key => state[key] === changes[key])
    ? state
    : { ...state, ...changes };
}

function counted(
  state: FindSession,
  count: number,
  capped: boolean,
  starts: readonly number[] | undefined,
): FindSession {
  if (starts !== undefined && state.resumeAt !== null) {
    return patch(state, {
      count,
      capped,
      active: resumeIndex(starts, state.resumeAt),
      resumeAt: null,
    });
  }
  return patch(state, {
    count,
    capped,
    active: clampActive(state.active, count),
  });
}

export function reduceFindSession(
  state: FindSession,
  event: FindEvent,
): FindSession {
  switch (event.type) {
    case 'reset':
      return patch(state, {
        query: '',
        active: 0,
        count: 0,
        capped: false,
        resumeAt: null,
      });
    case 'queried':
      return patch(state, { query: event.query, active: 0, resumeAt: null });
    case 'replacementChanged':
      return patch(state, { replacement: event.replacement });
    case 'chose':
      return patch(state, { active: event.active });
    case 'counted':
      return counted(state, event.count, event.capped, event.starts);
    case 'replacedOne':
      return patch(state, { resumeAt: event.resumeAt });
    case 'replaceAsked':
      return patch(state, { replaceFocusKey: state.replaceFocusKey + 1 });
    case 'replaceFocused':
      return patch(state, { replaceFocusKey: 0 });
  }
}
