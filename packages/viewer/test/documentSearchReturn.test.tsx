import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DocumentSearch } from '../src/components/DocumentSearch';

it('keeps the field focused after Return', async () => {
  const user = userEvent.setup();
  const onActive = vi.fn();
  render(
    <DocumentSearch
      query="alpha"
      count={2}
      active={0}
      capped={false}
      onQuery={() => {}}
      onActive={onActive}
    />,
  );
  const field = screen.getByRole('textbox', { name: 'Find in document' });
  await user.click(field);

  await user.keyboard('{Enter}');

  expect(onActive).toHaveBeenCalledWith(1);
  expect(field).toHaveFocus();
});
