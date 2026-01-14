// =============================================================================
// TYPESCRIPT/JAVASCRIPT PARSER
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
  MethodInfo,
  Visibility,
  Language
} from '../../types';

import {
  type LanguageParser,
  findBlockEnd,
  findArrowFunctionEnd,
  getPositionAtLine,
  splitParameters,
  sanitizeValue,
  calculateComplexity,
  extractVariableUsages
} from './base';

// =============================================================================
// TYPESCRIPT PARSER CLASS
// =============================================================================

export class TypeScriptParser implements LanguageParser {
  readonly language: Language = 'typescript';

  // ===========================================================================
  // IMPORTS
  // ===========================================================================

  extractImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    // ES imports: import { x, y } from 'module'
    const esImportRegex = /import\s+(?:(\*\s+as\s+\w+)|(?:\{([^}]+)\})|(\w+))?\s*(?:,\s*(?:\{([^}]+)\}|(\w+)))?\s*from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = esImportRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const isWildcard = !!match[1];
      const namedImports = (match[2] || match[4] || '').split(',').map(s => s.trim().split(' as ')[0]).filter(Boolean);
      const defaultImport = match[3] || match[5] || '';

      imports.push({
        module: match[6],
        items: defaultImport ? [defaultImport, ...namedImports] : namedImports,
        isDefault: !!defaultImport,
        isWildcard,
        line
      });
    }

    // require imports
    const requireRegex = /(?:const|let|var)\s+(?:\{([^}]+)\}|(\w+))\s*=\s*require\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const items = match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]];
      imports.push({
        module: match[3],
        items,
        isDefault: !!match[2],
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

    // export const/let/var/function/class
    const namedExportRegex = /export\s+(const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const type = match[1] === 'const' || match[1] === 'let' || match[1] === 'var' ? 'variable' :
                   match[1] === 'function' ? 'function' :
                   match[1] === 'class' ? 'class' : 'type';
      exports.push({ name: match[2], type, line });
    }

    // export default
    if (content.includes('export default')) {
      const defaultMatch = content.match(/export\s+default\s+(?:class\s+|function\s+)?(\w+)?/);
      const line = content.indexOf('export default');
      exports.push({
        name: defaultMatch?.[1] || 'default',
        type: 'default',
        line: content.substring(0, line).split('\n').length
      });
    }

    // export { x, y }
    const namedExportsRegex = /export\s+\{([^}]+)\}/g;
    while ((match = namedExportsRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const items = match[1].split(',').map(s => s.trim().split(' as ')[0]);
      for (const item of items) {
        exports.push({ name: item, type: 'variable', line });
      }
    }

    return exports;
  }

  // ===========================================================================
  // CLASSES
  // ===========================================================================

  extractClasses(content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];

    // Classes
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = findBlockEnd(content, match.index);
      const classBody = content.substring(match.index, getPositionAtLine(content, endLine));

      classes.push({
        name: match[1],
        type: 'class',
        line: startLine,
        endLine,
        visibility: content.substring(Math.max(0, match.index - 20), match.index).includes('export') ? 'public' : 'private',
        extends: match[2],
        implements: match[3] ? match[3].split(',').map(s => s.trim()) : [],
        decorators: this.extractDecorators(content, match.index),
        attributes: this.extractClassAttributes(classBody),
        methods: this.extractClassMethods(classBody, match[1]),
        documentation: this.extractDocumentation(content, match.index)
      });
    }

    // Interfaces
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+([\w,\s]+))?/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = findBlockEnd(content, match.index);

      classes.push({
        name: match[1],
        type: 'interface',
        line: startLine,
        endLine,
        visibility: 'public',
        implements: match[2] ? match[2].split(',').map(s => s.trim()) : [],
        decorators: [],
        attributes: [],
        methods: [],
        documentation: this.extractDocumentation(content, match.index)
      });
    }

    // Type aliases
    const typeRegex = /(?:export\s+)?type\s+(\w+)(?:<[^>]+>)?\s*=/g;
    while ((match = typeRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      classes.push({
        name: match[1],
        type: 'type_alias',
        line: startLine,
        endLine: startLine,
        visibility: 'public',
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

    // Function declarations
    const funcRegex = /(?:export\s+)?(?:async\s+)?function\s*(\*?)\s*(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = findBlockEnd(content, match.index);
      const funcBody = content.substring(match.index, getPositionAtLine(content, endLine));

      functions.push({
        name: match[2],
        type: 'function',
        line: startLine,
        endLine,
        visibility: content.substring(Math.max(0, match.index - 20), match.index).includes('export') ? 'public' : 'private',
        isAsync: content.substring(Math.max(0, match.index - 20), match.index).includes('async'),
        isStatic: false,
        isGenerator: match[1] === '*',
        parameters: this.parseParameters(match[3]),
        returnType: match[4]?.trim(),
        decorators: this.extractDecorators(content, match.index),
        documentation: this.extractDocumentation(content, match.index),
        calls: this.extractFunctionCalls(funcBody),
        variableUsages: extractVariableUsages(funcBody, 'typescript'),
        complexity: calculateComplexity(funcBody)
      });
    }

    // Arrow functions (const/let)
    const arrowRegex = /(?:export\s+)?(?:const|let)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?\(?([^)]*)\)?\s*(?::\s*([^=]+))?\s*=>/g;
    while ((match = arrowRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = findArrowFunctionEnd(content, match.index);
      const funcBody = content.substring(match.index, getPositionAtLine(content, endLine));

      functions.push({
        name: match[1],
        type: 'arrow',
        line: startLine,
        endLine,
        visibility: content.substring(Math.max(0, match.index - 20), match.index).includes('export') ? 'public' : 'private',
        isAsync: content.substring(match.index, match.index + 100).includes('async'),
        isStatic: false,
        isGenerator: false,
        parameters: this.parseParameters(match[2]),
        returnType: match[3]?.trim(),
        decorators: [],
        calls: this.extractFunctionCalls(funcBody),
        variableUsages: extractVariableUsages(funcBody, 'typescript'),
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

    // const/let/var declarations at module level
    const varRegex = /(?:export\s+)?(const|let|var)\s+(\w+)(?:\s*:\s*([^=]+))?\s*=\s*([^;\n]+)/g;
    let match;
    while ((match = varRegex.exec(content)) !== null) {
      // Skip if inside function/class
      const before = content.substring(0, match.index);
      const openBraces = (before.match(/\{/g) || []).length;
      const closeBraces = (before.match(/\}/g) || []).length;

      // Only top-level variables (brace count should be low)
      if (openBraces - closeBraces <= 1) {
        const line = before.split('\n').length;
        variables.push({
          name: match[2],
          type: match[1] === 'const' ? 'constant' : 'variable',
          dataType: match[3]?.trim(),
          line,
          visibility: content.substring(Math.max(0, match.index - 20), match.index).includes('export') ? 'public' : 'private',
          isConst: match[1] === 'const',
          isMutable: match[1] !== 'const',
          scope: 'module',
          initialValue: sanitizeValue(match[4].trim()),
          usages: []
        });
      }
    }

    return variables;
  }

  // ===========================================================================
  // HELPERS PRIVES
  // ===========================================================================

  private extractDecorators(content: string, position: number): string[] {
    const decorators: string[] = [];
    const before = content.substring(Math.max(0, position - 500), position);
    const lines = before.split('\n').reverse();

    for (const line of lines) {
      const match = line.match(/@(\w+)(?:\([^)]*\))?/);
      if (match) {
        decorators.unshift(match[1]);
      } else if (line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        break;
      }
    }
    return decorators;
  }

  private extractDocumentation(content: string, position: number): string | undefined {
    const before = content.substring(Math.max(0, position - 1000), position);
    const jsdocMatch = before.match(/\/\*\*([^*]|\*(?!\/))*\*\/\s*$/);
    if (jsdocMatch) {
      return jsdocMatch[0].replace(/\/\*\*|\*\/|^\s*\*\s?/gm, '').trim();
    }
    return undefined;
  }

  private extractClassAttributes(body: string): AttributeInfo[] {
    const attributes: AttributeInfo[] = [];

    const propRegex = /(?:(private|public|protected)\s+)?(?:(static)\s+)?(?:(readonly)\s+)?(\w+)(?:\s*[?!]?)(?:\s*:\s*([^=;\n]+))?(?:\s*=\s*([^;\n]+))?;/g;
    let match;
    while ((match = propRegex.exec(body)) !== null) {
      const line = body.substring(0, match.index).split('\n').length;
      attributes.push({
        name: match[4],
        type: match[5]?.trim(),
        visibility: (match[1] || 'public') as Visibility,
        isStatic: !!match[2],
        isReadonly: !!match[3],
        defaultValue: match[6]?.trim(),
        line
      });
    }

    return attributes;
  }

  private extractClassMethods(body: string, className: string): MethodInfo[] {
    const methods: MethodInfo[] = [];

    const methodRegex = /(?:(private|public|protected)\s+)?(?:(static)\s+)?(?:(async)\s+)?(?:(get|set)\s+)?(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/g;
    let match;
    while ((match = methodRegex.exec(body)) !== null) {
      const startLine = body.substring(0, match.index).split('\n').length;
      const endLine = findBlockEnd(body, match.index);
      const methodBody = body.substring(match.index, getPositionAtLine(body, endLine));

      methods.push({
        name: match[5],
        type: match[5] === 'constructor' ? 'constructor' : 'method',
        line: startLine,
        endLine,
        visibility: (match[1] || 'public') as Visibility,
        isAsync: !!match[3],
        isStatic: !!match[2],
        isGenerator: false,
        parameters: this.parseParameters(match[6]),
        returnType: match[7]?.trim(),
        decorators: [],
        calls: this.extractFunctionCalls(methodBody),
        variableUsages: extractVariableUsages(methodBody, 'typescript'),
        complexity: calculateComplexity(methodBody),
        parentClass: className
      });
    }

    return methods;
  }

  private parseParameters(params: string): ParameterInfo[] {
    if (!params?.trim()) return [];

    const result: ParameterInfo[] = [];
    const parts = splitParameters(params);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const match = trimmed.match(/(?:\.\.\.)?(\w+)(?:\s*\??)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?/);
      if (match) {
        result.push({
          name: match[1],
          type: match[2]?.trim(),
          defaultValue: match[3]?.trim(),
          isOptional: trimmed.includes('?') || !!match[3],
          isRest: trimmed.startsWith('...')
        });
      }
    }

    return result;
  }

  private extractFunctionCalls(body: string): CallInfo[] {
    const calls: CallInfo[] = [];
    const callRegex = /(?:await\s+)?(\w+(?:\.\w+)*)\s*\(/g;
    let match;

    while ((match = callRegex.exec(body)) !== null) {
      const funcName = match[1];
      if (['if', 'while', 'for', 'switch', 'catch', 'function', 'return', 'throw'].includes(funcName)) continue;

      const line = body.substring(0, match.index).split('\n').length;
      calls.push({
        target: funcName,
        line,
        arguments: [],
        isAwait: body.substring(Math.max(0, match.index - 10), match.index).includes('await'),
        isChained: funcName.includes('.')
      });
    }

    return calls;
  }
}

// Export singleton instance
export const typescriptParser = new TypeScriptParser();

// JavaScript uses the same parser
export const javascriptParser = typescriptParser;
