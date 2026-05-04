import {
  hierarchy,
  treemap,
  treemapSquarify,
  type HierarchyRectangularNode,
} from 'd3-hierarchy';
import type { BundleNode } from './types';

export type TreemapNode = HierarchyRectangularNode<BundleNode>;

export interface BuildTreemapOptions {
  width: number;
  height: number;
  /** Padding between sibling cells. */
  padding?: number;
  /** Extra padding at the top of internal nodes for labels. */
  paddingTop?: number;
}

/**
 * Convert a `BundleNode` tree into a positioned d3 treemap layout.
 *
 * The size of each leaf is `BundleNode.size`; internal node values are
 * summed automatically by d3-hierarchy.
 */
export function buildTreemap(
  root: BundleNode,
  { width, height, padding = 2, paddingTop = 18 }: BuildTreemapOptions,
): TreemapNode {
  const h = hierarchy<BundleNode>(root)
    .sum((d) => (d.children && d.children.length > 0 ? 0 : d.size))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const layout = treemap<BundleNode>()
    .tile(treemapSquarify.ratio(1.4))
    .size([Math.max(1, width), Math.max(1, height)])
    .paddingInner(padding)
    .paddingOuter(padding)
    .paddingTop((d) => (d.depth === 0 ? 0 : paddingTop))
    .round(true);

  return layout(h);
}

/**
 * Top-level group (depth=1) of a node — used for stable colour assignment
 * so all descendants of `node_modules/react` share the same hue.
 */
export function topGroupName(node: TreemapNode): string {
  let n: TreemapNode = node;
  while (n.depth > 1 && n.parent) n = n.parent as TreemapNode;
  return n.data.name;
}

/**
 * Walk every node in the layout (including internal nodes).
 */
export function walk(node: TreemapNode, visit: (n: TreemapNode) => void): void {
  visit(node);
  if (node.children) {
    for (const c of node.children) walk(c as TreemapNode, visit);
  }
}

export function fullPath(node: TreemapNode): string {
  const parts: string[] = [];
  let n: TreemapNode | null = node;
  while (n && n.parent) {
    parts.unshift(n.data.name);
    n = n.parent as TreemapNode | null;
  }
  return parts.join('/');
}
