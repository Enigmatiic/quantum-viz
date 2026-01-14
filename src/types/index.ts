// =============================================================================
// TYPES INDEX - Re-export de tous les types
// =============================================================================

// Types de base
export type {
  GranularityLevel,
  LevelInfo,
  Visibility,
  Language,
  Layer,
  LayerInfo
} from './base';

export { LEVELS } from './base';

// Types de noeuds
export type {
  NodeType,
  SourceLocation,
  NodeMetrics,
  CodeNode,
  ComponentType,
  ComponentNode
} from './nodes';

// Types de relations
export type { RelationType } from './relations';
export { RELATION_CATEGORIES, RELATION_COLORS } from './relations';

// Types d'arêtes
export type {
  EdgeLocation,
  CodeEdge,
  ComponentEdge
} from './edges';

// Types de fichiers
export type {
  ImportInfo,
  ExportInfo,
  ParameterInfo,
  AttributeInfo,
  CallInfo,
  VariableUsageInfo,
  FunctionInfo,
  MethodInfo,
  ClassInfo,
  VariableInfo,
  FileInfo
} from './files';

// Types d'analyse
export type {
  CallGraphNode,
  CallGraphEdge,
  CallGraph,
  DataFlowTarget,
  DataFlowTransformation,
  DataFlow,
  IssueType,
  IssueSeverity,
  CodeIssue,
  ProjectStats,
  AnalysisMeta,
  AnalysisResult
} from './analysis';

// Types de visualisation
export type {
  VisualizationConfig,
  NodeColors,
  ViewState,
  PhysicsConfig,
  DragState,
  ContextMenuOption,
  KeyboardShortcut
} from './visualization';

export {
  DEFAULT_VISUALIZATION_CONFIG,
  NODE_TYPE_COLORS,
  DEFAULT_PHYSICS_CONFIG,
  CONTEXT_MENU_OPTIONS,
  KEYBOARD_SHORTCUTS
} from './visualization';
