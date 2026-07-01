'use client';

import { useState, useCallback, useMemo } from 'react';
import { Copy, Check, Pencil, Eye } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';

interface CodeBlockProps {
  language: string;
  code: string;
  onChange: (data: { language: string; code: string }) => void;
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'sql', label: 'SQL' },
];

export function CodeBlock({ language, code, onChange }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(!code);

  const highlighted = useMemo(() => {
    if (!code) return '';
    const grammar = Prism.languages[language] ?? Prism.languages.javascript;
    if (!grammar) return code;
    return Prism.highlight(code, grammar, language);
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg bg-zinc-900 dark:bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <select
          value={language}
          onChange={(e) => onChange({ language: e.target.value, code })}
          className="text-xs bg-transparent text-zinc-400 border-none outline-none cursor-pointer"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-zinc-800"
            title={isEditing ? 'Vorschau' : 'Bearbeiten'}
          >
            {isEditing ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
          <button
            onClick={handleCopy}
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-zinc-800"
            title="Kopieren"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {isEditing ? (
        <textarea
          autoFocus={!code}
          value={code}
          onChange={(e) => onChange({ language, code: e.target.value })}
          placeholder="Code eingeben..."
          className="w-full bg-transparent text-zinc-100 font-mono text-sm p-4 outline-none resize-none min-h-[120px]"
          spellCheck={false}
        />
      ) : (
        <pre className="p-4 overflow-x-auto">
          <code
            className={`language-${language} text-sm font-mono`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      )}
    </div>
  );
}
