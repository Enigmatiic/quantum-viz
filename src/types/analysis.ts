// =============================================================================
// TYPES D'ANALYSE - Résultats et statistiques
// =============================================================================

import type { GranularityLevel, Language, Layer, LayerInfo } from './base';
import type { CodeNode } from './nodes';
import type { CodeEdge } from './edges';
import type { FileInfo } from './files';

// =============================================================================
// CALL GRAPH
// =============================================================================

export interface CallGraphNode {
  id: string;
  name: string;
  file: string;
  line: number;
  isEntryPoint: boolean;
  isTerminal: boolean;
  depth: number;
}

export interface CallGraphEdge {
  source: string;
  target: string;
  callSites: number[];   // Lignes où l'appel se produit
  isAsync: boolean;
}

export interface CallGraph {
  nodes: CallGraphNode[];
  edges: CallGraphEdge[];
}

// =============================================================================
// DATA FLOW
// =============================================================================

export interface DataFlowTarget {
  file: string;
  line: number;
  usage: 'parameter' | 'attribute' | 'return' | 'reassignment';
  context?: string;
}

export interface DataFlowTransformation {
  function: string;
  file: string;
  line: number;
}

export interface DataFlow {
  variable: string;
  defined: { file: string; line: number };
  flowsTo: DataFlowTarget[];
  transformedBy: DataFlowTransformation[];
}

// =============================================================================
// ISSUES
// =============================================================================

export type IssueType =
  | 'dead_code'
  | 'circular_dependency'
  | 'god_class'
  | 'long_method'
  | 'feature_envy'
  | 'unused_import'
  | 'unused_variable'
  | 'unused_function'
  | 'deep_nesting'
  | 'high_complexity';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface CodeIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  location: {
    file: string;
    line: number;
    endLine?: number;
  };
  message: string;
  suggestion?: string;
  relatedNodes?: string[];
}

// =============================================================================
// STATISTICS
// =============================================================================

export interface ProjectStats {
  totalFiles: number;
  totalLines: number;
  totalClasses: number;
  totalFunctions: number;
  totalVariables: number;
  byLanguage: Record<Language, number>;
  byLayer: Record<Layer, number>;
  byLevel: Record<GranularityLevel, number>;
  avgComplexity: number;
  maxComplexity: number;
}

// =============================================================================
// ANALYSIS RESULT
// =============================================================================

export interface AnalysisMeta {
  projectName: string;
  analyzedAt: Date;
  version: string;
  rootPath: string;
}

export interface AnalysisResult {
  meta: AnalysisMeta;
  stats: ProjectStats;
  nodes: CodeNode[];
  edges: CodeEdge[];
  files: FileInfo[];
  layers: LayerInfo[];
  callGraph: CallGraph;
  dataFlows: DataFlow[];
  issues: CodeIssue[];
}
