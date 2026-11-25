'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathTexProps {
  text: string;
  className?: string;
}

type Segment =
  | { type: 'display'; content: string }
  | { type: 'inline'; content: string }
  | { type: 'text'; content: string };

function normalizeStepFormatting(input: string): string {
  // Ensure **Step N:** or "Step N:" starts on a new line if embedded in prose
  return input
    .replace(/\s*(\*\*Step\s+\d+[:.]\*\*)/gi, '\n$1')
    .replace(/\s*(\*\*Final Answer[:.]\*\*)/gi, '\n$1')
    .replace(/^\n+/, '');
}

function tokenizeMath(input: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: input.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('$$') && token.endsWith('$$')) {
      segments.push({ type: 'display', content: token.slice(2, -2).trim() });
    } else {
      segments.push({ type: 'inline', content: token.slice(1, -1).trim() });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', content: input.slice(lastIndex) });
  }

  return segments;
}

function renderInlineText(text: string, keyPrefix: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    parts.forEach((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        nodes.push(
          <strong key={`${keyPrefix}-${lineIdx}-${partIdx}`}>
            {part.slice(2, -2)}
          </strong>
        );
      } else if (part) {
        nodes.push(
          <React.Fragment key={`${keyPrefix}-${lineIdx}-${partIdx}`}>
            {part}
          </React.Fragment>
        );
      }
    });
    if (lineIdx < lines.length - 1) {
      nodes.push(<div key={`${keyPrefix}-sp-${lineIdx}`} className="math-step-gap" />);
    }
  });

  return nodes;
}

export default function MathTex({ text, className }: MathTexProps) {
  const rendered = useMemo(() => {
    const normalized = normalizeStepFormatting(text);
    const segments = tokenizeMath(normalized);
    return segments.map((seg, idx) => {
      if (seg.type === 'display') {
        const html = katex.renderToString(seg.content, {
          displayMode: true,
          throwOnError: false,
        });
        return (
          <div
            key={idx}
            className="math-display"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      if (seg.type === 'inline') {
        const html = katex.renderToString(seg.content, {
          displayMode: false,
          throwOnError: false,
        });
        return (
          <span
            key={idx}
            className="math-inline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      return (
        <React.Fragment key={idx}>
          {renderInlineText(seg.content, String(idx))}
        </React.Fragment>
      );
    });
  }, [text]);

  return <div className={`math-prose ${className || ''}`}>{rendered}</div>;
}
