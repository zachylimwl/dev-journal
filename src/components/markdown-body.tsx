// src/components/markdown-body.tsx
// React Server Component — react-markdown uses no hooks or browser APIs, RSC-safe.
// No 'use client' directive, no dynamic() import needed.
// prose-pre:p-0 prose-pre:bg-transparent prevents @tailwindcss/typography from
// overriding highlight.js github-dark #0d1117 background (RESEARCH.md Pitfall 1).
// github-dark.css is imported in globals.css (not here) for reliability.
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface Props {
  body: string;
  className?: string;
}

export default function MarkdownBody({ body, className }: Props) {
  return (
    <article className={`prose prose-pre:p-0 prose-pre:bg-transparent ${className ?? ''}`}>
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {body}
      </Markdown>
    </article>
  );
}
