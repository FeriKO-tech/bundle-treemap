/**
 * Export the current treemap SVG as a standalone .svg or rasterized .png.
 *
 * The Treemap relies on Tailwind utility classes for text colors / opacity,
 * so we inline computed styles before serializing -- otherwise the exported
 * file would render with default browser styling.
 */

const PROPS_TO_INLINE = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
] as const;

function inlineStyles(source: SVGSVGElement): SVGSVGElement {
  const clone = source.cloneNode(true) as SVGSVGElement;
  const sourceNodes = source.querySelectorAll<SVGElement>('*');
  const cloneNodes = clone.querySelectorAll<SVGElement>('*');
  for (let i = 0; i < sourceNodes.length; i++) {
    const computed = window.getComputedStyle(sourceNodes[i]!);
    const target = cloneNodes[i]!;
    let inline = '';
    for (const prop of PROPS_TO_INLINE) {
      const value = computed.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'normal') {
        inline += `${prop}:${value};`;
      }
    }
    if (inline) target.setAttribute('style', inline);
  }
  // Make sure the clone has correct width/height attrs based on its viewBox
  // so the resulting file opens at full resolution.
  const vb = clone.getAttribute('viewBox');
  if (vb) {
    const [, , w, h] = vb.split(/\s+/).map(Number);
    if (w && h) {
      clone.setAttribute('width', String(w));
      clone.setAttribute('height', String(h));
    }
  }
  // Set xmlns attributes required for standalone SVGs.
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  return clone;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so the click has time to consume the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportSvg(svg: SVGSVGElement, filename = 'bundle-treemap.svg'): void {
  const clone = inlineStyles(svg);
  const xml = new XMLSerializer().serializeToString(clone);
  const withDoctype =
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` + xml;
  downloadBlob(new Blob([withDoctype], { type: 'image/svg+xml' }), filename);
}

export async function exportPng(
  svg: SVGSVGElement,
  filename = 'bundle-treemap.png',
  opts: { scale?: number; background?: string } = {},
): Promise<void> {
  const { scale = 2, background = '#0b0b0f' } = opts;
  const clone = inlineStyles(svg);
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const vb = clone.getAttribute('viewBox')?.split(/\s+/).map(Number);
    const width = vb?.[2] ?? img.naturalWidth ?? 1100;
    const height = vb?.[3] ?? img.naturalHeight ?? 560;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    await new Promise<void>((resolve, reject) => {
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error('Failed to encode PNG'));
          return;
        }
        downloadBlob(pngBlob, filename);
        resolve();
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load SVG into image'));
    img.src = src;
  });
}
