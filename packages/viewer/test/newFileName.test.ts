import { newFileName } from '../src/newFileName';

it.each([
  ['notes', { name: 'notes.md' }],
  ['  notes.md  ', { name: 'notes.md' }],
  ['rules.mdc', { name: 'rules.mdc' }],
  ['README.MD', { name: 'README.MD' }],
  ['todo.txt', { name: 'todo.txt.md' }],
  ['', { error: 'Type a file name.' }],
  ['   ', { error: 'Type a file name.' }],
  ['a/b', { error: 'A file name cannot hold / or \\.' }],
  ['a\\b', { error: 'A file name cannot hold / or \\.' }],
  ['..', { error: 'That is not a file name.' }],
])('reads %j', (typed, expected) => {
  expect(newFileName(typed)).toEqual(expected);
});
