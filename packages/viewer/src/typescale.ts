import type { CSSProperties } from 'react';

type TypescaleRole =
  'body-small' | 'body-medium' | 'label-small' | 'title-large';

/** The M3 type role that `m3e-theme` writes as `--md-sys-typescale-*`. */
export function typescale(role: TypescaleRole): CSSProperties {
  const token = `--md-sys-typescale-${role}`;
  return {
    fontSize: `var(${token}-font-size)`,
    fontWeight: `var(${token}-font-weight)`,
    lineHeight: `var(${token}-line-height)`,
    letterSpacing: `var(${token}-tracking)`,
  };
}
