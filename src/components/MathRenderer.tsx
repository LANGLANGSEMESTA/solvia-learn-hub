import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export function MathRenderer({ text }: { text: string }) {
  if (!text) return null;

  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g);

  return (
    <span>
      {parts.map((part, i) => {
        if ((part.startsWith("$$") && part.endsWith("$$")) ||
            (part.startsWith("\\[") && part.endsWith("\\]"))) {
          const latex = part.startsWith("$$") ? part.slice(2, -2) : part.slice(2, -2);
          return <BlockMath key={i} math={latex.trim()} />;
        }
        if ((part.startsWith("$") && part.endsWith("$")) ||
            (part.startsWith("\\(") && part.endsWith("\\)"))) {
          const latex = part.startsWith("$") ? part.slice(1, -1) : part.slice(2, -2);
          return <InlineMath key={i} math={latex.trim()} />;
        }
        if (/\\[a-zA-Z]/.test(part) || /\^{/.test(part) || /_{/.test(part)) {
          return <InlineMath key={i} math={part.trim()} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}