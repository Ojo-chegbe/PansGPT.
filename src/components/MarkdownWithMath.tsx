import React, { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface MarkdownWithMathProps {
  content: string;
  role?: 'user' | 'system' | 'model';
}

// Auto-convert <sub>...</sub> and <sup>...</sup> to LaTeX math
function htmlSubSupToLatex(markdown: string): string {
  // Replace <sub>...</sub> with _{...} inside $...$
  markdown = markdown.replace(/([A-Za-z0-9\)\]\-\+])<sub>(.*?)<\/sub>/g, '$$$1_{$2}$$');
  // Replace <sup>...</sup> with ^{...} inside $...$
  markdown = markdown.replace(/([A-Za-z0-9\)\]\-\+])<sup>(.*?)<\/sup>/g, '$$$1^{$2}$$');
  // Collapse multiple adjacent $...$ into one (for inline math)
  markdown = markdown.replace(/\$\$([^\$]+)\$\$\s*\$\$([^\$]+)\$\$/g, '$$$1 $2$$');
  return markdown;
}

const MarkdownWithMath: React.FC<MarkdownWithMathProps> = React.memo(({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert HTML sub/sup to LaTeX and <br> to newlines
  let processedContent = htmlSubSupToLatex(content);
  processedContent = processedContent.replace(/<br\s*\/?>/gi, '\n');

  return (
    <div className="markdown-math" ref={containerRef}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        skipHtml={false}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownWithMath;