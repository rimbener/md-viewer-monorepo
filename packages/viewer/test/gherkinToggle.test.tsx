/**
 * The "Render as gherkin" button, which lays out an unfenced feature.
 */

import { fireEvent, screen } from '@testing-library/react';

import {
  clickTarget,
  createFakePlatform,
  renderViewer,
  settle,
  storeSession,
} from './fakePlatform';

const FEATURE = [
  '# Acceptance criteria',
  '',
  'Feature: Rounds',
  '',
  '  @AC-1',
  '  Scenario: The round shows',
  '    Given the step has 4 rounds',
].join('\n');

beforeEach(() => {
  storeSession('/notes', '/notes/ac.md');
});

async function renderApp(): Promise<void> {
  await renderViewer(
    createFakePlatform(
      { '/notes': ['ac.md', 'plain.md'] },
      { '/notes/ac.md': FEATURE, '/notes/plain.md': '# Plain' },
    ),
  );
}

function button(): HTMLElement | null {
  return screen.queryByRole('button', {
    name: /^Render as (gherkin|markdown)$/,
  });
}

function hasChip(): boolean {
  return screen.queryByText('@AC-1', { exact: true }) !== null;
}

it('lays out an unfenced feature only on request, and back', async () => {
  await renderApp();
  expect(hasChip()).toBe(false);
  expect(button()).toHaveAccessibleName('Render as gherkin');

  fireEvent.click(button() as HTMLElement);
  expect(hasChip()).toBe(true);
  expect(screen.getByText('Rounds')).toBeTruthy();
  expect(button()).toHaveAccessibleName('Render as markdown');

  fireEvent.click(button() as HTMLElement);
  expect(hasChip()).toBe(false);
});

it('hides the button for a document with no unfenced feature', async () => {
  await renderApp();
  fireEvent.click(
    clickTarget(screen.getByRole('treeitem', { name: 'plain.md' })),
  );
  await settle();
  expect(button()).toBeNull();
});
