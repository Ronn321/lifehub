'use client';

interface QuoteBlockProps {
  text: string;
  onChange: (data: { text: string }) => void;
}

export function QuoteBlock({ text, onChange }: QuoteBlockProps) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border-l-4 border-brand-500 p-4">
      <textarea
        value={text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Zitat eingeben..."
        className="w-full bg-transparent border-none outline-none resize-none text-sm italic text-fg-muted min-h-[40px]"
      />
    </div>
  );
}
