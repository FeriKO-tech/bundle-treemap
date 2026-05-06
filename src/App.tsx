import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  FileCheck2,
  GitCompareArrows,
  ImageDown,
  Sparkles,
  X,
} from 'lucide-react';
import DropZone, { type DroppedPayload } from './components/DropZone';
import DiffView from './components/DiffView';
import ModuleSearch from './components/ModuleSearch';
import ThemeToggle from './components/ThemeToggle';
import Treemap from './components/Treemap';
import { parseBundle, parseBundleFromFolder, ParseError } from './parsers';
import type { ParsedBundle, BundleNode } from './lib/types';
import { diffBundles } from './lib/diff';
import { exportPng, exportSvg } from './lib/export';
import { formatBytes } from './lib/format-bytes';
import { sampleViteReport } from './data/sample-vite-report';

const SOURCE_LABEL: Record<ParsedBundle['source'], string> = {
  'vite-visualizer': 'Vite (rollup-plugin-visualizer)',
  'webpack-analyzer': 'Webpack (bundle-analyzer)',
  'nextjs-analyze': 'Next.js (@next/bundle-analyzer)',
  folder: 'Build folder',
  unknown: 'Unknown source',
};

interface LoadedBundle {
  label: string;
  bundle: ParsedBundle;
}

function flattenLeaves(node: BundleNode, prefix = ''): Array<BundleNode & { fullPath: string }> {
  if (!node.children || node.children.length === 0) {
    const here = prefix ? `${prefix}/${node.name}` : node.name;
    return [{ ...node, fullPath: here }];
  }
  const nextPrefix = prefix ? `${prefix}/${node.name}` : '';
  return node.children.flatMap((c) => flattenLeaves(c, nextPrefix));
}

function parsePayload(payload: DroppedPayload): { bundle: ParsedBundle; label: string } {
  if (payload.kind === 'file') {
    const bundle = parseBundle({ filename: payload.file.name, text: payload.file.text });
    return { bundle, label: payload.file.name };
  }
  const bundle = parseBundleFromFolder(payload.folder);
  return { bundle, label: payload.folder.name + '/' };
}

export default function App() {
  const [primary, setPrimary] = useState<LoadedBundle | null>(null);
  const [secondary, setSecondary] = useState<LoadedBundle | null>(null);
  const [compareSlotOpen, setCompareSlotOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('bundle-treemap-theme');
    return stored === 'light' ? 'light' : 'dark';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const treemapSvgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('bundle-treemap-theme', theme);
  }, [theme]);

  const handlePayload = useCallback(
    (payload: DroppedPayload, slot: 'primary' | 'secondary' = 'primary') => {
      try {
        const { bundle, label } = parsePayload(payload);
        setError(null);
        if (slot === 'primary') {
          setPrimary({ bundle, label });
          setSearchQuery('');
          setHoveredPath(null);
        } else {
          setSecondary({ bundle, label });
          setCompareSlotOpen(false);
        }
      } catch (err) {
        const message =
          err instanceof ParseError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err);
        setError(message);
      }
    },
    [],
  );

  const loadSample = () => {
    handlePayload({
      kind: 'file',
      file: {
        name: sampleViteReport.name,
        size: JSON.stringify(sampleViteReport.data).length,
        text: JSON.stringify(sampleViteReport.data),
      },
    });
  };

  const diff = useMemo(
    () => (primary && secondary ? diffBundles(secondary.bundle, primary.bundle) : null),
    [primary, secondary],
  );

  const topModules = useMemo(() => {
    if (!primary) return [];
    return flattenLeaves(primary.bundle.root)
      .sort((a, b) => b.size - a.size)
      .slice(0, 20);
  }, [primary]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const handleExportSvg = () => {
    if (!treemapSvgRef.current) return;
    exportSvg(treemapSvgRef.current, 'bundle-treemap.svg');
  };
  const handleExportPng = async () => {
    if (!treemapSvgRef.current) return;
    try {
      await exportPng(treemapSvgRef.current, 'bundle-treemap.png', {
        background: theme === 'dark' ? '#0b0b0f' : '#ffffff',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const clearAll = () => {
    setPrimary(null);
    setSecondary(null);
    setCompareSlotOpen(false);
    setError(null);
    setSearchQuery('');
    setHoveredPath(null);
  };

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
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              v0.1.0
            </span>
            <ThemeToggle
              theme={theme}
              onToggle={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center gap-4 overflow-auto p-6">
        {!primary && (
          <div className="flex w-full flex-1 flex-col items-center justify-center gap-4">
            <DropZone
              onPayload={(p) => handlePayload(p, 'primary')}
              onError={(msg) => setError(msg)}
            />
            <button
              type="button"
              onClick={loadSample}
              className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:border-accent/60 hover:bg-accent/15"
            >
              <Sparkles size={16} />
              Load sample report
            </button>
          </div>
        )}
        {error && (
          <div className="flex w-full max-w-2xl items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 rounded p-1 hover:bg-red-500/10"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {primary && (
          <div className="w-full max-w-7xl space-y-4">
            <BundleHeader
              loaded={primary}
              onClose={clearAll}
              actions={
                <>
                  {!secondary && !compareSlotOpen && (
                    <button
                      type="button"
                      onClick={() => setCompareSlotOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-accent/60 hover:text-accent dark:border-border-dark/60 dark:text-zinc-200"
                    >
                      <GitCompareArrows size={14} /> Compare
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleExportSvg}
                    disabled={Boolean(diff)}
                    title={diff ? 'Export available on the single-bundle view' : 'Export current treemap as SVG'}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 dark:border-border-dark/60 dark:text-zinc-200"
                  >
                    <ImageDown size={14} /> SVG
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPng}
                    disabled={Boolean(diff)}
                    title={diff ? 'Export available on the single-bundle view' : 'Export current treemap as PNG'}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 dark:border-border-dark/60 dark:text-zinc-200"
                  >
                    <ImageDown size={14} /> PNG
                  </button>
                </>
              }
            />
            {secondary && (
              <BundleHeader
                loaded={secondary}
                badge="Baseline"
                onClose={() => setSecondary(null)}
              />
            )}
            {compareSlotOpen && !secondary && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  Drop a baseline report to compare against
                </p>
                <DropZone
                  compact
                  caption="baseline (e.g. main branch) - JSON or build folder"
                  onPayload={(p) => handlePayload(p, 'secondary')}
                  onError={(msg) => setError(msg)}
                />
                <button
                  type="button"
                  onClick={() => setCompareSlotOpen(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            )}

            {diff ? (
              <DiffView diff={diff} />
            ) : (
              <SingleBundleView
                bundle={primary.bundle}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                matchCount={matchCount}
                onMatchCountChange={setMatchCount}
                hoveredPath={hoveredPath}
                onHover={setHoveredPath}
                topModules={topModules}
                normalizedSearch={normalizedSearch}
                svgRef={treemapSvgRef}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

interface BundleHeaderProps {
  loaded: LoadedBundle;
  onClose: () => void;
  badge?: string;
  actions?: React.ReactNode;
}

function BundleHeader({ loaded, onClose, badge, actions }: BundleHeaderProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-bg-subtle px-4 py-3 dark:border-border-dark/60 dark:bg-bg-dark-subtle">
      <FileCheck2 size={18} className="shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{loaded.label}</p>
          {badge && (
            <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:border-border-dark/60 dark:text-zinc-400">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {SOURCE_LABEL[loaded.bundle.source]} · {loaded.bundle.moduleCount} modules · {formatBytes(loaded.bundle.totalSize)}
        </p>
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      <button
        type="button"
        onClick={onClose}
        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label="Clear"
      >
        <X size={16} />
      </button>
    </div>
  );
}

interface SingleBundleViewProps {
  bundle: ParsedBundle;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  matchCount: number;
  onMatchCountChange: (count: number) => void;
  hoveredPath: string | null;
  onHover: (path: string | null) => void;
  topModules: Array<BundleNode & { fullPath: string }>;
  normalizedSearch: string;
  svgRef: React.RefObject<SVGSVGElement>;
}

function SingleBundleView({
  bundle,
  searchQuery,
  onSearchChange,
  matchCount,
  onMatchCountChange,
  hoveredPath,
  onHover,
  topModules,
  normalizedSearch,
  svgRef,
}: SingleBundleViewProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total" value={formatBytes(bundle.totalSize)} />
        <Stat
          label="Gzipped"
          value={bundle.totalGzipSize ? formatBytes(bundle.totalGzipSize) : '-'}
        />
        <Stat label="Modules" value={bundle.moduleCount.toLocaleString()} />
      </div>
      <ModuleSearch
        value={searchQuery}
        matchCount={matchCount}
        onChange={onSearchChange}
      />
      <Treemap
        root={bundle.root}
        searchQuery={searchQuery}
        hoveredPath={hoveredPath}
        onHover={onHover}
        onMatchCountChange={onMatchCountChange}
        svgRef={svgRef}
      />
      <div className="rounded-lg border border-border/60 dark:border-border-dark/60">
        <div className="border-b border-border/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-border-dark/60 dark:text-zinc-400">
          Top 20 modules
        </div>
        <ul className="divide-y divide-border/60 dark:divide-border-dark/60">
          {topModules.map((m) => {
            const isHovered = hoveredPath === m.fullPath;
            const isMatch =
              normalizedSearch &&
              (m.fullPath.toLowerCase().includes(normalizedSearch) ||
                (m.path?.toLowerCase() ?? '').includes(normalizedSearch));
            return (
              <li
                key={m.fullPath}
                onMouseEnter={() => onHover(m.fullPath)}
                onMouseLeave={() => onHover(null)}
                className={[
                  'flex items-center gap-3 px-4 py-2 text-sm transition',
                  isHovered || isMatch
                    ? 'bg-accent/10'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40',
                ].join(' ')}
              >
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-600 dark:text-zinc-300">
                  {m.fullPath}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {((m.size / bundle.totalSize) * 100).toFixed(1)}%
                </span>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums">
                  {formatBytes(m.size)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
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
