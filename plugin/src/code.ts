import { analyzeNode, fixIssue, toBackendNode, type Issue } from './accessibility/analyzer';
import { analyzeWithBackend, backendUrl, type BackendIssue } from './backend/client';

figma.showUI(__html__, { width: 460, height: 720, themeColors: true });

let analysisRequest = 0;

function localIssueFor(issues: Issue[], backendIssue: BackendIssue) {
  return issues.find(issue => issue.ruleId === backendIssue.code && issue.nodeId === backendIssue.nodeId);
}

function mergeBackendIssues(localIssues: Issue[], backendIssues: BackendIssue[]): Issue[] {
  const merged = new Map<string, Issue>();

  for (const local of localIssues) {
    merged.set(`${local.ruleId}:${local.nodeId}`, local);
  }

  for (const backendIssue of backendIssues) {
    const key = `${backendIssue.code}:${backendIssue.nodeId}`;
    const local = merged.get(key);
    if (local) {
      merged.set(key, {
        ...local,
        description: backendIssue.message || local.description,
        fixLabel: local.fixLabel || backendIssue.suggestion
      });
      continue;
    }

    const severity = backendIssue.severity === 'high' ? 'critical' : backendIssue.severity === 'medium' ? 'warning' : 'info';
    merged.set(key, {
      id: `${backendIssue.code}-${backendIssue.nodeId}`,
      ruleId: backendIssue.code,
      severity,
      title: backendIssue.code === 'V-01'
        ? 'Contraste insuficiente'
        : backendIssue.code === 'V-02'
          ? 'Controle sem nome acessível'
          : backendIssue.code === 'V-03'
            ? 'Imagem sem texto alternativo'
            : 'Problema de acessibilidade',
      description: backendIssue.message,
      nodeId: backendIssue.nodeId,
      nodeName: backendIssue.nodeName,
      nodeType: 'UNKNOWN',
      fixable: false,
      fixLabel: backendIssue.suggestion
    });
  }

  return [...merged.values()];
}

function postLocalFallback(root: SceneNode, localResult: ReturnType<typeof analyzeNode>, message?: string) {
  figma.ui.postMessage({
    type: 'analysis',
    result: localResult,
    source: 'local-fallback',
    backend: { connected: false, url: backendUrl(), message: message || 'Backend indisponível. Validação local mantida.' }
  });
}

async function sendAnalysis() {
  const requestId = ++analysisRequest;
  const selection = figma.currentPage.selection;
  if (!selection.length) {
    figma.ui.postMessage({ type: 'selection-empty' });
    return;
  }

  const root = selection[0];
  figma.ui.postMessage({ type: 'analysis-started' });
  const localResult = analyzeNode(root);
  figma.ui.postMessage({
    type: 'analysis',
    result: localResult,
    source: 'local-loading',
    backend: { connected: false, checking: true, url: backendUrl() }
  });

  try {
    const backend = await analyzeWithBackend([toBackendNode(root)]);
    if (requestId !== analysisRequest) return;

    const mergedIssues = mergeBackendIssues(localResult.issues, backend.issues);
    const result = {
      ...localResult,
      issues: mergedIssues,
      stats: {
        ...localResult.stats,
        critical: mergedIssues.filter(i => i.severity === 'critical').length,
        warning: mergedIssues.filter(i => i.severity === 'warning').length,
        info: mergedIssues.filter(i => i.severity === 'info').length,
        conforming: Math.max(localResult.stats.nodes - new Set(mergedIssues.map(i => i.nodeId)).size, 0)
      }
    };

    figma.ui.postMessage({
      type: 'analysis',
      result,
      source: 'backend',
      backend: { connected: true, url: backendUrl(), totalIssues: backend.summary.totalIssues }
    });
  } catch (error) {
    if (requestId !== analysisRequest) return;
    const message = error instanceof Error ? error.message : 'Não foi possível conectar ao backend.';
    postLocalFallback(root, localResult, message);
  }
}

figma.on('selectionchange', () => { void sendAnalysis(); });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'analyze-selection') {
    void sendAnalysis();
    return;
  }

  if (msg.type === 'save-metadata') {
    try {
      const node = await figma.getNodeByIdAsync(String(msg.nodeId || ''));
      if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') {
        throw new Error('O elemento não existe mais. Selecione-o novamente e tente salvar.');
      }
      const metadata = msg.metadata || {};
      const accessibleName = String(metadata.accessibleName || '').trim();
      const altText = String(metadata.altText || '').trim();
      const role = String(metadata.role || '').trim().toLowerCase();
      if (accessibleName.length > 200 || altText.length > 500 || role.length > 50) {
        throw new Error('Verifique os limites dos campos de metadata.');
      }
      node.setPluginData('a11y:accessibleName', accessibleName);
      node.setPluginData('a11y:altText', altText);
      node.setPluginData('a11y:role', role);
      figma.ui.postMessage({ type: 'metadata-saved', message: 'Metadata salva no elemento selecionado.' });
      figma.notify('Metadata de acessibilidade salva.', { timeout: 2500 });
      void sendAnalysis();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a metadata.';
      figma.ui.postMessage({ type: 'metadata-error', message });
      figma.notify(message, { error: true, timeout: 4000 });
    }
    return;
  }

  if (msg.type === 'apply-ai-metadata') {
    try {
      const node = await figma.getNodeByIdAsync(String(msg.nodeId || ''));
      if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') throw new Error('O elemento selecionado não existe mais. Execute a análise novamente.');
      const value = String(msg.value || '').trim();
      if (!value) throw new Error('A sugestão da IA está vazia.');
      if (msg.metadataType === 'accessibleName') node.setPluginData('a11y:accessibleName', value);
      else if (msg.metadataType === 'altText') node.setPluginData('a11y:altText', value);
      else throw new Error('Tipo de metadata não suportado.');
      figma.notify('Sugestão aplicada como metadata. Revise e execute a análise novamente.', { timeout: 3500 });
      void sendAnalysis();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível aplicar a sugestão.';
      figma.notify(message, { error: true, timeout: 4000 });
    }
    return;
  }

  if (msg.type === 'fix-issue') {
    try {
      const message = await fixIssue(msg.issue);
      figma.notify(message, { timeout: 3000 });
      void sendAnalysis();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível aplicar a correção.';
      figma.notify(message, { error: true, timeout: 4000 });
    }
    return;
  }

  if (msg.type === 'close-plugin') figma.closePlugin();
};

void sendAnalysis();
