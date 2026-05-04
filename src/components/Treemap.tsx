import { useMemo } from 'react';
import { scaleOrdinal } from 'd3-scale';
import { schemeTableau10 } from 'd3-scale-chromatic';
import { buildTreemap, fullPath, topGroupName } from '../lib/d3-treemap';
import type { BundleNode } from '../lib/types';
import { formatBytes, formatPercent } from '../lib/format-bytes';

interface TreemapProps {
  root: BundleNode;
  width?: number;
  height?: number;
}

export default function Treemap({ root, width = 1100, height = 560 }: TreemapProps) {
  const layout = useMemo(
    () => buildTreemap(root, { width, height, padding: 2, paddingTop: 18 }),
    [height, root, width],
  );

  const leaves = layout.leaves().filter((node) => {
    const w = node.x1 - node.x0;
    const h = node.y1 - node.y0;
    return w > 1 && h > 1;
  });

  const colour = useMemo(
    () => scaleOrdinal<string, string>().domain(leaves.map(topGroupName)).range(schemeTableau10),
    [leaves],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm dark:border-border-dark/60 dark:bg-bg-dark-subtle">
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
          const fill = colour(topGroupName(leaf));
          const canShowName = w > 70 && h > 28;
          const canShowSize = w > 88 && h > 44;

          return (
            <g key={path}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={Math.min(7, Math.max(2, Math.sqrt(area) / 24))}
                fill={fill}
                fillOpacity={0.82}
                stroke="rgba(255,255,255,0.34)"
                strokeWidth={1}
              >
                <title>{`${path}\n${formatBytes(leaf.data.size)} · ${formatPercent(ratio)}`}</title>
              </rect>
              {canShowName && (
                <text
                  x={x + 7}
                  y={y + 14}
                  className="pointer-events-none fill-white text-[11px] font-medium drop-shadow-sm"
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
