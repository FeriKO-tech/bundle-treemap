import { useMemo } from 'react';
import { buildTreemap, fullPath } from '../lib/d3-treemap';
import type { BundleNode } from '../lib/types';
import { formatBytes } from '../lib/format-bytes';

interface DiffTreemapProps {
  root: BundleNode;
  width?: number;
  height?: number;
}

const STATUS_FILL: Record<string, string> = {
  added: '#10b981', // emerald-500
  removed: '#ef4444', // red-500
  changed: '#f59e0b', // amber-500
  unchanged: '#71717a', // zinc-500
};

function statusFromPath(path?: string): keyof typeof STATUS_FILL {
  if (path?.startsWith('status:')) {
    const tag = path.slice('status:'.length);
    if (tag in STATUS_FILL) return tag as keyof typeof STATUS_FILL;
  }
  return 'unchanged';
}

export default function DiffTreemap({
  root,
  width = 1100,
  height = 320,
}: DiffTreemapProps) {
  const layout = useMemo(
    () => buildTreemap(root, { width, height, padding: 2, paddingTop: 16 }),
    [height, root, width],
  );

  const leaves = useMemo(
    () =>
      layout
        .leaves()
        .filter((node) => node.x1 - node.x0 > 1 && node.y1 - node.y0 > 1),
    [layout],
  );

  if (leaves.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-white px-4 py-6 text-center text-sm text-zinc-500 dark:border-border-dark/60 dark:bg-bg-dark-subtle dark:text-zinc-400">
        No size differences to visualize.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm dark:border-border-dark/60 dark:bg-bg-dark-subtle">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-2 text-[11px] dark:border-border-dark/60">
        <span className="font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Diff treemap
        </span>
        <Legend color={STATUS_FILL.added} label="Added" />
        <Legend color={STATUS_FILL.removed} label="Removed" />
        <Legend color={STATUS_FILL.changed} label="Changed" />
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Bundle diff treemap"
        className="h-[320px] w-full"
      >
        {leaves.map((leaf) => {
          const x = leaf.x0;
          const y = leaf.y0;
          const w = Math.max(0, leaf.x1 - leaf.x0);
          const h = Math.max(0, leaf.y1 - leaf.y0);
          const path = fullPath(leaf);
          const status = statusFromPath(leaf.data.path);
          const fill = STATUS_FILL[status]!;
          const canShowName = w > 60 && h > 24;
          const canShowSize = w > 80 && h > 38;
          return (
            <g key={path} className="cursor-default">
              <title>{`${path} - ${status} (${formatBytes(leaf.data.size)})`}</title>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={4}
                fill={fill}
                fillOpacity={0.85}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1}
              />
              {canShowName && (
                <text
                  x={x + 6}
                  y={y + 13}
                  className="pointer-events-none fill-white text-[10px] font-medium drop-shadow-sm"
                >
                  {leaf.data.name.length > 30
                    ? `${leaf.data.name.slice(0, 27)}...`
                    : leaf.data.name}
                </text>
              )}
              {canShowSize && (
                <text
                  x={x + 6}
                  y={y + 27}
                  className="pointer-events-none fill-white/80 text-[9px] font-mono"
                >
                  {formatBytes(leaf.data.size)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
      <span
        className="h-2.5 w-2.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
