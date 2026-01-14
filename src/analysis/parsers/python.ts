// =============================================================================
// PYTHON PARSER
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
  Language
} from '../../types';

import {
  type LanguageParser,
  findPythonBlockEnd,
  getPositionAtLine,
  splitParameters,
  sanitizeValue,
  calculateComplexity,
  extractVariableUsages
} from './base';

// =============================================================================
// PYTHON PARSER CLASS
// =============================================================================

export class PythonParser implements LanguageParser {
  readonly language: Language = 'python';

  // ===========================================================================
  // IMPORTS
  // ===========================================================================

  extractImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    // from module import x, y
    const fromImportRegex = /from\s+([\w.]+)\s+import\s+([^#\n]+)/g;
    let match;
    while ((match = fromImportRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const items = match[2].split(',').map(s => s.trim().split(' as ')[0]).filter(Boolean);
      imports.push({
        module: match[1],
        items,
        isDefault: false,
        isWildcard: items.includes('*'),
        line
      });
    }

    // import module
    const importRegex = /^import\s+([\w., ]+)/gm;
    while ((match = importRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const modules = match[1].split(',').map(s => s.trim().split(' as ')[0]);
      for (const mod of modules) {
        imports.push({
          module: mod,
          items: [mod],
          isDefault: true,
          isWildcard: false,
          line
        });
      }
    }

    return imports;
  }

  // ===========================================================================
  // EXPORTS
  // ===========================================================================

  extractExports(content: string): ExportInfo[] {
    const exports: ExportInfo[] = [];

    // __all__ definition
    const allMatch = content.match(/__all__\s*=\s*\[([^\]]+)\]/);
    if (allMatch) {
      const items = allMatch[1].matchAll(/['"](\w+)['"]/g);
      const line = content.indexOf('__all__');
      for (const match of items) {
        exports.push({
          name: match[1],
          type: 'variable',
          line: content.substring(0, line).split('\n').length
        });
      }
    }

    return exports;
  }

  // ===========================================================================
  // CLASSES
  // ===========================================================================

  extractClasses(content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];

    const classRegex = /class\s+(\w+)(?:\(([^)]*)\))?:/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = findPythonBlockEnd(content, match.index);
      const classBody = content.substring(match.index, getPositionAtLine(content, endLine));

      const bases = match[2] ? match[2].split(',').map(s => s.trim()) : [];
      const parentClass = bases[0] && bases[0] !== 'object' ? bases[0] : undefined;

      classes.push({
        name: match[1],
        type: 'class',
        line: startLine,
        endLine,
        visibility: match[1].startsWith('_') ? 'private' : 'public',
        extends: parentClass,
        implements: bases.slice(1),
        decorators: this.extractDecorators(content, match.index),
        attributes: this.extractAttributes(classBody),
        methods: this.extractMethods(classBody, match[1]),
        documentation: this.extractDocstring(content, match.index)
      });
    }

    return classes;
  }

  // ===========================================================================
  // FUNCTIONS
  // ===========================================================================

  extractFunctions(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const defRegex = /(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/g;
    let match;
    while ((match = defRegex.exec(content)) !== null) {
      // Skip methods inside classes (check indentation)
      const lineStart = content.lastIndexOf('\n', match.index) + 1;
      const indent = match.index - lineStart;
      if (indent > 0) continue; // Indented = method, skip

      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = findPythonBlockEnd(content, match.index);
      const funcBody = content.substring(match.index, getPositionAtLine(content, endLine));

      functions.push({
        name: match[1],
        type: 'function',
        line: startLine,
        endLine,
        visibility: match[1].startsWith('_') ? 'private' : 'public',
        isAsync: content.substring(Math.max(0, match.index - 10), match.index).includes('async'),
        isStatic: false,
        isGenerator: funcBody.includes('yield'),
        parameters: this.parseParameters(match[2]),
        returnType: match[3]?.trim(),
        decorators: this.extractDecorators(content, match.index),
        documentation: this.extractDocstring(content, match.index),
        calls: this.extractFunctionCalls(funcBody),
        variableUsages: extractVariableUsages(funcBody, 'python'),
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
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip lines inside functions/classes (indented)
      if (line.match(/^\s+/)) continue;

      const varMatch = line.match(/^(\w+)(?:\s*:\s*([^=]+))?\s*=\s*(.+)$/);
      if (varMatch && !line.startsWith('def ') && !line.startsWith('class ') && !line.startsWith('import ') && !line.startsWith('from ')) {
        const isConst = varMatch[1] === varMatch[1].toUpperCase();
        variables.push({
          name: varMatch[1],
          type: isConst ? 'constant' : 'variable',
          dataType: varMatch[2]?.trim(),
          line: i + 1,
          visibility: varMatch[1].startsWith('_') ? 'private' : 'public',
          isConst,
          isMutable: !isConst,
          scope: 'module',
          initialValue: sanitizeValue(varMatch[3].trim()),
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
      const match = line.match(/@(\w+(?:\.\w+)*)(?:\([^)]*\))?/);
      if (match) {
        decorators.unshift(match[1]);
      } else if (line.trim() && !line.trim().startsWith('#')) {
        break;
      }
    }
    return decorators;
  }

  private extractDocstring(content: string, position: number): string | undefined {
    const after = content.substring(position);
    const match = after.match(/:\s*\n\s*(?:'''|""")([^]*?)(?:'''|""")/);
    return match ? match[1].trim() : undefined;
  }

  private extractAttributes(body: string): AttributeInfo[] {
    const attributes: AttributeInfo[] = [];
    // self.x = y in __init__
    const attrRegex = /self\.(\w+)\s*(?::\s*([^=]+))?\s*=/g;
    let match;
    while ((match = attrRegex.exec(body)) !== null) {
      const line = body.substring(0, match.index).split('\n').length;
      attributes.push({
        name: match[1],
        type: match[2]?.trim(),
        visibility: match[1].startsWith('_') ? 'private' : 'public',
        isStatic: false,
        isReadonly: false,
        line
      });
    }
    return attributes;
  }

  private extractMethods(body: string, className: string): MethodInfo[] {
    const methods: MethodInfo[] = [];
    const defRegex = /(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/g;
    let match;
    while ((match = defRegex.exec(body)) !== null) {
      const startLine = body.substring(0, match.index).split('\n').length;
      const endLine = findPythonBlockEnd(body, match.index);
      const methodBody = body.substring(match.index, getPositionAtLine(body, endLine));

      methods.push({
        name: match[1],
        type: match[1] === '__init__' ? 'constructor' : 'method',
        line: startLine,
        endLine,
        visibility: match[1].startsWith('_') && !match[1].startsWith('__') ? 'private' : 'public',
        isAsync: body.substring(Math.max(0, match.index - 10), match.index).includes('async'),
        isStatic: false,
        isGenerator: methodBody.includes('yield'),
        parameters: this.parseParameters(match[2]),
        returnType: match[3]?.trim(),
        decorators: this.extractDecorators(body, match.index),
        calls: this.extractFunctionCalls(methodBody),
        variableUsages: extractVariableUsages(methodBody, 'python'),
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
      if (!trimmed || trimmed === 'self' || trimmed === 'cls') continue;

      const match = trimmed.match(/(?:\*\*?)?(\w+)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?/);
      if (match) {
        result.push({
          name: match[1],
          type: match[2]?.trim(),
          defaultValue: match[3]?.trim(),
          isOptional: !!match[3],
          isRest: trimmed.startsWith('*')
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
      if (['if', 'while', 'for', 'with', 'def', 'class', 'return', 'raise', 'except'].includes(funcName)) continue;

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
export const pythonParser = new PythonParser();
