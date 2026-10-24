/**
 * Renders a ```gherkin fence as a feature rather than as source.
 *
 * The point of Gherkin is that it reads as prose, so it is set in the body
 * font: scenarios become cards, steps hang their keyword in a gutter, and an
 * Examples block becomes a real table. The code font is kept for the parts
 * that stand in for values — `<parameters>`, "strings" and doc strings — and
 * for the step keywords, which are fixed vocabulary rather than prose.
 */

import { useMemo, type CSSProperties, type ReactNode } from 'react';

import type {
  GherkinNode,
  GherkinSection,
  GherkinSpan,
} from '@md-viewer/markdown/gherkin';

import { useShowText } from '../find';
import { useTheme, type Theme } from '../theme';
import { BODY_SIZE, type FontScheme } from '../typography';

interface GherkinProps {
  nodes: GherkinNode[];
  /** Zoom factor, shared with the surrounding document. */
  scale: number;
  scheme: FontScheme;
  /** Vertical rhythm of the document, so a feature sits on the same grid. */
  spacing: number;
}

type GherkinStyles = ReturnType<typeof createStyles>;

function createStyles(scale: number, scheme: FontScheme) {
  const round = (value: number) => Math.round(value * 2) / 2;
  const size = (value: number) => round(value * scale * scheme.body.scale);
  const code = (value: number) => round(value * scale * scheme.code.scale);
  const heading = (value: number) =>
    round(value * scale * scheme.heading.scale);
  const label: CSSProperties = {
    fontFamily: scheme.body.family,
    fontSize: size(10.5),
    lineHeight: `${size(16)}px`,
    fontWeight: 700,
    letterSpacing: 0.9,
  };
  const body: CSSProperties = {
    fontFamily: scheme.body.family,
    fontSize: size(BODY_SIZE),
    lineHeight: `${size(21)}px`,
  };

  return {
    /** Between steps inside one scenario. */
    stepGap: size(5),
    sheet: {
      featureLabel: label,
      featureName: {
        fontFamily: scheme.heading.family,
        fontSize: heading(20),
        lineHeight: `${heading(27)}px`,
        fontWeight: 700,
      },
      ruleName: {
        fontFamily: scheme.heading.family,
        fontSize: heading(15),
        lineHeight: `${heading(22)}px`,
        fontWeight: 600,
      },
      ruleGroup: { borderLeft: '2px solid', paddingLeft: size(12) },
      scenario: { border: '1px solid', borderRadius: 6, padding: size(12) },
      scenarioName: { ...body, fontWeight: 600 },
      tagRow: { display: 'flex', flexWrap: 'wrap', gap: size(5) },
      tag: {
        fontFamily: scheme.code.family,
        fontSize: code(10.5),
        lineHeight: `${code(15)}px`,
        border: '1px solid',
        borderRadius: 4,
        padding: `0 ${size(5)}px`,
      },
      step: { display: 'flex', alignItems: 'flex-start' },
      stepKeyword: {
        flexShrink: 0,
        fontFamily: scheme.code.family,
        fontSize: code(12.5),
        // Body line height, so the keyword sits on the step text's baseline.
        lineHeight: `${size(21)}px`,
        fontWeight: 600,
        width: size(46),
        paddingRight: size(8),
        textAlign: 'right',
      },
      body: { ...body, flex: 1, minWidth: 0, whiteSpace: 'pre-wrap' },
      slot: { fontFamily: scheme.code.family, fontSize: code(12.5) },
      indented: { paddingLeft: size(46) },
      docString: {
        borderLeft: '2px solid',
        padding: `${size(2)}px 0 ${size(2)}px ${size(10)}px`,
      },
      docStringText: {
        margin: 0,
        fontFamily: scheme.code.family,
        fontSize: code(12.5),
        lineHeight: `${code(18)}px`,
        whiteSpace: 'pre-wrap',
      },
      comment: {
        fontFamily: scheme.body.family,
        fontSize: size(12.5),
        lineHeight: `${size(18)}px`,
        fontStyle: 'italic',
      },
      examplesLabel: { ...label, marginBottom: size(5) },
      examples: { marginTop: size(7) },
      table: {
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        border: '1px solid',
        borderRadius: 6,
        overflow: 'hidden',
      },
      tableCell: {
        padding: `${size(5)}px ${size(9)}px`,
        fontFamily: scheme.body.family,
        fontSize: size(13),
        lineHeight: `${size(19)}px`,
        textAlign: 'left',
        verticalAlign: 'top',
      },
    } satisfies Record<string, CSSProperties>,
  };
}

/** Children spaced by `gap`, the way the enclosing view lays out siblings. */
function Stack({
  gap,
  style,
  children,
}: {
  gap: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {children}
    </div>
  );
}

export function Gherkin({ nodes, scale, scheme, spacing }: GherkinProps) {
  const styles = useMemo(() => createStyles(scale, scheme), [scale, scheme]);
  const theme = useTheme();

  return (
    <Stack gap={spacing} style={{ marginBottom: spacing }}>
      <Nodes nodes={nodes} styles={styles} theme={theme} />
    </Stack>
  );
}

interface NodesProps {
  nodes: GherkinNode[];
  styles: GherkinStyles;
  theme: Theme;
}

/** Renders siblings in order; the enclosing stack's `gap` spaces them. */
function Nodes({ nodes, styles, theme }: NodesProps) {
  return (
    <>
      {nodes.map((node, index) => (
        <NodeView key={index} node={node} styles={styles} theme={theme} />
      ))}
    </>
  );
}

interface NodeProps {
  node: GherkinNode;
  styles: GherkinStyles;
  theme: Theme;
}

function NodeView({ node, styles, theme }: NodeProps) {
  const { sheet } = styles;
  const show = useShowText();

  switch (node.kind) {
    case 'section':
      return <SectionView section={node} styles={styles} theme={theme} />;

    case 'step':
      return (
        <div style={sheet.step}>
          <span style={{ ...sheet.stepKeyword, color: theme.gherkinKeyword }}>
            {show(node.keyword)}
          </span>
          <span style={{ ...sheet.body, color: theme.text }}>
            <Spans spans={node.spans} styles={styles} theme={theme} />
          </span>
        </div>
      );

    case 'table':
      return (
        <div style={sheet.indented}>
          <TableView node={node} styles={styles} theme={theme} />
        </div>
      );

    case 'docString':
      return (
        <div style={sheet.indented}>
          <div style={{ ...sheet.docString, borderLeftColor: theme.quoteBar }}>
            <pre style={{ ...sheet.docStringText, color: theme.mutedText }}>
              {show(node.text)}
            </pre>
          </div>
        </div>
      );

    case 'comment':
      return (
        <div style={{ ...sheet.comment, color: theme.mutedText }}>
          {show(node.text)}
        </div>
      );

    case 'description':
      return (
        <div style={{ ...sheet.body, color: theme.mutedText }}>
          {show(node.text)}
        </div>
      );
  }
}

interface SectionProps {
  section: GherkinSection;
  styles: GherkinStyles;
  theme: Theme;
}

function SectionView({ section, styles, theme }: SectionProps) {
  const { sheet, stepGap } = styles;
  const show = useShowText();
  const children = (
    <Nodes nodes={section.children} styles={styles} theme={theme} />
  );
  const tags = <Tags tags={section.tags} styles={styles} theme={theme} />;

  switch (section.rank) {
    case 0:
      return (
        <Stack gap={stepGap}>
          {tags}
          <div style={{ ...sheet.featureLabel, color: theme.accent }}>
            {show(section.keyword.toUpperCase())}
          </div>
          <div style={{ ...sheet.featureName, color: theme.text }}>
            {show(section.name)}
          </div>
          <Stack gap={stepGap * 2} style={{ marginTop: stepGap }}>
            {children}
          </Stack>
        </Stack>
      );

    case 1:
      return (
        <Stack gap={stepGap}>
          {tags}
          <div style={{ ...sheet.ruleName, color: theme.text }}>
            {show(`${section.keyword}: ${section.name}`)}
          </div>
          <Stack
            gap={stepGap * 2}
            style={{ ...sheet.ruleGroup, borderLeftColor: theme.border }}
          >
            {children}
          </Stack>
        </Stack>
      );

    case 2:
      return (
        <Stack
          gap={stepGap}
          style={{
            ...sheet.scenario,
            backgroundColor: theme.code,
            borderColor: theme.codeBorder,
          }}
        >
          {tags}
          <div style={{ ...sheet.scenarioName, color: theme.text }}>
            <span style={{ color: theme.mutedText }}>
              {show(`${section.keyword}: `)}
            </span>
            {show(section.name)}
          </div>
          <Stack gap={stepGap} style={{ marginTop: stepGap / 2 }}>
            {children}
          </Stack>
        </Stack>
      );

    case 3:
      return (
        <div style={sheet.examples}>
          {tags}
          <div style={{ ...sheet.examplesLabel, color: theme.mutedText }}>
            {show(section.keyword.toUpperCase())}
            {section.name.length > 0 ? show(` — ${section.name}`) : ''}
          </div>
          <Stack gap={stepGap}>{children}</Stack>
        </div>
      );
  }
}

interface TagsProps {
  tags: string[];
  styles: GherkinStyles;
  theme: Theme;
}

function Tags({ tags, styles, theme }: TagsProps) {
  const show = useShowText();
  if (tags.length === 0) {
    return null;
  }
  return (
    <div style={styles.sheet.tagRow}>
      {tags.map(tag => (
        <span
          key={tag}
          style={{
            ...styles.sheet.tag,
            color: theme.gherkinTag,
            borderColor: theme.gherkinTag,
          }}
        >
          {show(tag)}
        </span>
      ))}
    </div>
  );
}

interface TableProps {
  node: Extract<GherkinNode, { kind: 'table' }>;
  styles: GherkinStyles;
  theme: Theme;
}

function TableView({ node, styles, theme }: TableProps) {
  const { sheet } = styles;
  const columns = node.rows.reduce(
    (most, row) => Math.max(most, row.length),
    0,
  );

  return (
    <table style={{ ...sheet.table, borderColor: theme.border }}>
      <tbody>
        {node.rows.map((row, index) => {
          const isHeader = node.header && index === 0;
          const isLast = index === node.rows.length - 1;
          const Cell = isHeader ? 'th' : 'td';
          return (
            <tr
              key={index}
              style={{
                backgroundColor: isHeader
                  ? theme.tableHeader
                  : theme.background,
              }}
            >
              {Array.from({ length: columns }, (_, column) => (
                <Cell
                  key={column}
                  style={{
                    ...sheet.tableCell,
                    fontWeight: isHeader ? 600 : 400,
                    color: theme.text,
                    borderBottom: isLast
                      ? undefined
                      : `1px solid ${theme.border}`,
                    borderRight:
                      column === columns - 1
                        ? undefined
                        : `1px solid ${theme.border}`,
                  }}
                >
                  <Spans
                    spans={row[column] ?? []}
                    styles={styles}
                    theme={theme}
                  />
                </Cell>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

interface SpansProps {
  spans: GherkinSpan[];
  styles: GherkinStyles;
  theme: Theme;
}

function Spans({ spans, styles, theme }: SpansProps) {
  const { sheet } = styles;
  const show = useShowText();

  return (
    <>
      {spans.map((span, index) => {
        switch (span.kind) {
          case 'text':
            return show(span.text, index);
          case 'parameter':
            return (
              <span
                key={index}
                style={{ ...sheet.slot, color: theme.gherkinParameter }}
              >
                {show(span.text)}
              </span>
            );
          case 'string':
            return (
              <span
                key={index}
                style={{ ...sheet.slot, color: theme.gherkinString }}
              >
                {show(span.text)}
              </span>
            );
        }
      })}
    </>
  );
}
