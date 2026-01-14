// Types pour l'analyse de codebase multi-niveaux (L1-L7)

// =============================================================================
// NIVEAUX DE GRANULARITÉ
// =============================================================================

export type GranularityLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';

export const LEVELS: Record<GranularityLevel, { name: string; description: string }> = {
  L1: { name: 'Système', description: 'Architecture globale' },
  L2: { name: 'Module', description: 'Répertoires/packages principaux' },
  L3: { name: 'Fichier', description: 'Fichiers source individuels' },
  L4: { name: 'Classe/Struct', description: 'Types, interfaces, classes' },
  L5: { name: 'Fonction/Méthode', description: 'Fonctions, méthodes, handlers' },
  L6: { name: 'Bloc', description: 'Blocs logiques, closures, conditions' },
  L7: { name: 'Variable', description: 'Variables, constantes, paramètres' }
};

// =============================================================================
// TYPES DE NŒUDS
// =============================================================================

export type NodeType =
  // L1 - Système
  | 'system'
  // L2 - Module
  | 'module'
  // L3 - Fichier
  | 'file'
  // L4 - Types
  | 'class'
  | 'struct'
  | 'interface'
  | 'trait'
  | 'enum'
  | 'type_alias'
  // L5 - Fonctions
  | 'function'
  | 'method'
  | 'constructor'
  | 'closure'
  | 'handler'
  // L6 - Blocs
  | 'block'
  | 'conditional'
  | 'loop'
  | 'try_catch'
  | 'match_arm'
  // L7 - Variables
  | 'variable'
  | 'constant'
  | 'parameter'
  | 'attribute'
  | 'property';

// =============================================================================
// TYPES DE RELATIONS
// =============================================================================

export type RelationType =
  // Imports/Exports
  | 'imports'
  | 'exports'
  | 'reexports'
  // Hiérarchie
  | 'extends'
  | 'implements'
  | 'uses_trait'
  | 'contains'
  | 'contained_by'
  // Appels
  | 'calls'
  | 'called_by'
  | 'instantiates'
  | 'instantiated_by'
  // Variables
  | 'reads'
  | 'writes'
  | 'read_by'
  | 'written_by'
  // Types
  | 'uses_type'
  | 'returns_type'
  | 'param_type'
  // Exceptions
  | 'throws'
  | 'catches'
  // Async
  | 'awaits'
  | 'yields'
  // Décorateurs
  | 'decorates'
  | 'decorated_by'
  // Communication
  | 'http'
  | 'ipc'
  | 'event'
  | 'data_flow';

// =============================================================================
// VISIBILITÉ
// =============================================================================

export type Visibility = 'public' | 'private' | 'protected' | 'internal' | 'unknown';

// =============================================================================
// LANGAGES
// =============================================================================

export type Language =
  | 'typescript'
  | 'javascript'
  | 'rust'
  | 'python'
  | 'yaml'
  | 'json'
  | 'html'
  | 'css'
  | 'toml'
  | 'unknown';

// =============================================================================
// COUCHES ARCHITECTURALES
// =============================================================================

export type Layer =
  | 'frontend'
  | 'backend'
  | 'sidecar'
  | 'data'
  | 'external';

// =============================================================================
// NŒUD PRINCIPAL (Multi-niveaux)
// =============================================================================

export interface CodeNode {
  id: string;
  level: GranularityLevel;
  type: NodeType;
  name: string;
  fullPath: string; // Chemin complet (namespace.class.method)
  location: {
    file: string;
    line: number;
    endLine?: number;
    column?: number;
    endColumn?: number;
  };
  visibility: Visibility;
  modifiers: string[]; // async, static, const, mut, pub, etc.
  signature?: string; // Pour les fonctions: "fn(x: i32) -> bool"
  dataType?: string; // Pour les variables: "string", "i32", etc.
  initialValue?: string; // Pour les constantes (non sensibles)
  documentation?: string;
  layer?: Layer;
  metrics: {
    loc: number; // Lignes de code
    complexity?: number; // Complexité cyclomatique
    dependencies: number; // Nombre de dépendances sortantes
    dependents: number; // Nombre de dépendants
  };
  children: string[]; // IDs des enfants
  parent?: string; // ID du parent
  metadata?: Record<string, unknown>;
}

// =============================================================================
// ARÊTE/RELATION
// =============================================================================

export interface CodeEdge {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  location?: {
    file: string;
    line: number;
  };
  label?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// INFORMATIONS SUR UN FICHIER
// =============================================================================

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  language: Language;
  size: number;
  lineCount: number;
  layer: Layer;
  // Contenu extrait
  imports: ImportInfo[];
  exports: ExportInfo[];
  classes: ClassInfo[];
  functions: FunctionInfo[];
  variables: VariableInfo[];
}

export interface ImportInfo {
  module: string;
  items: string[]; // Named imports
  isDefault: boolean;
  isWildcard: boolean;
  line: number;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'variable' | 'type' | 'default' | 'reexport';
  line: number;
}

// =============================================================================
// CLASSE/STRUCT (L4)
// =============================================================================

export interface ClassInfo {
  name: string;
  type: 'class' | 'struct' | 'interface' | 'trait' | 'enum' | 'type_alias';
  line: number;
  endLine: number;
  visibility: Visibility;
  extends?: string;
  implements: string[];
  generics?: string[];
  decorators: string[];
  attributes: AttributeInfo[];
  methods: MethodInfo[];
  documentation?: string;
}

export interface AttributeInfo {
  name: string;
  type?: string;
  visibility: Visibility;
  isStatic: boolean;
  isReadonly: boolean;
  defaultValue?: string;
  line: number;
}

// =============================================================================
// FONCTION/MÉTHODE (L5)
// =============================================================================

export interface FunctionInfo {
  name: string;
  type: 'function' | 'method' | 'constructor' | 'closure' | 'arrow';
  line: number;
  endLine: number;
  visibility: Visibility;
  isAsync: boolean;
  isStatic: boolean;
  isGenerator: boolean;
  parameters: ParameterInfo[];
  returnType?: string;
  generics?: string[];
  decorators: string[];
  documentation?: string;
  // Analyse du corps
  calls: CallInfo[];
  variableUsages: VariableUsageInfo[];
  complexity: number;
  parentClass?: string;
}

export interface MethodInfo extends FunctionInfo {
  parentClass: string;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  defaultValue?: string;
  isOptional: boolean;
  isRest: boolean;
}

export interface CallInfo {
  target: string; // Nom de la fonction appelée
  line: number;
  arguments: string[];
  isAwait: boolean;
  isChained: boolean;
}

export interface VariableUsageInfo {
  name: string;
  line: number;
  operation: 'read' | 'write';
  scope: 'local' | 'parameter' | 'class' | 'module' | 'global';
}

// =============================================================================
// VARIABLE (L7)
// =============================================================================

export interface VariableInfo {
  name: string;
  type: 'variable' | 'constant' | 'parameter' | 'attribute';
  dataType?: string;
  line: number;
  visibility: Visibility;
  isConst: boolean;
  isMutable: boolean;
  scope: 'global' | 'module' | 'function' | 'class' | 'block';
  initialValue?: string;
  usages: VariableUsageInfo[];
}

// =============================================================================
// CALL GRAPH
// =============================================================================

export interface CallGraph {
  nodes: CallGraphNode[];
  edges: CallGraphEdge[];
}

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
  callSites: number[]; // Lignes où l'appel se produit
  isAsync: boolean;
}

// =============================================================================
// DATA FLOW
// =============================================================================

export interface DataFlow {
  variable: string;
  defined: { file: string; line: number };
  flowsTo: DataFlowTarget[];
  transformedBy: DataFlowTransformation[];
}

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

// =============================================================================
// PROBLÈMES DÉTECTÉS
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
// STATISTIQUES
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
// LAYER INFO
// =============================================================================

export interface LayerInfo {
  id: Layer;
  label: string;
  color: string;
  description: string;
}

// =============================================================================
// RÉSULTAT D'ANALYSE COMPLET
// =============================================================================

export interface AnalysisResult {
  meta: {
    projectName: string;
    analyzedAt: Date;
    version: string;
    rootPath: string;
  };
  stats: ProjectStats;
  nodes: CodeNode[];
  edges: CodeEdge[];
  files: FileInfo[];
  layers: LayerInfo[];
  callGraph: CallGraph;
  dataFlows: DataFlow[];
  issues: CodeIssue[];
}

// =============================================================================
// TYPES LEGACY (compatibilité)
// =============================================================================

export type ComponentType =
  | 'page'
  | 'component'
  | 'context'
  | 'hook'
  | 'store'
  | 'api'
  | 'command'
  | 'service'
  | 'model'
  | 'database'
  | 'client'
  | 'engine'
  | 'external';

export interface ComponentNode {
  id: string;
  label: string;
  type: ComponentType;
  layer: Layer;
  files: string[];
  metadata: Record<string, unknown>;
}

export interface ComponentEdge {
  source: string;
  target: string;
  type: RelationType;
  label?: string;
}
