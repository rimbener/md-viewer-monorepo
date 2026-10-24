import { DEFAULT_CHARACTERS } from './column';

/**
 * Font schemes for the document panel.
 *
 * No face is bundled. Each family is a CSS stack: the macOS face the scheme
 * was measured on comes first, and the stack falls back to a close face on
 * Windows and Linux, then to the generic family.
 *
 * Each role carries a `scale`, the multiplier that makes that family look the
 * same size as the system font. It is derived from measured x-height per em
 * (SF Pro 0.508, Charter 0.486, Iowan Old Style 0.486, Seravek 0.480,
 * Avenir Next 0.468), because point size alone does not predict apparent size.
 * A fallback face keeps the scale of the face it stands in for.
 *
 * `advance` is the measured average character width in ems, taken over a prose
 * sample rather than the alphabet so that letter frequency is accounted for.
 * It converts a target line length in characters into a column width in pixels.
 */

export interface FontRole {
  /** A CSS font stack. */
  family: string;
  scale: number;
  /** Average character advance, in ems. Only the body role's is read. */
  advance: number;
}

export interface FontScheme {
  id: string;
  name: string;
  /** One line explaining what the scheme is for, shown as a tooltip. */
  description: string;
  heading: FontRole;
  body: FontRole;
  code: FontRole;
}

export const SYSTEM_FONT =
  "system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, sans-serif";

/**
 * Menlo is the code font in every scheme: of the monospaced faces macOS ships
 * it is the only one with real bold *and* italic, both of which this renderer
 * needs for code spans inside headings and emphasis. Its x-height per em
 * (0.547) is the largest of any face here, which is why code sits a little
 * below body size rather than matching it.
 */
export const CODE_FONT =
  "Menlo, Consolas, 'DejaVu Sans Mono', 'Liberation Mono', monospace";

const CODE: FontRole = { family: CODE_FONT, scale: 1, advance: 0.6021 };

const SYSTEM: FontRole = { family: SYSTEM_FONT, scale: 1, advance: 0.4099 };

const CHARTER =
  "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif";
const IOWAN =
  "'Iowan Old Style', 'Palatino Linotype', Palatino, 'URW Palladio L', serif";
const AVENIR = "'Avenir Next', Avenir, 'Segoe UI', Montserrat, sans-serif";
const SERAVEK = "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, sans-serif";

/** Nominal body size, before zoom and per-scheme scaling. */
export const BODY_SIZE = 14;

/**
 * Width of the text column for a scheme at a given zoom and line length.
 * Because it is derived from the body font's own measurements, every scheme
 * yields the same number of characters per line rather than the same number
 * of pixels.
 */
export function columnWidth(
  scheme: FontScheme,
  zoom: number,
  characters: number = DEFAULT_CHARACTERS,
): number {
  const bodySize = BODY_SIZE * zoom * scheme.body.scale;
  return Math.round(characters * scheme.body.advance * bodySize);
}

export const FONT_SCHEMES: readonly FontScheme[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Charter body with system headings — long-form reading',
    heading: SYSTEM,
    body: { family: CHARTER, scale: 1.045, advance: 0.4362 },
    code: CODE,
  },
  {
    id: 'native',
    name: 'Native',
    description: 'The system font throughout',
    heading: SYSTEM,
    body: SYSTEM,
    code: CODE,
  },
  {
    id: 'humanist',
    name: 'Humanist',
    description: 'Seravek body with Avenir Next headings — sans throughout',
    heading: { family: AVENIR, scale: 1.085, advance: 0.4529 },
    body: { family: SERAVEK, scale: 1.058, advance: 0.4221 },
    code: CODE,
  },
  {
    id: 'book',
    name: 'Book',
    description: 'Iowan Old Style throughout — warmest for long specs',
    heading: { family: IOWAN, scale: 1.045, advance: 0.4454 },
    body: { family: IOWAN, scale: 1.045, advance: 0.4454 },
    code: CODE,
  },
];

export const DEFAULT_SCHEME_ID = 'editorial';

/** Falls back to the default for an unknown or missing id. */
export function schemeById(id: string | null): FontScheme {
  const found = FONT_SCHEMES.find(scheme => scheme.id === id);
  return (
    found ?? (FONT_SCHEMES.find(s => s.id === DEFAULT_SCHEME_ID) as FontScheme)
  );
}

/** The next scheme in the list, wrapping at the end. */
export function nextSchemeId(id: string): string {
  const index = FONT_SCHEMES.findIndex(scheme => scheme.id === id);
  return FONT_SCHEMES[(index + 1) % FONT_SCHEMES.length].id;
}

export function isSchemeId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    FONT_SCHEMES.some(scheme => scheme.id === value)
  );
}
