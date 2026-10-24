import { toNativePath, toViewerPath } from '../src/paths';

describe('toViewerPath', () => {
  it('keeps a POSIX path', () => {
    expect(toViewerPath('/Users/me/notes')).toBe('/Users/me/notes');
  });

  it('turns a Windows path into an absolute forward-slash path', () => {
    expect(toViewerPath('C:\\Users\\me\\notes')).toBe('/C:/Users/me/notes');
  });
});

describe('toNativePath', () => {
  it('round-trips both forms', () => {
    expect(toNativePath(toViewerPath('/Users/me/a.md'))).toBe('/Users/me/a.md');
    expect(toNativePath(toViewerPath('D:\\docs\\a.md'))).toBe('D:/docs/a.md');
  });
});
