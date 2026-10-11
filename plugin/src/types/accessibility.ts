export type Severity = 'critical' | 'warning' | 'info' | 'conforming';

export interface AccessibilityIssue {
  id: string;
  ruleId: string;
  severity: Exclude<Severity, 'conforming'>;
  title: string;
  description: string;
  nodeId: string;
  nodeName: string;
  wcag?: string;
  fixable: boolean;
  fixLabel?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface NodeSnapshot {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  visible: boolean;
  children: NodeSnapshot[];
  pluginData: Record<string, string>;
}

export interface AnalysisResult {
  root: NodeSnapshot;
  issues: AccessibilityIssue[];
  metadata: {
    accessibleName?: string;
    altText?: string;
    role?: string;
  };
  stats: {
    nodes: number;
    critical: number;
    warning: number;
    info: number;
    conforming: number;
  };
}
