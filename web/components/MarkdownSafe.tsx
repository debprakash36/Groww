"use client";

import { Fragment, type ReactNode } from "react";

/**
 * Lightweight markdown: **bold**, `code`, and newlines. HTML is never parsed
 * (FR-22) — tags stay as text.
 */
export default function MarkdownSafe({ text }: { text: string }) {
  const blocks = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {blocks.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return <code key={i}>{part.slice(1, -1)}</code>;
        }
        return <Fragment key={i}>{splitLines(part)}</Fragment>;
      })}
    </>
  );
}

function splitLines(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <Fragment key={i}>
      {line}
      {i < lines.length - 1 ? <br /> : null}
    </Fragment>
  ));
}
