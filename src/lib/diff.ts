import type { BundleNode, ParsedBundle } from './types';

/**
 * Per-module diff between two parsed bundles.
 *
 * `before` is the baseline (e.g. `main` branch); `after` is the new build.
 * A delta of +1024 means the module grew by 1 KB in `after`.
 */

export type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffNode {
  /** Path joined with `/`, e.g. `assets/index.js/node_modules/react`. */
  path: string;
  name: string;
  beforeSize: number;
  afterSize: number;
  delta: number;
  /** abs(delta) -- handy for sorting "biggest impact first". */
  absDelta: number;
  status: DiffStatus;
  children?: DiffNode[];
}

export interface DiffSummary {
  totalBefore: number;
  totalAfter: number;
  totalDelta: number;
  added: DiffNode[];
  removed: DiffNode[];
  changed: DiffNode[];
  /** Top-N changes (by abs delta) across added/removed/changed. */
  topChanges: DiffNode[];
}

function statusOf(beforeSize: number, afterSize: number): DiffStatus {
  if (beforeSize === 0 && afterSize > 0) return 'added';
  if (afterSize === 0 && beforeSize > 0) return 'removed';
  if (beforeSize !== afterSize) return 'changed';
  return 'unchanged';
}

function indexLeaves(
  node: BundleNode,
  prefix: string,
  out: Map<string, BundleNode & { fullPath: string }>,
): void {
  if (!node.children || node.children.length === 0) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    out.set(path, { ...node, fullPath: path });
    return;
  }
  const next = prefix ? `${prefix}/${node.name}` : node.name;
  for (const child of node.children) {
    indexLeaves(child, next, out);
  }
}

/** Build a flat path-to-leaf map for a parsed bundle. */
export function indexBundleLeaves(
  bundle: ParsedBundle,
): Map<string, BundleNode & { fullPath: string }> {
  const out = new Map<string, BundleNode & { fullPath: string }>();
  // Skip the synthetic root name when building paths so two reports with
  // different root labels can still be compared sensibly.
  if (bundle.root.children) {
    for (const child of bundle.root.children) {
      indexLeaves(child, '', out);
    }
  } else {
    indexLeaves(bundle.root, '', out);
  }
  return out;
}

/**
 * Compute a flat diff between two parsed bundles based on leaf paths.
 */
export function diffBundles(
  before: ParsedBundle,
  after: ParsedBundle,
): DiffSummary {
  const a = indexBundleLeaves(before);
  const b = indexBundleLeaves(after);
  const allPaths = new Set<string>([...a.keys(), ...b.keys()]);

  const added: DiffNode[] = [];
  const removed: DiffNode[] = [];
  const changed: DiffNode[] = [];

  for (const path of allPaths) {
    const beforeLeaf = a.get(path);
    const afterLeaf = b.get(path);
    const beforeSize = beforeLeaf?.size ?? 0;
    const afterSize = afterLeaf?.size ?? 0;
    const delta = afterSize - beforeSize;
    const status = statusOf(beforeSize, afterSize);
    if (status === 'unchanged') continue;
    const node: DiffNode = {
      path,
      name: afterLeaf?.name ?? beforeLeaf?.name ?? path.split('/').pop() ?? path,
      beforeSize,
      afterSize,
      delta,
      absDelta: Math.abs(delta),
      status,
    };
    if (status === 'added') added.push(node);
    else if (status === 'removed') removed.push(node);
    else changed.push(node);
  }

  const sortByAbsDelta = (x: DiffNode, y: DiffNode) => y.absDelta - x.absDelta;
  added.sort(sortByAbsDelta);
  removed.sort(sortByAbsDelta);
  changed.sort(sortByAbsDelta);

  const topChanges = [...added, ...removed, ...changed]
    .sort(sortByAbsDelta)
    .slice(0, 20);

  return {
    totalBefore: before.totalSize,
    totalAfter: after.totalSize,
    totalDelta: after.totalSize - before.totalSize,
    added,
    removed,
    changed,
    topChanges,
  };
}

/**
 * Build a hierarchical `BundleNode` whose `size` is `absDelta` and whose
 * `path` carries the diff status -- so the existing Treemap renders
 * "where the changes are" with stable layout. Color is decided by the caller
 * via the `path` field which encodes the status as `status:added`, etc.
 */
export function buildDiffTree(diff: DiffSummary): BundleNode {
  const root: BundleNode & { children: BundleNode[] } = {
    name: 'diff',
    size: 0,
    children: [],
  };

  type DirNode = BundleNode & { children: BundleNode[]; _byName: Map<string, DirNode> };
  const ensureDir = (parent: DirNode, name: string): DirNode => {
    let child = parent._byName.get(name);
    if (!child) {
      child = { name, size: 0, children: [], _byName: new Map() };
      parent._byName.set(name, child);
      parent.children.push(child);
    }
    return child;
  };

  const rootDir: DirNode = Object.assign(root, { _byName: new Map() });

  const allChanges = [...diff.added, ...diff.removed, ...diff.changed];
  for (const node of allChanges) {
    const parts = node.path.split('/');
    let cursor: DirNode = rootDir;
    for (let i = 0; i < parts.length - 1; i++) {
      cursor = ensureDir(cursor, parts[i]!);
    }
    const leaf: BundleNode = {
      name: parts[parts.length - 1]!,
      size: Math.max(1, node.absDelta),
      // We hijack `path` to carry the diff status to the renderer.
      path: `status:${node.status}`,
    };
    cursor.children.push(leaf);
  }

  // Strip the helper map before returning.
  const strip = (n: BundleNode & { _byName?: Map<string, DirNode> }) => {
    delete n._byName;
    if (n.children) for (const c of n.children) strip(c as DirNode);
  };
  strip(rootDir);

  // Aggregate sizes bottom-up.
  const aggregate = (n: BundleNode): number => {
    if (!n.children || n.children.length === 0) return n.size;
    n.size = n.children.reduce((sum, c) => sum + aggregate(c), 0);
    return n.size;
  };
  aggregate(root);

  return root;
}
