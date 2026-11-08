import { act, fireEvent, render, screen } from '@testing-library/react';

import { IconButton } from '../src/components/IconButton';
import { settle } from './fakePlatform';

type Selectable = HTMLElement & { selected: boolean };

function button(): Selectable {
  return screen.getByRole('button', { name: 'Pin' }) as Selectable;
}

it('links the tooltip to the button by id', () => {
  render(
    <IconButton
      icon="push_pin"
      label="Pin"
      tooltip="Pins it"
      onClick={() => {}}
    />,
  );
  const tooltip = document.querySelector('m3e-tooltip') as HTMLElement & {
    htmlFor: string;
  };

  expect(tooltip).toHaveTextContent('Pins it');
  expect(tooltip.htmlFor).toBe(button().id);
  expect(document.querySelector(`#${tooltip.htmlFor}`)).toBe(button());
});

it('leaves selected to the parent', async () => {
  const onClick = vi.fn();
  const { rerender } = render(
    <IconButton
      icon="push_pin"
      label="Pin"
      tooltip="Pins it"
      selected={false}
      onClick={onClick}
    />,
  );

  await act(async () => {
    fireEvent.click(button());
  });
  await settle();

  expect(onClick).toHaveBeenCalledTimes(1);
  expect(button().selected).toBe(false);

  rerender(
    <IconButton
      icon="push_pin"
      label="Pin"
      tooltip="Pins it"
      selected
      onClick={onClick}
    />,
  );
  await settle();

  expect(button().selected).toBe(true);
});

it('can be disabled', async () => {
  render(
    <IconButton
      icon="push_pin"
      label="Pin"
      tooltip="Pins it"
      disabled
      onClick={() => {}}
    />,
  );
  await settle();

  expect(button()).toBeDisabled();
});
