import React from 'react';

interface RichTextProps {
  text: string;
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="px-1 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[0.92em]">{part.slice(1, -1)}</code>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export const RichText: React.FC<RichTextProps> = ({ text }) => {
  const lines = String(text || '').split(/\r?\n/);

  return (
    <div className="space-y-2">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return <div key={index} className="h-1" />;
        if (line.startsWith('### ')) {
          return <h4 key={index} className="font-bold text-slate-900">{renderInline(line.slice(4))}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={index} className="text-base font-bold text-slate-900">{renderInline(line.slice(3))}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={index} className="text-lg font-extrabold text-slate-900">{renderInline(line.slice(2))}</h2>;
        }
        if (/^[-*]\s+/.test(line)) {
          return (
            <div key={index} className="flex items-start gap-2 pl-1">
              <span className="mt-[0.55em] h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              <span>{renderInline(line.replace(/^[-*]\s+/, ''))}</span>
            </div>
          );
        }
        return <p key={index}>{renderInline(line)}</p>;
      })}
    </div>
  );
};
