/**
 * One ```mermaid fence, drawn by Mermaid into the page.
 *
 * Until the drawing is done a short block is reserved. A fence that fails, or
 * that never finishes, yields to the caller, which shows the fence as source.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { mermaidConfig, renderMermaid } from '../mermaid';
import { useTheme } from '../theme';

const RENDER_WAIT_MS = 8_000;

const RESERVE_HEIGHT = 64;

type MermaidProps = {
  text: string;
  scale: number;
  bodyScale: number;
  fontFamily: string;
  onFail: () => void;
};

export function Mermaid({
  text,
  scale,
  bodyScale,
  fontFamily,
  onFail,
}: MermaidProps) {
  const theme = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const fail = useRef(onFail);
  fail.current = onFail;
  const config = useMemo(
    () => mermaidConfig({ theme, scale, bodyScale, fontFamily }),
    [theme, scale, bodyScale, fontFamily],
  );

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    // A diagram that never finishes falls back to source.
    const wait = setTimeout(() => {
      cancelled = true;
      fail.current();
    }, RENDER_WAIT_MS);

    renderMermaid(text, config)
      .then(next => {
        if (!cancelled) {
          clearTimeout(wait);
          setSvg(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(wait);
          fail.current();
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(wait);
    };
  }, [text, config]);

  if (svg === null) {
    return <div style={{ height: RESERVE_HEIGHT }} />;
  }

  return (
    <div
      role="img"
      className="mermaid-diagram"
      style={{ overflowX: 'auto' }}
      // Mermaid sanitises its own output at securityLevel 'strict'.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
