export interface BackendNode {
  id: string;
  name: string;
  type: string;
  accessibleName: string;
  altText: string;
  ariaLabel?: string;
  isInteractive: boolean;
  isImage: boolean;
  contrastRatio?: number;
  children?: BackendNode[];
}

export interface BackendIssue {
  code: string;
  severity: 'high' | 'medium' | 'low';
  nodeId: string;
  nodeName: string;
  message: string;
  suggestion?: string;
}

export interface BackendAnalysisResponse {
  ok: boolean;
  source: 'backend';
  issues: BackendIssue[];
  summary: {
    totalNodes: number;
    totalIssues: number;
    high: number;
    medium: number;
    low: number;
  };
}

const BACKEND_URL = 'http://localhost:3001';
const REQUEST_TIMEOUT_MS = 2500;

export async function analyzeWithBackend(nodes: BackendNode[]): Promise<BackendAnalysisResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Backend respondeu com HTTP ${response.status}.`);
    }

    const data = await response.json() as BackendAnalysisResponse;
    if (!data?.ok || !Array.isArray(data.issues)) {
      throw new Error('Resposta inválida do backend.');
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export function backendUrl() {
  return BACKEND_URL;
}
