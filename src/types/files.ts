// =============================================================================
// TYPES DE FICHIERS - Informations extraites des fichiers source
// =============================================================================

import type { Language, Layer, Visibility } from './base';

/**
 * Information d'import
 */
export interface ImportInfo {
  module: string;
  source?: string;    // Alias pour module (compatibilité)
  items: string[];    // Named imports
  isDefault: boolean;
  isWildcard: boolean;
  line: number;
}

/**
 * Information d'export
 */
export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'variable' | 'type' | 'default' | 'reexport';
  line: number;
}

/**
 * Information de paramètre
 */
export interface ParameterInfo {
  name: string;
  type?: string;
  defaultValue?: string;
  isOptional: boolean;
  isRest: boolean;
}

/**
 * Information d'attribut de classe
 */
export interface AttributeInfo {
  name: string;
  type?: string;
  visibility: Visibility;
  isStatic: boolean;
  isReadonly: boolean;
  defaultValue?: string;
  line: number;
}

/**
 * Information d'appel de fonction
 */
export interface CallInfo {
  target: string;    // Nom de la fonction appelée
  line: number;
  arguments: string[];
  isAwait: boolean;
  isChained: boolean;
}

/**
 * Information d'usage de variable
 */
export interface VariableUsageInfo {
  name: string;
  line: number;
  operation: 'read' | 'write';
  scope: 'local' | 'parameter' | 'class' | 'module' | 'global';
  context?: string;
}

/**
 * Information de fonction
 */
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
  calls: CallInfo[];
  variableUsages: VariableUsageInfo[];
  complexity: number;
  parentClass?: string;
}

/**
 * Information de méthode (extension de FunctionInfo)
 */
export interface MethodInfo extends FunctionInfo {
  parentClass: string;
}

/**
 * Information de classe/struct/interface
 */
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

/**
 * Information de variable
 */
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

/**
 * Informations complètes d'un fichier
 */
export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  language: Language;
  size: number;
  lineCount: number;
  layer: Layer;
  content?: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  classes: ClassInfo[];
  functions: FunctionInfo[];
  variables: VariableInfo[];
}
