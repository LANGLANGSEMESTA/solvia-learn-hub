export function MathRenderer({ text }: { text: string }) {
  if (!text) return null;
  if (typeof window === "undefined") return <span>{text}</span>;
  
  const katex = (window as any).katex;
  if (!katex) return <span>{text}</span>;

  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g);

  return (
    <span>
      {parts.map((part, i) => {
        let latex = "";
        let display = false;

        if (part.startsWith("$$") && part.endsWith("$$")) { latex = part.slice(2, -2); display = true; }
        else if (part.startsWith("$") && part.endsWith("$")) { latex = part.slice(1, -1); }
        else if (part.startsWith("\\[") && part.endsWith("\\]")) { latex = part.slice(2, -2); display = true; }
        else if (part.startsWith("\\(") && part.endsWith("\\)")) { latex = part.slice(2, -2); }
        else if (/\\[a-zA-Z]/.test(part)) { latex = part; }
        else return <span key={i}>{part}</span>;

        try {
          const html = katex.renderToString(latex.trim(), { displayMode: display, throwOnError: false });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={i}>{part}</span>;
        }
      })}
    </span>
  );
}