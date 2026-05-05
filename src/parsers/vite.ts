import type { BundleNode, ParsedBundle } from '../lib/types';
import { ParseError } from '../lib/types';

/**
 * Parser for `rollup-plugin-visualizer` JSON output (template = treemap | sunburst | network).
 *
 * Supports two shapes:
 *
 * 1. **Modern (v5+)** - { version, tree, nodes, nodeParts? } where leaves in `tree`
 *    carry a `uid` pointing into `nodes` for size info.
 *
 * 2. **Legacy / raw-tree** - a single tree node with embedded `size` / `children`,
 *    as produced by some older versions or custom emitters.
 */

interface RawTreeNode {
  name: string;
  uid?: string;
  size?: number;
  gzipSize?: number;
  brotliSize?: number;
  children?: RawTreeNode[];
}

interface RawNodeMeta {
  uid: string;
  renderedLength?: number;
  gzipLength?: number;
  brotliLength?: number;
}

interface ModernVisualizerJson {
  version?: number;
  tree: RawTreeNode;
  nodes: Record<string, RawNodeMeta>;
}

function isModernFormat(input: unknown): input is ModernVisualizerJson {
  if (typeof input !== 'object' || input === null) return false;
  const obj = input as Record<string, unknown>;
  return (
    typeof obj.tree === 'object' &&
    obj.tree !== null &&
    typeof obj.nodes === 'object' &&
    obj.nodes !== null
  );
}

function isLegacyTree(input: unknown): input is RawTreeNode {
  if (typeof input !== 'object' || input === null) return false;
  const obj = input as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    (Array.isArray(obj.children) || typeof obj.size === 'number')
  );
}

export function canParseVite(input: unknown): boolean {
  return isModernFormat(input) || isLegacyTree(input);
}

function convertModern(
  node: RawTreeNode,
  nodes: Record<string, RawNodeMeta>,
): BundleNode {
  // Leaf - has uid pointing into nodes meta.
  if (node.uid && nodes[node.uid]) {
    const meta = nodes[node.uid];
    return {
      name: node.name,
      size: meta.renderedLength ?? 0,
      gzipSize: meta.gzipLength,
      brotliSize: meta.brotliLength,
    };
  }

  // Internal - recurse and aggregate sizes from children.
  const children = (node.children ?? [])
    .map((c) => convertModern(c, nodes))
    .filter((c) => c.size > 0 || (c.children && c.children.length > 0));

  const size = children.reduce((sum, c) => sum + c.size, 0);
  const gzipSize = aggregate(children, 'gzipSize');
  const brotliSize = aggregate(children, 'brotliSize');

  return {
    name: node.name,
    size,
    gzipSize,
    brotliSize,
    children: children.length > 0 ? children : undefined,
  };
}

function convertLegacy(node: RawTreeNode): BundleNode {
  if (node.children && node.children.length > 0) {
    const children = node.children.map(convertLegacy);
    return {
      name: node.name,
      size: children.reduce((sum, c) => sum + c.size, 0),
      gzipSize: aggregate(children, 'gzipSize'),
      brotliSize: aggregate(children, 'brotliSize'),
      children,
    };
  }
  return {
    name: node.name,
    size: node.size ?? 0,
    gzipSize: node.gzipSize,
    brotliSize: node.brotliSize,
  };
}

function aggregate(
  children: BundleNode[],
  key: 'gzipSize' | 'brotliSize',
): number | undefined {
  let total = 0;
  let any = false;
  for (const c of children) {
    const v = c[key];
    if (typeof v === 'number') {
      total += v;
      any = true;
    }
  }
  return any ? total : undefined;
}

function countModules(node: BundleNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countModules(c), 0);
}

export function parseVite(input: unknown): ParsedBundle {
  let root: BundleNode;
  let version: number | undefined;

  if (isModernFormat(input)) {
    root = convertModern(input.tree, input.nodes);
    version = input.version;
  } else if (isLegacyTree(input)) {
    root = convertLegacy(input);
  } else {
    throw new ParseError(
      'Not a recognized rollup-plugin-visualizer JSON shape.',
    );
  }

  // Collapse a single root chunk wrapper if it adds nothing useful.
  if (
    root.children &&
    root.children.length === 1 &&
    (root.name === 'root' || root.name === '')
  ) {
    root = root.children[0]!;
  }

  return {
    source: 'vite-visualizer',
    root,
    totalSize: root.size,
    totalGzipSize: root.gzipSize,
    totalBrotliSize: root.brotliSize,
    moduleCount: countModules(root),
    meta: version !== undefined ? { version } : undefined,
  };
}
