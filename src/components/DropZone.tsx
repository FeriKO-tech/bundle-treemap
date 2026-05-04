import { useCallback, useRef, useState } from 'react';
import { FileJson, Upload } from 'lucide-react';

export interface DroppedFile {
  name: string;
  size: number;
  text: string;
}

interface DropZoneProps {
  onFile: (file: DroppedFile) => void;
  onError?: (message: string) => void;
}

const ACCEPTED_EXT = ['.json', '.html'];
const MAX_SIZE_MB = 50;

function isAccepted(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXT.some((ext) => lower.endsWith(ext));
}

export default function DropZone({ onFile, onError }: DropZoneProps) {
  const [isDragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isAccepted(file.name)) {
        onError?.(
          `Unsupported file type: ${file.name}. Drop a stats.json from rollup-plugin-visualizer, webpack-bundle-analyzer, or a .next/analyze HTML report.`,
        );
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        onError?.(`File too large (>${MAX_SIZE_MB} MB). Try a smaller report.`);
        return;
      }
      try {
        const text = await file.text();
        onFile({ name: file.name, size: file.size, text });
      } catch (err) {
        onError?.(
          `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    [onFile, onError],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragging(false);
  }, []);

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Drop a stats.json file or click to browse"
      className={[
        'group relative flex w-full max-w-2xl cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        isDragging
          ? 'border-accent bg-accent/5 shadow-glow'
          : 'border-border hover:border-accent/60 hover:bg-zinc-50 dark:border-border-dark dark:hover:border-accent/60 dark:hover:bg-bg-dark-subtle',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,.html,application/json,text/html"
        className="hidden"
        onChange={onPick}
      />
      <div
        className={[
          'grid h-14 w-14 place-items-center rounded-xl transition-colors',
          isDragging
            ? 'bg-accent text-white'
            : 'bg-zinc-100 text-zinc-500 group-hover:bg-accent/10 group-hover:text-accent dark:bg-bg-dark-subtle dark:text-zinc-400',
        ].join(' ')}
      >
        {isDragging ? <Upload size={22} /> : <FileJson size={22} />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {isDragging ? 'Release to load' : 'Drop a stats.json here'}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          or <span className="text-accent">click to browse</span> · supports
          Vite, Next.js and Webpack reports
        </p>
      </div>
      <ul className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
        <li className="rounded-full border border-border/60 px-2 py-0.5 dark:border-border-dark/60">
          rollup-plugin-visualizer
        </li>
        <li className="rounded-full border border-border/60 px-2 py-0.5 dark:border-border-dark/60">
          webpack-bundle-analyzer
        </li>
        <li className="rounded-full border border-border/60 px-2 py-0.5 dark:border-border-dark/60">
          .next/analyze
        </li>
      </ul>
    </div>
  );
}
