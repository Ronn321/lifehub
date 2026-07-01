'use client';

interface QuoteBlockProps {
  text: string;
  onChange: (data: { text: string }) => void;
}

export function QuoteBlock({ text, onChange }: QuoteBlockProps) {
  return (
    <div className="border-l-2 border-zinc-300 dark:border-zinc-600 pl-3 py-0.5">
      <textarea
        value={text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Zitat eingeben..."
        className="w-full bg-transparent border-none outline-none resize-none text-sm italic text-fg-muted min-h-[1.5em]"
      />
    </div>
  );
}
