import { fireEvent, render, screen } from '@testing-library/react';

import { DocumentSearch } from '../src/components/DocumentSearch';

function renderSearch(): HTMLInputElement {
  render(
    <DocumentSearch
      query=""
      count={0}
      active={0}
      capped={false}
      onQuery={() => {}}
      onActive={() => {}}
    />,
  );
  return screen.getByRole('textbox', { name: 'Find in document' });
}

it.each([
  ['Command', { metaKey: true }],
  ['Control', { ctrlKey: true }],
])('focuses the field on %s-F', (_name, modifier) => {
  const field = renderSearch();

  const isDefault = fireEvent.keyDown(window, { key: 'f', ...modifier });

  expect(field).toHaveFocus();
  // The browser's own find would otherwise open over the page.
  expect(isDefault).toBe(false);
});

it('leaves focus alone on F without a modifier', () => {
  const field = renderSearch();

  fireEvent.keyDown(window, { key: 'f' });

  expect(field).not.toHaveFocus();
});
