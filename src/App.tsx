import { useMemo, useState } from 'react';
import { AlertCircle, FileCheck2, X } from 'lucide-react';
import DropZone, { type DroppedFile } from './components/DropZone';
import { parseBundle, ParseError } from './parsers';
import type { ParsedBundle, BundleNode } from './lib/types';
import { formatBytes, formatPercent } from './lib/format-bytes';

const SOURCE_LABEL: Record<ParsedBundle['source'], string> = {
  'vite-visualizer': 'Vite (rollup-plugin-visualizer)',
  'webpack-analyzer': 'Webpack (bundle-analyzer)',
  'nextjs-analyze': 'Next.js (@next/bundle-analyzer)',
  unknown: 'Unknown source',
};

function flattenLeaves(node: BundleNode, prefix = ''): Array<BundleNode & { fullPath: string }> {
  const here = prefix ? `${prefix}/${node.name}` : node.name;
  if (!node.children || node.children.length === 0) {
    return [{ ...node, fullPath: here }];
  }
  return node.children.flatMap((c) => flattenLeaves(c, here));
}

export default function App() {
  const [file, setFile] = useState<DroppedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bundle = useMemo<ParsedBundle | null>(() => {
    if (!file) return null;
    try {
      return parseBundle({ filename: file.name, text: file.text });
    } catch (err) {
      const message =
        err instanceof ParseError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      // Defer state update to next tick so we don't setState during render.
      queueMicrotask(() => setError(message));
      return null;
    }
  }, [file]);

  const topModules = useMemo(() => {
    if (!bundle) return [];
    return flattenLeaves(bundle.root)
      .sort((a, b) => b.size - a.size)
      .slice(0, 20);
  }, [bundle]);

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
        {file && bundle && (
          <div className="w-full max-w-3xl space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-bg-subtle px-4 py-3 dark:border-border-dark/60 dark:bg-bg-dark-subtle">
              <FileCheck2 size={18} className="shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {SOURCE_LABEL[bundle.source]} · {bundle.moduleCount} modules
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setError(null);
                }}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Clear file"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Total" value={formatBytes(bundle.totalSize)} />
              <Stat
                label="Gzipped"
                value={
                  bundle.totalGzipSize
                    ? formatBytes(bundle.totalGzipSize)
                    : '—'
                }
              />
              <Stat label="Modules" value={bundle.moduleCount.toLocaleString()} />
            </div>
            <div className="rounded-lg border border-border/60 dark:border-border-dark/60">
              <div className="border-b border-border/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-border-dark/60 dark:text-zinc-400">
                Top 20 modules
              </div>
              <ul className="divide-y divide-border/60 dark:divide-border-dark/60">
                {topModules.map((m) => (
                  <li
                    key={m.fullPath}
                    className="flex items-center gap-3 px-4 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-600 dark:text-zinc-300">
                      {m.fullPath}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {formatPercent(m.size / bundle.totalSize)}
                    </span>
                    <span className="w-20 shrink-0 text-right text-xs tabular-nums">
                      {formatBytes(m.size)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Treemap visualization coming next.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-bg-subtle px-4 py-3 dark:border-border-dark/60 dark:bg-bg-dark-subtle">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-medium tabular-nums">
        {value}
      </div>
    </div>
  );
}
