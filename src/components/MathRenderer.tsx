import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export function MathRenderer({ text }: { text: string }) {
  if (!text) return null;

  // Simple cleaning - hanya fix error yang diketahui
  let cleanText = text;
  
  // Fix \text{cdot} → \cdot
  cleanText = cleanText.replace(/\\text\{cdot\}/g, '\\cdot');
  
  // Fix escaped $ signs
  cleanText = cleanText.replace(/\\\$/g, '$');
  
  // Fix multiple dollar signs ($$$$ → $$)
  cleanText = cleanText.replace(/\$\$\$\$/g, '$$');
  cleanText = cleanText.replace(/\$\$\$/g, '$$');
  
  // Jika tidak ada delimiter sama sekali tapi ada LaTeX commands, bungkus dengan $
  const hasLatexCommands = /\\[a-zA-Z]+/.test(cleanText);
  const hasDelimiters = /\$|\\\(|\\\[/.test(cleanText);
  
  if (hasLatexCommands && !hasDelimiters) {
    cleanText = `$${cleanText}$`;
  }

  // Split dengan regex yang lebih sederhana dan aman
  const parts = [];
  let remaining = cleanText;
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(remaining)) !== null) {
    // Teks sebelum match
    if (match.index > lastIndex) {
      parts.push(remaining.substring(lastIndex, match.index));
    }
    // Match yang ditemukan
    parts.push(match[0]);
    lastIndex = match.index + match[0].length;
  }
  
  // Sisa teks setelah match terakhir
  if (lastIndex < remaining.length) {
    parts.push(remaining.substring(lastIndex));
  }

  return (
    <span>
      {parts.map((part, i) => {
        // Display math $$...$$
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const latex = part.slice(2, -2);
          return <BlockMath key={i} math={latex} />;
        }
        
        // Display math \[...\]
        if (part.startsWith('\\[') && part.endsWith('\\]')) {
          const latex = part.slice(2, -2);
          return <BlockMath key={i} math={latex} />;
        }
        
        // Inline math $...$
        if (part.startsWith('$') && part.endsWith('$')) {
          const latex = part.slice(1, -1);
          return <InlineMath key={i} math={latex} />;
        }
        
        // Inline math \(...\)
        if (part.startsWith('\\(') && part.endsWith('\\)')) {
          const latex = part.slice(2, -2);
          return <InlineMath key={i} math={latex} />;
        }
        
        // Plain text
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// TAMBAHKAN DEFAULT EXPORT untuk berjaga-jaga
export default MathRenderer;