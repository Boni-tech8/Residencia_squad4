export type Severity = 'critical' | 'warning' | 'info';

export interface Issue {
  id: string;
  ruleId: string;
  severity: Severity;
  title: string;
  description: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  wcag?: string;
  fixable: boolean;
  fixLabel?: string;
  fixAction?: 'set-accessible-name' | 'set-alt-text' | 'adjust-text-contrast';
  suggestedValue?: string;
}

export interface AnalysisResult {
  root: { id: string; name: string; type: string; width: number; height: number };
  stats: { critical: number; warning: number; info: number; conforming: number; nodes: number };
  issues: Issue[];
  metadata: { accessibleName: string; altText: string; role: string };
}

function childrenOf(node: SceneNode): readonly SceneNode[] {
  return 'children' in node ? node.children : [];
}

function walk(node: SceneNode, output: SceneNode[]) {
  output.push(node);
  for (const child of childrenOf(node)) walk(child, output);
}

function pluginData(node: BaseNode): { accessibleName: string; altText: string; role: string } {
  return {
    accessibleName: node.getPluginData('a11y:accessibleName'),
    altText: node.getPluginData('a11y:altText'),
    role: node.getPluginData('a11y:role')
  };
}

function solidPaint(node: SceneNode): SolidPaint | null {
  if (!('fills' in node) || node.fills === figma.mixed || !Array.isArray(node.fills)) return null;
  const paint = node.fills.find(p => p.type === 'SOLID' && p.visible !== false) as SolidPaint | undefined;
  return paint || null;
}

function luminanceChannel(value: number) {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(rgb: RGB) {
  return 0.2126 * luminanceChannel(rgb.r * 255) + 0.7152 * luminanceChannel(rgb.g * 255) + 0.0722 * luminanceChannel(rgb.b * 255);
}

function contrastRatio(a: RGB, b: RGB) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function parentBackground(node: SceneNode): SolidPaint | null {
  let parent = node.parent;
  while (parent && parent.type !== 'PAGE' && parent.type !== 'DOCUMENT') {
    const paint = solidPaint(parent);
    if (paint) return paint;
    parent = parent.parent;
  }
  return null;
}

function textContrastIssue(node: TextNode): Issue | null {
  const textPaint = solidPaint(node);
  const bgPaint = parentBackground(node);
  if (!textPaint || !bgPaint) return null;
  const ratio = contrastRatio(textPaint.color, bgPaint.color);
  if (ratio >= 4.5) return null;
  const suggested = ratio >= 3 ? 'increase contrast' : 'black or white';
  return {
    id: `V-01-${node.id}`,
    ruleId: 'V-01',
    severity: 'critical',
    title: 'Contraste insuficiente',
    description: `A relação de contraste calculada é ${ratio.toFixed(2)}:1. Para texto normal, o MVP exige pelo menos 4.5:1.`,
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    wcag: 'WCAG 1.4.3',
    fixable: true,
    fixLabel: `Ajustar contraste (${suggested})`,
    fixAction: 'adjust-text-contrast'
  };
}

function isControlName(name: string) {
  return /(^|[\s/_-])(button|btn|cta|botão)([\s/_-]|$)/i.test(name) || /^(button|btn|cta|botão)$/i.test(name);
}

function isImageNode(node: SceneNode) {
  if (!('fills' in node) || node.fills === figma.mixed || !Array.isArray(node.fills)) return false;
  return node.fills.some(p => p.type === 'IMAGE');
}

function metadataIssues(node: SceneNode): Issue[] {
  const data = pluginData(node);
  const issues: Issue[] = [];

  if (isControlName(node.name) && !data.accessibleName) {
    const text = 'children' in node ? node.children.filter(c => c.type === 'TEXT').map(c => (c as TextNode).characters.trim()).filter(Boolean).join(' ') : '';
    issues.push({
      id: `V-02-${node.id}`,
      ruleId: 'V-02',
      severity: 'critical',
      title: 'Controle sem nome acessível',
      description: text ? `O controle parece ter o texto “${text}”, mas ainda não possui metadata de nome acessível.` : 'O elemento parece ser um controle e não possui um nome acessível definido.',
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      wcag: 'WCAG 4.1.2',
      fixable: true,
      fixLabel: text ? `Usar “${text}” como nome` : 'Definir nome acessível',
      fixAction: 'set-accessible-name',
      suggestedValue: text || node.name.replace(/[_-]/g, ' ')
    });
  }

  if (isImageNode(node) && !data.altText) {
    issues.push({
      id: `V-03-${node.id}`,
      ruleId: 'V-03',
      severity: 'warning',
      title: 'Imagem sem texto alternativo',
      description: 'A imagem não possui metadata de texto alternativo. O MVP solicita uma descrição antes do handoff.',
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      wcag: 'WCAG 1.1.1',
      fixable: true,
      fixLabel: 'Usar nome da camada como alt text',
      fixAction: 'set-alt-text',
      suggestedValue: node.name
    });
  }

  return issues;
}


export interface BackendNodeSnapshot {
  id: string;
  name: string;
  type: string;
  accessibleName: string;
  altText: string;
  ariaLabel?: string;
  isInteractive: boolean;
  isImage: boolean;
  contrastRatio?: number;
  children?: BackendNodeSnapshot[];
}

function isImageForBackend(node: SceneNode) {
  return isImageNode(node);
}

function isInteractiveForBackend(node: SceneNode) {
  return isControlName(node.name);
}

function contrastForBackend(node: TextNode) {
  const textPaint = solidPaint(node);
  const bgPaint = parentBackground(node);
  if (!textPaint || !bgPaint) return undefined;
  return contrastRatio(textPaint.color, bgPaint.color);
}

export function toBackendNode(node: SceneNode): BackendNodeSnapshot {
  const data = pluginData(node);
  const snapshot: BackendNodeSnapshot = {
    id: node.id,
    name: node.name,
    type: node.type,
    accessibleName: data.accessibleName,
    altText: data.altText,
    isInteractive: isInteractiveForBackend(node),
    isImage: isImageForBackend(node)
  };

  if (node.type === 'TEXT') {
    snapshot.contrastRatio = contrastForBackend(node);
  }

  if ('children' in node) {
    snapshot.children = node.children.map(child => toBackendNode(child));
  }

  return snapshot;
}

export function analyzeNode(root: SceneNode): AnalysisResult {
  const nodes: SceneNode[] = [];
  walk(root, nodes);
  const issues: Issue[] = [];

  for (const node of nodes) {
    if (node.type === 'TEXT') {
      const contrast = textContrastIssue(node);
      if (contrast) issues.push(contrast);
    }
    issues.push(...metadataIssues(node));
  }

  const stats = {
    critical: issues.filter(i => i.severity === 'critical').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
    conforming: Math.max(nodes.length - new Set(issues.map(i => i.nodeId)).size, 0),
    nodes: nodes.length
  };

  return {
    root: { id: root.id, name: root.name, type: root.type, width: root.width, height: root.height },
    stats,
    issues,
    metadata: pluginData(root)
  };
}

function setSolidPaint(node: TextNode, color: RGB) {
  const existing = solidPaint(node);
  const paint: SolidPaint = { type: 'SOLID', color, opacity: existing?.opacity ?? 1 };
  node.fills = [paint];
}

export async function fixIssue(issue: Issue): Promise<string> {
  const node = await figma.getNodeByIdAsync(issue.nodeId);
  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('O elemento da ocorrência não existe mais.');

  if (issue.fixAction === 'set-accessible-name') {
    node.setPluginData('a11y:accessibleName', issue.suggestedValue || node.name);
    return 'Nome acessível salvo no elemento.';
  }

  if (issue.fixAction === 'set-alt-text') {
    node.setPluginData('a11y:altText', issue.suggestedValue || node.name);
    return 'Alt text salvo no elemento.';
  }

  if (issue.fixAction === 'adjust-text-contrast') {
    if (node.type !== 'TEXT') throw new Error('A ocorrência de contraste não pertence a um texto.');
    const bg = parentBackground(node);
    if (!bg) throw new Error('Não foi possível determinar o fundo do texto.');
    const black: RGB = { r: 0, g: 0, b: 0 };
    const white: RGB = { r: 1, g: 1, b: 1 };
    const blackRatio = contrastRatio(black, bg.color);
    const whiteRatio = contrastRatio(white, bg.color);
    if (blackRatio >= 4.5) setSolidPaint(node, black);
    else if (whiteRatio >= 4.5) setSolidPaint(node, white);
    else throw new Error('Não foi encontrada uma cor preta ou branca que atinja 4.5:1 contra o fundo.');
    return 'Cor do texto ajustada para melhorar o contraste.';
  }

  throw new Error('Correção não suportada.');
}
