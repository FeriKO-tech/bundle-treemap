import { useMemo } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, MinusCircle, PlusCircle } from 'lucide-react';
import { buildDiffTree, type DiffNode, type DiffSummary } from '../lib/diff';
import { formatBytes, formatPercent } from '../lib/format-bytes';
import DiffTreemap from './DiffTreemap';

interface DiffViewProps {
  diff: DiffSummary;
}

const STATUS_LABEL: Record<DiffNode['status'], string> = {
  added: 'Added',
  removed: 'Removed',
  changed: 'Changed',
  unchanged: 'Unchanged',
};

function formatDelta(delta: number): string {
  if (delta === 0) return '0 B';
  const sign = delta > 0 ? '+' : '-';
  return `${sign}${formatBytes(Math.abs(delta))}`;
}

function deltaColor(delta: number): string {
  if (delta > 0) return 'text-amber-600 dark:text-amber-400';
  if (delta < 0) return 'text-emerald-600 dark:text-emerald-400';
  return 'text-zinc-500 dark:text-zinc-400';
}

function statusBadgeClass(status: DiffNode['status']): string {
  switch (status) {
    case 'added':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    case 'removed':
      return 'bg-red-500/15 text-red-700 dark:text-red-300';
    case 'changed':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
    case 'unchanged':
    default:
      return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300';
  }
}

export default function DiffView({ diff }: DiffViewProps) {
  const diffTree = useMemo(() => buildDiffTree(diff), [diff]);

  const totalRatio = diff.totalBefore > 0 ? diff.totalDelta / diff.totalBefore : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<ArrowRight size={14} />}
          label="Before"
          value={formatBytes(diff.totalBefore)}
        />
        <SummaryCard
          icon={<ArrowRight size={14} />}
          label="After"
          value={formatBytes(diff.totalAfter)}
        />
        <SummaryCard
          icon={diff.totalDelta >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          label="Delta"
          value={
            <>
              <span className={deltaColor(diff.totalDelta)}>
                {formatDelta(diff.totalDelta)}
              </span>
              <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                {formatPercent(totalRatio)}
              </span>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <CountCard
          icon={<PlusCircle size={14} className="text-emerald-500" />}
          label="Added"
          count={diff.added.length}
          total={diff.added.reduce((s, n) => s + n.afterSize, 0)}
        />
        <CountCard
          icon={<MinusCircle size={14} className="text-red-500" />}
          label="Removed"
          count={diff.removed.length}
          total={diff.removed.reduce((s, n) => s + n.beforeSize, 0)}
        />
        <CountCard
          icon={<ArrowUp size={14} className="text-amber-500" />}
          label="Changed"
          count={diff.changed.length}
          total={diff.changed.reduce((s, n) => s + Math.abs(n.delta), 0)}
        />
      </div>

      <DiffTreemap root={diffTree} />

      <div className="rounded-lg border border-border/60 dark:border-border-dark/60">
        <div className="border-b border-border/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-border-dark/60 dark:text-zinc-400">
          Top {Math.min(diff.topChanges.length, 20)} changes
        </div>
        {diff.topChanges.length === 0 ? (
          <p className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">
            No differences detected between the two bundles.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 dark:divide-border-dark/60">
            {diff.topChanges.map((change) => (
              <li
                key={change.path}
                className="flex items-center gap-3 px-4 py-2 text-sm"
              >
                <span
                  className={[
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                    statusBadgeClass(change.status),
                  ].join(' ')}
                >
                  {STATUS_LABEL[change.status]}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-600 dark:text-zinc-300">
                  {change.path}
                </span>
                <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {formatBytes(change.beforeSize)}
                </span>
                <ArrowRight size={12} className="shrink-0 text-zinc-400" />
                <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums">
                  {formatBytes(change.afterSize)}
                </span>
                <span
                  className={[
                    'w-24 shrink-0 text-right font-mono text-xs font-medium tabular-nums',
                    deltaColor(change.delta),
                  ].join(' ')}
                >
                  {formatDelta(change.delta)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-bg-subtle px-4 py-3 dark:border-border-dark/60 dark:bg-bg-dark-subtle">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

function CountCard({
  icon,
  label,
  count,
  total,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 dark:border-border-dark/60">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        <div className="font-mono text-sm tabular-nums">
          {count}{' '}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            ({formatBytes(total)})
          </span>
        </div>
      </div>
    </div>
  );
}
