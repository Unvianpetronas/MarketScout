"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders an assistant message as Markdown (bold, lists, headings, links, code,
 * tables) instead of raw text, so `**bold**` / `- item` no longer show literal
 * asterisks. Element styling is mapped inline to match the chat bubble's
 * typography (text-sm, gray-800) — no @tailwindcss/typography dependency needed.
 */
const COMPONENTS: Components = {
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-1 marker:text-[#059669]">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-1 marker:text-gray-400">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
  h1: ({ children }) => <h1 className="mt-2 mb-1.5 text-base font-bold text-gray-900">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-2 mb-1.5 text-[15px] font-bold text-gray-900">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-2 mb-1 text-sm font-semibold text-gray-900">{children}</h3>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[#047857] underline underline-offset-2 hover:text-[#059669]"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[#059669] pl-3 text-gray-600 italic">{children}</blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className || "");
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-lg bg-gray-900 p-3 font-mono text-xs text-gray-100">
          {children}
        </code>
      );
    }
    return <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.85em] text-[#047857]">{children}</code>;
  },
  pre: ({ children }) => <pre className="my-2">{children}</pre>,
  hr: () => <hr className="my-3 border-gray-200" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-gray-200 bg-gray-50 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-gray-200 px-2 py-1">{children}</td>,
};

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="text-sm text-gray-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
