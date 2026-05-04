import { useState } from 'react';
import { AlertCircle, FileCheck2, X } from 'lucide-react';
import DropZone, { type DroppedFile } from './components/DropZone';

export default function App() {
  const [file, setFile] = useState<DroppedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border/60 dark:border-border-dark/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 grid-cols-2 grid-rows-2 gap-0.5">
              <div className="rounded-sm bg-accent" />
              <div className="rounded-sm bg-accent-glow" />
              <div className="rounded-sm bg-accent-glow/60" />
              <div className="rounded-sm bg-accent" />
            </div>
            <h1 className="font-semibold tracking-tight">Bundle Treemap</h1>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            v0.1.0
          </span>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        {!file && (
          <DropZone
            onFile={(f) => {
              setError(null);
              setFile(f);
            }}
            onError={(msg) => setError(msg)}
          />
        )}
        {error && (
          <div className="flex max-w-2xl items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        {file && (
          <div className="flex w-full max-w-2xl items-center gap-3 rounded-lg border border-border/60 bg-bg-subtle px-4 py-3 dark:border-border-dark/60 dark:bg-bg-dark-subtle">
            <FileCheck2 size={18} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {(file.size / 1024).toFixed(1)} KB loaded · parser coming next
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Clear file"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
