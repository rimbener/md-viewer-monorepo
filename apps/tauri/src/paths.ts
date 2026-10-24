/**
 * The viewer works in absolute `/`-separated paths. Windows paths start with
 * a drive letter instead, so they cross the boundary as `/C:/…`.
 */

const DRIVE = /^[A-Za-z]:/;

export function toViewerPath(native: string): string {
  const forward = native.replace(/\\/g, '/');
  return DRIVE.test(forward) ? `/${forward}` : forward;
}

export function toNativePath(path: string): string {
  return DRIVE.test(path.slice(1)) ? path.slice(1) : path;
}
