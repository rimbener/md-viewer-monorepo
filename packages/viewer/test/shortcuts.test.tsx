import { act, fireEvent, render } from '@testing-library/react';

import { useShortcut } from '../src/shortcuts';

type Handler = Parameters<typeof useShortcut>[1];
type Options = Parameters<typeof useShortcut>[2];

function Shortcut({
  name,
  handler,
  options,
}: {
  name: string;
  handler: Handler;
  options?: Options;
}) {
  useShortcut(name, handler, options);
  return null;
}

function press(init: KeyboardEventInit, target: Window | Element = window) {
  return fireEvent.keyDown(target, init);
}

it.each([
  ['Command', { metaKey: true }],
  ['Control', { ctrlKey: true }],
])('runs on %s and keeps the browser action off', (_name, modifier) => {
  const handler = vi.fn();
  render(<Shortcut name="s" handler={handler} />);

  const isDefault = press({ key: 'S', ...modifier });

  expect(handler).toHaveBeenCalledTimes(1);
  expect(isDefault).toBe(false);
});

it.each([
  ['no modifier', { key: 's' }],
  ['Alt', { key: 's', metaKey: true, altKey: true }],
  ['Shift', { key: 's', metaKey: true, shiftKey: true }],
  ['another key', { key: 'd', metaKey: true }],
])('lets %s pass', (_name, init) => {
  const handler = vi.fn();
  render(<Shortcut name="s" handler={handler} />);

  expect(press(init)).toBe(true);
  expect(handler).not.toHaveBeenCalled();
});

it('takes Shift when asked', () => {
  const handler = vi.fn();
  render(<Shortcut name="f" handler={handler} options={{ withShift: true }} />);

  expect(press({ key: 'F', metaKey: true, shiftKey: true })).toBe(false);
  expect(handler).toHaveBeenCalledTimes(1);
});

it('keeps the browser action off for a null handler', () => {
  render(<Shortcut name="s" handler={null} />);

  expect(press({ key: 's', metaKey: true })).toBe(false);
});

it('lets the key pass when the handler declines', () => {
  render(<Shortcut name="f" handler={() => false} />);

  expect(press({ key: 'f', metaKey: true })).toBe(true);
});

it('runs the latest handler after a rerender', () => {
  const first = vi.fn();
  const second = vi.fn();
  const { rerender } = render(<Shortcut name="e" handler={first} />);
  rerender(<Shortcut name="e" handler={second} />);

  press({ key: 'e', metaKey: true });

  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});

it('runs a first handler before the others, whatever the mount order', () => {
  const calls: string[] = [];
  render(
    <>
      <Shortcut name="f" handler={() => void calls.push('later')} />
      <Shortcut
        name="f"
        handler={() => void calls.push('first')}
        options={{ first: true }}
      />
    </>,
  );

  press({ key: 'f', metaKey: true });

  expect(calls).toEqual(['first', 'later']);
});

it('holds the later handlers until a promise settles', async () => {
  let settle = () => {};
  const done = new Promise<void>(resolve => (settle = resolve));
  const later = vi.fn();
  render(
    <>
      <Shortcut name="f" handler={later} />
      <Shortcut name="f" handler={() => done} options={{ first: true }} />
    </>,
  );

  expect(press({ key: 'f', metaKey: true })).toBe(false);
  expect(later).not.toHaveBeenCalled();

  await act(async () => {
    settle();
    await done;
  });

  expect(later).toHaveBeenCalledTimes(1);
});

it('lets the key pass after unmount', () => {
  const handler = vi.fn();
  const { unmount } = render(<Shortcut name="b" handler={handler} />);
  unmount();

  expect(press({ key: 'b', metaKey: true })).toBe(true);
  expect(handler).not.toHaveBeenCalled();
});

it('runs while a field has the focus', () => {
  const handler = vi.fn();
  const { container } = render(
    <>
      <input aria-label="Field" />
      <Shortcut name="g" handler={handler} />
    </>,
  );
  const field = container.querySelector('input') as HTMLInputElement;
  field.focus();

  press({ key: 'g', ctrlKey: true }, field);

  expect(handler).toHaveBeenCalledTimes(1);
});
