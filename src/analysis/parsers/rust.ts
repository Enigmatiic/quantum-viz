// =============================================================================
// RUST PARSER
// =============================================================================

import type {
  ImportInfo,
  ExportInfo,
  ClassInfo,
  FunctionInfo,
  VariableInfo,
  ParameterInfo,
  CallInfo,
  AttributeInfo,
  Visibility,
  Language
} from '../../types';

import {
  type LanguageParser,
  findBlockEnd,
  getPositionAtLine,
  splitParameters,
  sanitizeValue,
  calculateComplexity,
  extractVariableUsages
} from './base';

// =============================================================================
// RUST PARSER CLASS
// =============================================================================

export class RustParser implements LanguageParser {
  readonly language: Language = 'rust';

  // ===========================================================================
  // IMPORTS
  // ===========================================================================

  extractImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    // use statements
    const useRegex = /use\s+((?:crate|super|self|[\w:]+)(?:::\{[^}]+\}|::\w+|::\*)?);/g;
    let match;
    while ((match = useRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const fullPath = match[1];
      const items = fullPath.includes('{')
        ? fullPath.match(/\{([^}]+)\}/)?.[1].split(',').map(s => s.trim()) || []
        : [fullPath.split('::').pop() || ''];

      imports.push({
        module: fullPath.split('::').slice(0, -1).join('::') || fullPath,
        items,
        isDefault: false,
        isWildcard: fullPath.includes('*'),
        line
      });
    }

    // mod statements
    const modRegex = /mod\s+(\w+);/g;
    while ((match = modRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      imports.push({
        module: match[1],
        items: [match[1]],
        isDefault: false,
        isWildcard: false,
        line
      });
    }

    return imports;
  }

  // ===========================================================================
  // EXPORTS
  // ===========================================================================

  extractExports(content: string): ExportInfo[] {
    const exports: ExportInfo[] = [];

    // pub items
    const pubRegex = /pub(?:\s*\([^)]+\))?\s+(fn|struct|enum|trait|type|const|static|mod)\s+(\w+)/g;
    let match;
    while ((match = pubRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const type = match[1] === 'fn' ? 'function' :
                   match[1] === 'struct' || match[1] === 'enum' || match[1] === 'trait' ? 'class' : 'variable';
      exports.push({ name: match[2], type, line });
    }

    return exports;
  }

  // ===========================================================================
  // CLASSES (Structs, Enums, Traits)
  // ===========================================================================

  extractClasses(content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];

    // Structs
    const structRegex = /(?:pub(?:\s*\([^)]+\))?\s+)?struct\s+(\w+)(?:<[^>]+>)?/g;
    let match;
    while ((match = structRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = findBlockEnd(content, match.index);
      const structBody = content.substring(match.index, getPositionAtLine(content, endLine));

      classes.push({
        name: match[1],
        type: 'struct',
        line: startLine,
        endLine,
        visibility: match[0].includes('pub') ? 'public' : 'private',
        implements: [],
        decorators: this.extractAttributes(content, match.index),
        attributes: this.extractStructFields(structBody),
        methods: [],
        documentation: this.extractDocumentation(content, match.index)
      });
    }

    // Enums
    const enumRegex = /(?:pub(?:\s*\([^)]+\))?\s+)?enum\s+(\w+)(?:<[^>]+>)?/g;
    while ((match = enumRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = findBlockEnd(content, match.index);

      classes.push({
        name: match[1],
        type: 'enum',
        line: startLine,
        endLine,
        visibility: match[0].includes('pub') ? 'public' : 'private',
        implements: [],
        decorators: this.extractAttributes(content, match.index),
        attributes: [],
        methods: []
      });
    }

    // Traits
    const traitRegex = /(?:pub(?:\s*\([^)]+\))?\s+)?trait\s+(\w+)(?:<[^>]+>)?/g;
    while ((match = traitRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = findBlockEnd(content, match.index);

      classes.push({
        name: match[1],
        type: 'trait',
        line: startLine,
        endLine,
        visibility: match[0].includes('pub') ? 'public' : 'private',
        implements: [],
        decorators: [],
        attributes: [],
        methods: []
      });
    }

    return classes;
  }

  // ===========================================================================
  // FUNCTIONS
  // ===========================================================================

  extractFunctions(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const fnRegex = /(?:pub(?:\s*\([^)]+\))?\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?/g;
    let match;
    while ((match = fnRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = findBlockEnd(content, match.index);
      const funcBody = content.substring(match.index, getPositionAtLine(content, endLine));

      functions.push({
        name: match[1],
        type: 'function',
        line: startLine,
        endLine,
        visibility: match[0].includes('pub') ? 'public' : 'private',
        isAsync: match[0].includes('async'),
        isStatic: false,
        isGenerator: false,
        parameters: this.parseParameters(match[2]),
        returnType: match[3]?.trim(),
        decorators: this.extractAttributes(content, match.index),
        documentation: this.extractDocumentation(content, match.index),
        calls: this.extractFunctionCalls(funcBody),
        variableUsages: extractVariableUsages(funcBody, 'rust'),
        complexity: calculateComplexity(funcBody)
      });
    }

    return functions;
  }

  // ===========================================================================
  // VARIABLES
  // ===========================================================================

  extractVariables(content: string): VariableInfo[] {
    const variables: VariableInfo[] = [];

    // const and static
    const constRegex = /(?:pub(?:\s*\([^)]+\))?\s+)?(const|static(?:\s+mut)?)\s+(\w+)\s*:\s*([^=]+)\s*=\s*([^;]+)/g;
    let match;
    while ((match = constRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const isConst = match[1] === 'const';
      variables.push({
        name: match[2],
        type: isConst ? 'constant' : 'variable',
        dataType: match[3]?.trim(),
        line,
        visibility: match[0].includes('pub') ? 'public' : 'private',
        isConst,
        isMutable: match[1].includes('mut'),
        scope: 'module',
        initialValue: sanitizeValue(match[4].trim()),
        usages: []
      });
    }

    return variables;
  }

  // ===========================================================================
  // HELPERS PRIVES
  // ===========================================================================

  private extractAttributes(content: string, position: number): string[] {
    const attributes: string[] = [];
    const before = content.substring(Math.max(0, position - 500), position);
    const matches = before.matchAll(/#\[([^\]]+)\]/g);
    for (const match of matches) {
      attributes.push(match[1]);
    }
    return attributes;
  }

  private extractDocumentation(content: string, position: number): string | undefined {
    const before = content.substring(Math.max(0, position - 1000), position);
    const lines = before.split('\n').reverse();
    const docLines: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith('///')) {
        docLines.unshift(line.replace(/^\s*\/\/\/\s?/, ''));
      } else if (line.trim() && !line.trim().startsWith('#[')) {
        break;
      }
    }
    return docLines.length > 0 ? docLines.join('\n') : undefined;
  }

  private extractStructFields(body: string): AttributeInfo[] {
    const attributes: AttributeInfo[] = [];
    const fieldRegex = /(?:pub(?:\s*\([^)]+\))?\s+)?(\w+)\s*:\s*([^,}]+)/g;
    let match;
    while ((match = fieldRegex.exec(body)) !== null) {
      const line = body.substring(0, match.index).split('\n').length;
      attributes.push({
        name: match[1],
        type: match[2].trim(),
        visibility: body.substring(Math.max(0, match.index - 10), match.index).includes('pub') ? 'public' : 'private',
        isStatic: false,
        isReadonly: false,
        line
      });
    }
    return attributes;
  }

  private parseParameters(params: string): ParameterInfo[] {
    if (!params?.trim()) return [];

    const result: ParameterInfo[] = [];
    const parts = splitParameters(params);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed || trimmed === 'self' || trimmed === '&self' || trimmed === '&mut self') continue;

      const match = trimmed.match(/(?:mut\s+)?(\w+)\s*:\s*(.+)/);
      if (match) {
        result.push({
          name: match[1],
          type: match[2].trim(),
          isOptional: match[2].includes('Option<'),
          isRest: false
        });
      }
    }

    return result;
  }

  private extractFunctionCalls(body: string): CallInfo[] {
    const calls: CallInfo[] = [];
    const callRegex = /(?:(\w+)::)?(\w+(?:::\w+)*)\s*\(/g;
    let match;

    while ((match = callRegex.exec(body)) !== null) {
      const funcName = match[2];
      if (['if', 'while', 'for', 'match', 'loop', 'fn', 'let', 'const'].includes(funcName)) continue;

      const line = body.substring(0, match.index).split('\n').length;
      calls.push({
        target: match[1] ? `${match[1]}::${funcName}` : funcName,
        line,
        arguments: [],
        isAwait: body.substring(match.index, match.index + 100).includes('.await'),
        isChained: funcName.includes('::')
      });
    }

    return calls;
  }
}

// Export singleton instance
export const rustParser = new RustParser();
