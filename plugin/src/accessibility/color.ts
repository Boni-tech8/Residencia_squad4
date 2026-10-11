export interface RGB { r: number; g: number; b: number; }

export function rgbFromPaint(paint: Paint): RGB | null {
  if (paint.type !== 'SOLID' || paint.visible === false) return null;
  const opacity = paint.opacity ?? 1;
  const a = paint.color;
  return { r: a.r * opacity, g: a.g * opacity, b: a.b * opacity };
}

function linear(v: number): number {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function luminance(c: RGB): number {
  return 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export function firstSolidPaint(node: GeometryMixin | TextNode): Paint | null {
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills)) return null;
  return fills.find((p) => p.type === 'SOLID' && p.visible !== false) ?? null;
}

export function solidRGB(node: GeometryMixin | TextNode): RGB | null {
  const paint = firstSolidPaint(node);
  return paint ? rgbFromPaint(paint) : null;
}

export function setSolidColor(node: GeometryMixin | TextNode, rgb: RGB): void {
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills)) return;
  const next = fills.map((p) => p.type === 'SOLID' ? { ...p, color: rgb } : p);
  node.fills = next;
}
