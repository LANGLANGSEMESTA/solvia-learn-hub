import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export function MathRenderer({ text }: { text: string }) {
  if (!text) return null;

  const clean = text
    .replace(/\\text\{cdot\}/g, '\\cdot')
    .replace(/\\\$/g, '$')
    .replace(/\\([\(\[\]\)])/g, '$1');

  const parts = clean.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("$$") && part.endsWith("$$"))
          return <BlockMath key={i} math={part.slice(2, -2).trim()} />;
        if (part.startsWith("$") && part.endsWith("$"))
          return <InlineMath key={i} math={part.slice(1, -1).trim()} />;
        if (part.startsWith("\\[") && part.endsWith("\\]"))
          return <BlockMath key={i} math={part.slice(2, -2).trim()} />;
        if (part.startsWith("\\(") && part.endsWith("\\)"))
          return <InlineMath key={i} math={part.slice(2, -2).trim()} />;
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}