"use client";

import Link from "next/link";
import { createElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toCitedMarkdown } from "@/lib/public/chat-citations";
import type { PublicSourceCitation } from "@/lib/provenance/public-source-header";

export interface ChatAnswerMarkdownProps {
  content: string;
  sources?: readonly PublicSourceCitation[];
}

/**
 * Canonical Ask WTF answer renderer.
 *
 * Callers provide their own layout wrapper (including `.prose-chat`) while
 * this component keeps the Alpha Markdown, citation, and link contract shared
 * across public and authenticated conversations.
 */
export function ChatAnswerMarkdown({ content, sources = [] }: ChatAnswerMarkdownProps) {
  return createElement(
    ReactMarkdown,
    {
      remarkPlugins: [remarkGfm],
      components: {
        a: ({ href, children }) => href?.startsWith("/")
          ? createElement(Link, { href, className: "cite" }, children)
          : createElement("a", { href, target: "_blank", rel: "noreferrer" }, children),
      },
    },
    toCitedMarkdown(content, sources),
  );
}
