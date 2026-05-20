import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export function MathRenderer({ text }: { text: string }) {
  if (!text) return null;

  // STEP 1: Clean various LaTeX errors
  const clean = text
    // Fix \text{cdot} → \cdot
    .replace(/\\text\{cdot\}/g, '\\cdot')
    // Fix escaped $ signs
    .replace(/\\\$/g, '$')
    // Fix nested/multiple delimiters - handle worst cases first
    .replace(/\\\(\\\$([\s\S]*?)\\\$\\\)/g, '$1$')  // \( $...$ \) → $...$
    .replace(/\\\[\\\$\\\$([\s\S]*?)\\\$\\\$\\\]/g, '$$$$1$$')  // \[ $$...$$ \] → $$...$$
    .replace(/\\\[\\\$([\s\S]*?)\\\$\\\]/g, '$$$$1$$')  // \[ $...$ \] → $$...$$
    // Fix multiple dollar signs ($$$$ → $$, $$$ → $$)
    .replace(/\$\$\$\$/g, '$$')
    .replace(/\$\$\$/g, '$$')
    // Fix escaped LaTeX delimiters
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']');

  // STEP 2: Auto-wrap if bare LaTeX commands found without delimiters
  const hasLatexCommands = /\\[a-zA-Z]+/.test(clean);
  const hasDelimiters = /\$|\\\(|\\\[/.test(clean);
  
  let processed = clean;
  if (hasLatexCommands && !hasDelimiters) {
    // Check if it's likely a display math (contains = or long expression)
    const isDisplayMath = /[=<>]/.test(clean) && clean.length > 30;
    processed = isDisplayMath ? `$$${clean}$$` : `$${clean}$`;
  }

  // STEP 3: Split by valid delimiters only (simplified regex)
  // Support: $...$, $$...$$, \(...\), \[...\]
  const parts = processed.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g);

  return (
    <span className="math-renderer">
      {parts.map((part, i) => {
        // Display math: $$...$$
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const latex = part.slice(2, -2).trim();
          // Extra clean inside
          const cleanLatex = latex
            .replace(/\\text\{cdot\}/g, '\\cdot')
            .replace(/\\\$/g, '$');
          return <BlockMath key={i} math={cleanLatex} />;
        }
        
        // Display math: \[...\]
        if (part.startsWith('\\[') && part.endsWith('\\]')) {
          const latex = part.slice(2, -2).trim();
          const cleanLatex = latex
            .replace(/\\text\{cdot\}/g, '\\cdot')
            .replace(/\\\$/g, '$');
          return <BlockMath key={i} math={cleanLatex} />;
        }
        
        // Inline math: $...$
        if (part.startsWith('$') && part.endsWith('$')) {
          const latex = part.slice(1, -1).trim();
          const cleanLatex = latex
            .replace(/\\text\{cdot\}/g, '\\cdot')
            .replace(/\\\$/g, '$');
          return <InlineMath key={i} math={cleanLatex} />;
        }
        
        // Inline math: \(...\)
        if (part.startsWith('\\(') && part.endsWith('\\)')) {
          const latex = part.slice(2, -2).trim();
          const cleanLatex = latex
            .replace(/\\text\{cdot\}/g, '\\cdot')
            .replace(/\\\$/g, '$');
          return <InlineMath key={i} math={cleanLatex} />;
        }
        
        // Plain text - but still check for any remaining LaTeX commands
        if (/\\[a-zA-Z]+/.test(part)) {
          // If there are still LaTeX commands, try to render as inline
          const cleanedPart = part
            .replace(/\\text\{cdot\}/g, '\\cdot')
            .replace(/\\\$/g, '$');
          return <InlineMath key={i} math={cleanedPart} />;
        }
        
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}