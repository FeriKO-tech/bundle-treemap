import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { scaleOrdinal } from 'd3-scale';
import { schemeTableau10 } from 'd3-scale-chromatic';
import { buildTreemap, fullPath, topGroupName } from '../lib/d3-treemap';
import type { BundleNode } from '../lib/types';
import { formatBytes, formatPercent } from '../lib/format-bytes';

interface TreemapProps {
  root: BundleNode;
  width?: number;
  height?: number;
  searchQuery?: string;
  hoveredPath?: string | null;
  onHover?: (path: string | null) => void;
  onMatchCountChange?: (count: number) => void;
}

interface TooltipState {
  x: number;
  y: number;
  path: string;
  name: string;
  group: string;
  size: number;
  gzipSize?: number;
  brotliSize?: number;
  ratio: number;
}

export default function Treemap({
  root,
  width = 1100,
  height = 560,
  searchQuery = '',
  hoveredPath,
  onHover,
  onMatchCountChange,
}: TreemapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const layout = useMemo(
    () => buildTreemap(root, { width, height, padding: 2, paddingTop: 18 }),
    [height, root, width],
  );

  const leaves = useMemo(
    () =>
      layout.leaves().filter((node) => {
        const w = node.x1 - node.x0;
        const h = node.y1 - node.y0;
        return w > 1 && h > 1;
      }),
    [layout],
  );

  const query = searchQuery.trim().toLowerCase();
  const matchCount = useMemo(() => {
    if (!query) return leaves.length;
    return leaves.filter((leaf) => {
      const path = fullPath(leaf).toLowerCase();
      const originalPath = leaf.data.path?.toLowerCase() ?? '';
      return path.includes(query) || originalPath.includes(query);
    }).length;
  }, [leaves, query]);

  useEffect(() => {
    onMatchCountChange?.(matchCount);
  }, [matchCount, onMatchCountChange]);

  const colour = useMemo(
    () => scaleOrdinal<string, string>().domain(leaves.map(topGroupName)).range(schemeTableau10),
    [leaves],
  );

  const showTooltip = (
    e: MouseEvent<SVGGElement>,
    path: string,
    name: string,
    group: string,
    size: number,
    ratio: number,
    gzipSize?: number,
    brotliSize?: number,
  ) => {
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      path,
      name,
      group,
      size,
      gzipSize,
      brotliSize,
      ratio,
    });
    onHover?.(path);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm dark:border-border-dark/60 dark:bg-bg-dark-subtle">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Bundle treemap"
        className="h-[560px] w-full"
      >
        <rect width={width} height={height} fill="transparent" />
        {layout.children?.map((group) => {
          const x = group.x0;
          const y = group.y0;
          const w = Math.max(0, group.x1 - group.x0);
          const h = Math.max(0, group.y1 - group.y0);
          if (w < 20 || h < 20) return null;
          return (
            <g key={`${group.data.name}-${x}-${y}`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={8}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.16}
              />
              <text
                x={x + 8}
                y={y + 13}
                className="fill-zinc-500 text-[10px] font-medium uppercase tracking-wide dark:fill-zinc-400"
              >
                {group.data.name}
              </text>
            </g>
          );
        })}
        {leaves.map((leaf) => {
          const x = leaf.x0;
          const y = leaf.y0;
          const w = Math.max(0, leaf.x1 - leaf.x0);
          const h = Math.max(0, leaf.y1 - leaf.y0);
          const area = w * h;
          const path = fullPath(leaf);
          const ratio = (leaf.value ?? 0) / (layout.value ?? 1);
          const group = topGroupName(leaf);
          const fill = colour(topGroupName(leaf));
          const canShowName = w > 70 && h > 28;
          const canShowSize = w > 88 && h > 44;
          const lowerPath = path.toLowerCase();
          const originalPath = leaf.data.path?.toLowerCase() ?? '';
          const isMatch = query ? lowerPath.includes(query) || originalPath.includes(query) : false;
          const isMuted = Boolean(query && !isMatch);
          const isHovered = hoveredPath === path || tooltip?.path === path;

          return (
            <g
              key={path}
              className="treemap-leaf cursor-crosshair"
              onMouseEnter={(e) =>
                showTooltip(
                  e,
                  path,
                  leaf.data.name,
                  group,
                  leaf.data.size,
                  ratio,
                  leaf.data.gzipSize,
                  leaf.data.brotliSize,
                )
              }
              onMouseMove={(e) =>
                showTooltip(
                  e,
                  path,
                  leaf.data.name,
                  group,
                  leaf.data.size,
                  ratio,
                  leaf.data.gzipSize,
                  leaf.data.brotliSize,
                )
              }
              onMouseLeave={() => {
                setTooltip(null);
                onHover?.(null);
              }}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={Math.min(7, Math.max(2, Math.sqrt(area) / 24))}
                fill={fill}
                fillOpacity={isMuted ? 0.18 : isHovered || isMatch ? 0.98 : 0.82}
                stroke={isHovered || isMatch ? '#ffffff' : 'rgba(255,255,255,0.34)'}
                strokeWidth={isHovered || isMatch ? 2 : 1}
                filter={isHovered || isMatch ? 'drop-shadow(0 0 8px rgba(255,255,255,0.45))' : undefined}
              />
              {canShowName && (
                <text
                  x={x + 7}
                  y={y + 14}
                  className="pointer-events-none fill-white text-[11px] font-medium drop-shadow-sm"
                  opacity={isMuted ? 0.35 : 1}
                >
                  {leaf.data.name.length > 32
                    ? `${leaf.data.name.slice(0, 29)}...`
                    : leaf.data.name}
                </text>
              )}
              {canShowSize && (
                <text
                  x={x + 7}
                  y={y + 29}
                  className="pointer-events-none fill-white/80 text-[10px] font-mono"
                  opacity={isMuted ? 0.35 : 1}
                >
                  {formatBytes(leaf.data.size)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 w-72 rounded-xl border border-border/70 bg-white/95 p-3 text-xs shadow-2xl backdrop-blur dark:border-border-dark dark:bg-zinc-950/95"
          style={{
            left: Math.min(tooltip.x + 16, window.innerWidth - 304),
            top: Math.min(tooltip.y + 16, window.innerHeight - 180),
          }}
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                {tooltip.name}
              </div>
              <div className="truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                {tooltip.path}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              {formatPercent(tooltip.ratio)}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <dt className="text-zinc-500 dark:text-zinc-400">Raw</dt>
            <dd className="text-right font-mono tabular-nums">{formatBytes(tooltip.size)}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Gzip</dt>
            <dd className="text-right font-mono tabular-nums">
              {tooltip.gzipSize ? formatBytes(tooltip.gzipSize) : '-'}
            </dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Brotli</dt>
            <dd className="text-right font-mono tabular-nums">
              {tooltip.brotliSize ? formatBytes(tooltip.brotliSize) : '-'}
            </dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Group</dt>
            <dd className="truncate text-right font-mono">{tooltip.group}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
