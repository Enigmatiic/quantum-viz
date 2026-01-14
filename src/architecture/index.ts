// =============================================================================
// ARCHITECTURE MODULE INDEX
// =============================================================================

// Patterns
export * from './patterns';

// Detector
export { ArchitectureDetector, createDetectionContext, extractFolders } from './detector';
export type { DetectorConfig, FileInfo, DetectionContext } from './detector';

// Classifier
export { ArchitectureClassifier, ROLE_COLORS, ROLE_ICONS } from './classifier';
export type {
  ClassifiedFile,
  AIClassification,
  FileRole,
  ClassificationResult,
  ClassificationStats,
  ClassifierConfig
} from './classifier';

// Flow Analyzer
export { FlowAnalyzer, flowsToVisualization } from './flow-analyzer';
export type {
  DataFlow,
  FlowType,
  FlowStep,
  LayerConnection,
  FlowAnalysisResult,
  FlowMetrics,
  FlowAnalyzerConfig,
  FlowVisualizationData,
  FlowNode,
  FlowEdge
} from './flow-analyzer';
