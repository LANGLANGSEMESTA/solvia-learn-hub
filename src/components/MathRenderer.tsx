import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

function stripDelimiters(text: string): string {
  return text.trim()
    .replace(/^\$\$/, '').replace(/\$\$$/, '')
    .replace(/^\$/, '').replace(/\$$/, '')
    .replace(/^\\\[/, '').replace(/\\\]$/, '')
    .replace(/^\\\(/, '').replace(/\\\)$/, '')
    .trim();
}

export function MathRenderer({ text }: { text: string }) {
  if (!text) return null;

  const clean = text
    .replace(/\\text\{cdot\}/g, '\\cdot')
    .replace(/\\\$/g, '$');

  const parts = clean.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("$$") && part.endsWith("$$"))
          return <BlockMath key={i} math={stripDelimiters(part)} />;
        if (part.startsWith("$") && part.endsWith("$"))
          return <InlineMath key={i} math={stripDelimiters(part)} />;
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}