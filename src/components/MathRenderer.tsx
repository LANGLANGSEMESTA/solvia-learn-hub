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

function renderMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}

export function MathRenderer({ text }: { text: string }) {
  if (!text) return null;

  const clean = text
    .replace(/\\text\{cdot\}/g, '\\cdot')
    .replace(/\\\$/g, '__DOLLAR__');

  const parts = clean.split(/(\$\$[\s\S]+?\$\$|\$(?:[^$]|\\.)+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("$$") && part.endsWith("$$"))
          return <BlockMath key={i} math={stripDelimiters(part)} />;
        if (part.startsWith("\\[") && part.endsWith("\\]"))
          return <BlockMath key={i} math={stripDelimiters(part)} />;
        if (part.startsWith("$") && part.endsWith("$"))
          return <InlineMath key={i} math={stripDelimiters(part)} />;
        if (part.startsWith("\\(") && part.endsWith("\\)"))
          return <InlineMath key={i} math={stripDelimiters(part)} />;
        const restored = part.replace(/__DOLLAR__/g, '$');
        return <span key={i}>{renderMarkdown(restored)}</span>;
      })}
    </span>
  );
}