/**
 * Renders a parsed markdown document as DOM.
 *
 * Every size is derived from a zoom factor and handed down through context, so
 * changing the zoom rebuilds one set of styles instead of touching each element.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';

import { isGherkin, parseGherkin } from '@md-viewer/markdown/gherkin';
import {
  highlight,
  languageOf,
  type TokenKind,
} from '@md-viewer/markdown/highlight';
import { hasScheme, resolveUri } from '@md-viewer/markdown/resolveUri';
import type {
  Block,
  CellAlignment,
  InlineNode,
} from '@md-viewer/markdown/types';

import { copyText } from '../clipboard';
import { useShowText } from '../find';
import { isMermaid, MERMAID_TEXT_CAP } from '../mermaid';
import { usePlatform } from '../platform';
import { useTheme, type Theme } from '../theme';
import { BODY_SIZE, schemeById, type FontScheme } from '../typography';
import { Gherkin } from './Gherkin';
import { Mermaid } from './Mermaid';

/** Vertical rhythm between sibling blocks, before zoom. */
const BLOCK_SPACING = 12;

/** How long the copy button says the copy is done. */
const COPIED_MS = 1500;

type MarkdownStyles = ReturnType<typeof createStyles>;

function createStyles(scale: number, scheme: FontScheme) {
  /** Rounds to a half pixel, which is as fine as the screen resolves. */
  const round = (value: number) => Math.round(value * 2) / 2;
  const heading = (value: number) =>
    round(value * scale * scheme.heading.scale);
  const size = (value: number) => round(value * scale * scheme.body.scale);
  const code = (value: number) => round(value * scale * scheme.code.scale);

  const headingStyle = (
    fontSize: number,
    lineHeight: number,
    fontWeight: number,
  ): CSSProperties => ({
    fontFamily: scheme.heading.family,
    fontSize: heading(fontSize),
    lineHeight: `${heading(lineHeight)}px`,
    fontWeight,
  });

  const paragraph: CSSProperties = {
    fontFamily: scheme.body.family,
    fontSize: size(BODY_SIZE),
    lineHeight: `${size(21)}px`,
  };

  return {
    scale,
    scheme,
    spacing: size(BLOCK_SPACING),
    headings: {
      1: headingStyle(26, 34, 700),
      2: headingStyle(20, 28, 700),
      3: headingStyle(17, 24, 600),
      4: headingStyle(15, 22, 600),
      5: headingStyle(14, 20, 600),
      6: headingStyle(13, 19, 600),
    } as Record<number, CSSProperties>,
    sheet: {
      paragraph,
      headingSpacing: { marginTop: size(10) },
      headingUnderline: { paddingBottom: size(6) },
      inlineCode: {
        fontFamily: scheme.code.family,
        fontSize: code(12.5),
        padding: '0 0.2em',
        borderRadius: 3,
      },
      codeBlock: {
        position: 'relative',
        border: '1px solid',
        borderRadius: 6,
        overflow: 'hidden',
      },
      codeCopy: { position: 'absolute', top: size(6), right: size(6) },
      codeText: {
        margin: 0,
        padding: size(12),
        overflowX: 'auto',
        fontFamily: scheme.code.family,
        fontSize: code(12.5),
        lineHeight: `${code(18)}px`,
      },
      quote: { margin: 0, borderLeft: '3px solid', paddingLeft: size(12) },
      list: { margin: 0, padding: 0, listStyle: 'none' },
      listItem: { display: 'flex', alignItems: 'flex-start' },
      looseItem: { marginBottom: size(BLOCK_SPACING) },
      tightItem: { marginBottom: 2 },
      bullet: { ...paragraph, flexShrink: 0, width: size(18) },
      orderedBullet: {
        width: size(26),
        paddingRight: size(6),
        textAlign: 'right',
      },
      listContent: { flex: 1, minWidth: 0 },
      rule: { height: 1, marginTop: 4, border: 'none' },
      tableFrame: {
        border: '1px solid',
        borderRadius: 6,
        overflowX: 'auto',
      },
      table: { width: '100%', borderCollapse: 'collapse' },
      tableCell: {
        ...paragraph,
        padding: `${size(6)}px ${size(10)}px`,
        verticalAlign: 'top',
      },
      image: { display: 'block', maxWidth: '100%', height: 'auto' },
      buttonRow: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: size(6),
        marginBottom: size(6),
      },
      smallButton: {
        border: '1px solid',
        borderRadius: 6,
        padding: `${size(2)}px ${size(8)}px`,
        fontFamily: scheme.body.family,
        fontSize: size(9),
        lineHeight: `${size(12)}px`,
      },
    } satisfies Record<string, CSSProperties>,
  };
}

const StyleContext = createContext<MarkdownStyles>(
  createStyles(1, schemeById(null)),
);

function useStyles(): MarkdownStyles {
  return useContext(StyleContext);
}

interface MarkdownProps {
  blocks: Block[];
  /** Directory of the document, used to resolve relative image paths. */
  basePath: string;
  /** Zoom factor; 1 is the natural size. */
  scale?: number;
  /** Font scheme id; an unknown one falls back to the default. */
  schemeId?: string | null;
}

export function Markdown({
  blocks,
  basePath,
  scale = 1,
  schemeId = null,
}: MarkdownProps) {
  const scheme = useMemo(() => schemeById(schemeId), [schemeId]);
  const styles = useMemo(() => createStyles(scale, scheme), [scale, scheme]);

  return (
    <StyleContext.Provider value={styles}>
      <BlockSequence blocks={blocks} basePath={basePath} />
    </StyleContext.Provider>
  );
}

interface SequenceProps {
  blocks: Block[];
  basePath: string;
  color?: string;
}

/** Renders blocks in order, spacing all but the last one. */
function BlockSequence({ blocks, basePath, color }: SequenceProps) {
  const { spacing } = useStyles();

  return (
    <>
      {blocks.map((block, index) => (
        <BlockView
          key={index}
          block={block}
          basePath={basePath}
          color={color}
          isFirst={index === 0}
          spacing={index === blocks.length - 1 ? 0 : spacing}
        />
      ))}
    </>
  );
}

interface BlockProps {
  block: Block;
  basePath: string;
  color?: string;
  isFirst: boolean;
  spacing: number;
}

function BlockView({ block, basePath, color, isFirst, spacing }: BlockProps) {
  const theme = useTheme();
  const { sheet, headings } = useStyles();
  const textColor = color ?? theme.text;

  switch (block.kind) {
    case 'heading': {
      const Tag = `h${block.level}` as const;
      const underlined = block.level <= 2;
      return (
        <Tag
          style={{
            ...headings[block.level],
            ...(isFirst ? { marginTop: 0 } : sheet.headingSpacing),
            color: block.level === 6 ? theme.mutedText : textColor,
            marginBottom: spacing,
            ...(underlined
              ? {
                  ...sheet.headingUnderline,
                  borderBottom: `1px solid ${theme.border}`,
                }
              : null),
          }}
        >
          <Inline nodes={block.content} color={textColor} />
        </Tag>
      );
    }

    case 'paragraph': {
      const image = imageOnly(block.content);
      if (image !== null) {
        return (
          <MarkdownImage node={image} basePath={basePath} spacing={spacing} />
        );
      }
      return (
        <p
          style={{
            ...sheet.paragraph,
            margin: 0,
            color: textColor,
            marginBottom: spacing,
            whiteSpace: 'pre-line',
          }}
        >
          <Inline nodes={block.content} color={textColor} />
        </p>
      );
    }

    case 'codeBlock':
      if (isGherkin(block.language)) {
        return <GherkinBlock text={block.text} spacing={spacing} />;
      }
      if (isMermaid(block.language) && block.text.length <= MERMAID_TEXT_CAP) {
        return <MermaidBlock text={block.text} spacing={spacing} />;
      }
      return (
        <CodeFence
          language={block.language}
          text={block.text}
          spacing={spacing}
        />
      );

    case 'quote':
      return (
        <blockquote
          style={{
            ...sheet.quote,
            borderLeftColor: theme.quoteBar,
            marginBottom: spacing,
          }}
        >
          <BlockSequence
            blocks={block.blocks}
            basePath={basePath}
            color={theme.mutedText}
          />
        </blockquote>
      );

    case 'list': {
      const List = block.ordered ? 'ol' : 'ul';
      return (
        <List style={{ ...sheet.list, marginBottom: spacing }}>
          {block.items.map((item, index) => (
            <li
              key={index}
              style={{
                ...sheet.listItem,
                ...(index === block.items.length - 1
                  ? null
                  : block.loose
                    ? sheet.looseItem
                    : sheet.tightItem),
              }}
            >
              <span
                aria-hidden
                style={{
                  ...sheet.bullet,
                  ...(block.ordered ? sheet.orderedBullet : null),
                  color: textColor,
                }}
              >
                {block.ordered ? `${block.start + index}.` : '•'}
              </span>
              <div style={sheet.listContent}>
                <BlockSequence
                  blocks={item.blocks}
                  basePath={basePath}
                  color={color}
                />
              </div>
            </li>
          ))}
        </List>
      );
    }

    case 'rule':
      return (
        <hr
          style={{
            ...sheet.rule,
            backgroundColor: theme.border,
            marginBottom: spacing,
            marginLeft: 0,
            marginRight: 0,
          }}
        />
      );

    case 'table':
      return (
        <div
          style={{
            ...sheet.tableFrame,
            borderColor: theme.border,
            marginBottom: spacing,
          }}
        >
          <table style={sheet.table}>
            <thead>
              <TableRow
                cells={block.header}
                alignments={block.alignments}
                theme={theme}
                isHeader
                isLast={block.rows.length === 0}
              />
            </thead>
            <tbody>
              {block.rows.map((row, index) => (
                <TableRow
                  key={index}
                  cells={row}
                  alignments={block.alignments}
                  theme={theme}
                  isLast={index === block.rows.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** Which colour of the theme stands for each kind of token. */
const TOKEN_COLOR: Record<TokenKind, keyof Theme> = {
  text: 'text',
  comment: 'syntaxComment',
  keyword: 'syntaxKeyword',
  string: 'syntaxString',
  constant: 'syntaxConstant',
  tag: 'syntaxTag',
  attribute: 'syntaxAttribute',
  function: 'syntaxFunction',
};

/** A fence shown as source: uniform, or tinted when its language is known. */
function CodeFence({
  language,
  text,
  spacing,
  isCopyable = true,
}: {
  language: string | null;
  text: string;
  spacing: number;
  isCopyable?: boolean;
}) {
  const theme = useTheme();
  const { sheet } = useStyles();

  return (
    <div
      style={{
        ...sheet.codeBlock,
        backgroundColor: theme.code,
        borderColor: theme.codeBorder,
        marginBottom: spacing,
      }}
    >
      <CodeText language={language} text={text} />
      {isCopyable ? (
        <div style={sheet.codeCopy}>
          <CopyButton text={text} />
        </div>
      ) : null}
    </div>
  );
}

/** A ```mermaid fence. A fence Mermaid cannot draw stays source. */
function MermaidBlock({ text, spacing }: { text: string; spacing: number }) {
  const { scale, scheme, sheet } = useStyles();
  const [asText, setAsText] = useState(false);

  return (
    <div style={{ marginBottom: spacing }}>
      <div style={sheet.buttonRow}>
        <CopyButton text={text} />
        <SmallButton
          label={asText ? 'View Diagram' : 'View Text'}
          onPress={() => setAsText(value => !value)}
        />
      </div>
      {asText ? (
        <CodeFence
          language="mermaid"
          text={text}
          spacing={0}
          isCopyable={false}
        />
      ) : (
        <Mermaid
          text={text}
          scale={scale}
          bodyScale={scheme.body.scale}
          fontFamily={scheme.body.family}
          onFail={() => setAsText(true)}
        />
      )}
    </div>
  );
}

/** Puts the fence text on the clipboard, then says so for a moment. */
function CopyButton({ text }: { text: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (reset.current !== null) {
        clearTimeout(reset.current);
      }
    },
    [],
  );

  const copy = async () => {
    if (!(await copyText(text))) {
      return;
    }
    setIsCopied(true);
    if (reset.current !== null) {
      clearTimeout(reset.current);
    }
    reset.current = setTimeout(() => {
      reset.current = null;
      setIsCopied(false);
    }, COPIED_MS);
  };

  return <SmallButton label={isCopied ? 'Copied' : 'Copy'} onPress={copy} />;
}

type SmallButtonProps = {
  label: string;
  onPress: () => void;
};

function SmallButton({ label, onPress }: SmallButtonProps) {
  const theme = useTheme();
  const { sheet } = useStyles();

  return (
    <button
      type="button"
      className="pressable"
      aria-label={label}
      onClick={onPress}
      style={{
        ...sheet.smallButton,
        borderColor: theme.border,
        backgroundColor: theme.background,
        color: theme.mutedText,
      }}
    >
      {label}
    </button>
  );
}

/** The body of a fence, tinted when its language is one we can read. */
function CodeText({
  language,
  text,
}: {
  language: string | null;
  text: string;
}) {
  const theme = useTheme();
  const { sheet } = useStyles();
  const show = useShowText();
  const tokens = useMemo(() => {
    const known = languageOf(language);
    return known === null ? null : highlight(text, known);
  }, [language, text]);

  return (
    <pre style={{ ...sheet.codeText, color: theme.text }}>
      <code>
        {tokens === null
          ? show(text)
          : tokens.map((token, index) =>
              token.kind === 'text' ? (
                show(token.text, index)
              ) : (
                <span
                  key={index}
                  style={{ color: theme[TOKEN_COLOR[token.kind]] }}
                >
                  {show(token.text)}
                </span>
              ),
            )}
      </code>
    </pre>
  );
}

/** A ```gherkin fence, reparsed as a feature and rendered as one. */
function GherkinBlock({ text, spacing }: { text: string; spacing: number }) {
  const { scale, scheme, sheet } = useStyles();
  const nodes = useMemo(() => parseGherkin(text), [text]);

  return (
    <div>
      <div style={sheet.buttonRow}>
        <CopyButton text={text} />
      </div>
      <Gherkin nodes={nodes} scale={scale} scheme={scheme} spacing={spacing} />
    </div>
  );
}

interface TableRowProps {
  cells: InlineNode[][];
  alignments: CellAlignment[];
  theme: Theme;
  isHeader?: boolean;
  isLast: boolean;
}

function TableRow({
  cells,
  alignments,
  theme,
  isHeader = false,
  isLast,
}: TableRowProps) {
  const { sheet } = useStyles();
  const Cell = isHeader ? 'th' : 'td';

  return (
    <tr
      style={{
        backgroundColor: isHeader ? theme.tableHeader : undefined,
        borderBottom: isLast ? undefined : `1px solid ${theme.border}`,
      }}
    >
      {cells.map((cell, index) => (
        <Cell
          key={index}
          style={{
            ...sheet.tableCell,
            fontWeight: isHeader ? 600 : 400,
            color: theme.text,
            textAlign: alignments[index] ?? 'left',
            borderRight:
              index === cells.length - 1
                ? undefined
                : `1px solid ${theme.border}`,
          }}
        >
          <Inline nodes={cell} color={theme.text} />
        </Cell>
      ))}
    </tr>
  );
}

interface InlineProps {
  nodes: InlineNode[];
  color: string;
}

function Inline({ nodes, color }: InlineProps) {
  const theme = useTheme();
  const platform = usePlatform();
  const { sheet } = useStyles();
  const show = useShowText();

  return (
    <>
      {nodes.map((node, index) => {
        switch (node.kind) {
          case 'text':
            return show(node.text, index);

          case 'strong':
            return (
              <strong key={index}>
                <Inline nodes={node.children} color={color} />
              </strong>
            );

          case 'emphasis':
            return (
              <em key={index}>
                <Inline nodes={node.children} color={color} />
              </em>
            );

          case 'strikethrough':
            return (
              <del key={index}>
                <Inline nodes={node.children} color={color} />
              </del>
            );

          case 'code':
            return (
              <code
                key={index}
                style={{
                  ...sheet.inlineCode,
                  backgroundColor: theme.code,
                  color: theme.inlineCode,
                }}
              >
                {show(node.text)}
              </code>
            );

          case 'link':
            return (
              <a
                key={index}
                href={node.href}
                style={{ color: theme.link, textDecoration: 'none' }}
                onClick={(event: MouseEvent) => {
                  event.preventDefault();
                  // Relative links point inside the document set, not the web.
                  if (hasScheme(node.href)) {
                    platform.openLink(node.href);
                  }
                }}
              >
                <Inline nodes={node.children} color={theme.link} />
              </a>
            );

          case 'image':
            // Images only render as blocks; inline ones fall back to alt text.
            return (
              <em key={index} style={{ color: theme.mutedText }}>
                {show(node.alt)}
              </em>
            );
        }
      })}
    </>
  );
}

interface MarkdownImageProps {
  node: Extract<InlineNode, { kind: 'image' }>;
  basePath: string;
  spacing: number;
}

function MarkdownImage({ node, basePath, spacing }: MarkdownImageProps) {
  const theme = useTheme();
  const platform = usePlatform();
  const { sheet } = useStyles();
  const show = useShowText();
  const [source, setSource] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSource(null);
    setIsLoaded(false);
    setFailed(false);
    platform
      .imageSource(resolveUri(node.src, basePath))
      .then(next => {
        if (!cancelled) {
          setSource(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [platform, node.src, basePath]);

  return (
    <div style={{ marginBottom: spacing }}>
      {/* Until the image loads there is no sensible box to reserve. */}
      {isLoaded ? null : (
        <p
          style={{
            ...sheet.paragraph,
            margin: 0,
            fontStyle: 'italic',
            color: theme.mutedText,
          }}
        >
          {show(failed ? `⚠︎ ${node.alt || node.src}` : node.alt)}
        </p>
      )}
      {source !== null && !failed ? (
        <img
          alt={node.alt}
          src={source}
          onLoad={() => setIsLoaded(true)}
          onError={() => setFailed(true)}
          style={isLoaded ? sheet.image : { display: 'none' }}
        />
      ) : null}
    </div>
  );
}

/** The single image of an image-only paragraph, if that is what this is. */
function imageOnly(
  nodes: InlineNode[],
): Extract<InlineNode, { kind: 'image' }> | null {
  const meaningful = nodes.filter(
    node => node.kind !== 'text' || node.text.trim().length > 0,
  );
  const [only] = meaningful;
  return meaningful.length === 1 && only.kind === 'image' ? only : null;
}
