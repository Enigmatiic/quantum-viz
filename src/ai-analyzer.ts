// =============================================================================
// AI ANALYZER - Classification sémantique et analyse contextuelle
// Supporte OpenAI, Anthropic (Claude), et Ollama (local)
// =============================================================================

import type { CodeNode, FileInfo } from './types';

// =============================================================================
// TYPES
// =============================================================================

export type AIProvider = 'openai' | 'anthropic' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;  // Pour Ollama ou API custom
  maxTokens?: number;
  temperature?: number;
}

export type ComponentRole =
  | 'controller'      // Gère les requêtes HTTP, routing
  | 'service'         // Logique métier
  | 'repository'      // Accès aux données
  | 'model'           // Structures de données
  | 'utility'         // Fonctions utilitaires
  | 'config'          // Configuration
  | 'test'            // Tests
  | 'middleware'      // Middleware/intercepteurs
  | 'view'            // UI/templates
  | 'hook'            // React hooks ou similaire
  | 'store'           // State management
  | 'api'             // Client API
  | 'validator'       // Validation
  | 'transformer'     // Transformation de données
  | 'unknown';

export interface ClassificationResult {
  nodeId: string;
  nodeName: string;
  role: ComponentRole;
  confidence: number;  // 0-1
  reasoning: string;
  suggestedTags?: string[];
}

export interface VulnerabilityValidation {
  vulnerabilityId: string;
  isValid: boolean;
  confidence: number;
  explanation: string;
  suggestedFix?: string;
  falsePositiveReason?: string;
}

export interface CodeExplanation {
  summary: string;
  purpose: string;
  keyComponents: string[];
  dependencies: string[];
  potentialIssues?: string[];
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: AIConfig = {
  provider: 'ollama',
  model: 'llama3.2',
  baseUrl: 'http://localhost:11434',
  maxTokens: 1000,
  temperature: 0.3
};

// =============================================================================
// LLM CLIENT
// =============================================================================

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  tokensUsed?: number;
}

class LLMClient {
  private config: AIConfig;

  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async complete(messages: LLMMessage[]): Promise<LLMResponse> {
    switch (this.config.provider) {
      case 'openai':
        return this.callOpenAI(messages);
      case 'anthropic':
        return this.callAnthropic(messages);
      case 'ollama':
        return this.callOllama(messages);
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  private async callOpenAI(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key required');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens
    };
  }

  private async callAnthropic(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key required');
    }

    // Extract system message
    const systemMsg = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-haiku-20240307',
        max_tokens: this.config.maxTokens || 1000,
        system: systemMsg?.content,
        messages: userMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens
    };
  }

  private async callOllama(messages: LLMMessage[]): Promise<LLMResponse> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';

    // Convert messages to Ollama format
    const prompt = messages.map(m => {
      if (m.role === 'system') return `System: ${m.content}`;
      if (m.role === 'user') return `User: ${m.content}`;
      return `Assistant: ${m.content}`;
    }).join('\n\n');

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model || 'llama3.2',
        prompt,
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.response,
      tokensUsed: data.eval_count
    };
  }
}

// =============================================================================
// AI ANALYZER
// =============================================================================

export class AIAnalyzer {
  private client: LLMClient;
  private cache: Map<string, ClassificationResult> = new Map();

  constructor(config: Partial<AIConfig> = {}) {
    this.client = new LLMClient(config);
  }

  /**
   * Classify components by their architectural role
   */
  async classifyComponents(
    nodes: CodeNode[],
    files: FileInfo[],
    onProgress?: (current: number, total: number) => void
  ): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];
    const fileNodes = nodes.filter(n => n.level === 'L3'); // Files only

    for (let i = 0; i < fileNodes.length; i++) {
      const node = fileNodes[i];

      // Check cache
      if (this.cache.has(node.id)) {
        results.push(this.cache.get(node.id)!);
        continue;
      }

      // Get file info
      const fileInfo = files.find(f => f.path === node.location.file);
      if (!fileInfo) continue;

      try {
        const result = await this.classifyFile(node, fileInfo);
        results.push(result);
        this.cache.set(node.id, result);

        if (onProgress) {
          onProgress(i + 1, fileNodes.length);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to classify ${node.name}:`, error);
        results.push({
          nodeId: node.id,
          nodeName: node.name,
          role: 'unknown',
          confidence: 0,
          reasoning: 'Classification failed'
        });
      }
    }

    return results;
  }

  private async classifyFile(node: CodeNode, fileInfo: FileInfo): Promise<ClassificationResult> {
    const imports = fileInfo.imports.map(i => i.module).join(', ');
    const exports = fileInfo.exports.map(e => e.name).join(', ');
    const functions = fileInfo.functions.map(f => f.name).slice(0, 10).join(', ');
    const classes = fileInfo.classes.map(c => c.name).join(', ');

    const prompt = `Analyze this code file and determine its architectural role.

File: ${node.name}
Path: ${node.location.file}
Language: ${fileInfo.language}
Imports: ${imports || 'none'}
Exports: ${exports || 'none'}
Functions: ${functions || 'none'}
Classes: ${classes || 'none'}
Lines of code: ${fileInfo.lineCount}

Classify this file into ONE of these roles:
- controller: HTTP handlers, routing, request processing
- service: Business logic, domain operations
- repository: Data access, database queries
- model: Data structures, types, interfaces
- utility: Helper functions, common utilities
- config: Configuration, settings, constants
- test: Test files
- middleware: Request/response interceptors
- view: UI components, templates
- hook: React hooks or similar patterns
- store: State management
- api: API clients, external service calls
- validator: Input validation, schemas
- transformer: Data transformation, mapping

Respond ONLY with a JSON object:
{
  "role": "the_role",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "tags": ["optional", "tags"]
}`;

    const response = await this.client.complete([
      {
        role: 'system',
        content: 'You are a code architecture analyzer. Respond only with valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);

    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        nodeId: node.id,
        nodeName: node.name,
        role: parsed.role as ComponentRole || 'unknown',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || '',
        suggestedTags: parsed.tags
      };
    } catch (error) {
      console.warn(`Failed to parse classification response for ${node.name}`);
      return {
        nodeId: node.id,
        nodeName: node.name,
        role: this.inferRoleFromName(node.name),
        confidence: 0.3,
        reasoning: 'Inferred from filename'
      };
    }
  }

  /**
   * Fallback: infer role from filename patterns
   */
  private inferRoleFromName(filename: string): ComponentRole {
    const lower = filename.toLowerCase();

    if (lower.includes('.test.') || lower.includes('.spec.') || lower.includes('_test.')) {
      return 'test';
    }
    if (lower.includes('controller') || lower.includes('handler') || lower.includes('route')) {
      return 'controller';
    }
    if (lower.includes('service') || lower.includes('usecase')) {
      return 'service';
    }
    if (lower.includes('repository') || lower.includes('repo') || lower.includes('dao')) {
      return 'repository';
    }
    if (lower.includes('model') || lower.includes('entity') || lower.includes('type')) {
      return 'model';
    }
    if (lower.includes('util') || lower.includes('helper') || lower.includes('lib')) {
      return 'utility';
    }
    if (lower.includes('config') || lower.includes('setting')) {
      return 'config';
    }
    if (lower.includes('middleware')) {
      return 'middleware';
    }
    if (lower.includes('component') || lower.includes('view') || lower.includes('page')) {
      return 'view';
    }
    if (lower.includes('hook') || lower.startsWith('use')) {
      return 'hook';
    }
    if (lower.includes('store') || lower.includes('state') || lower.includes('reducer')) {
      return 'store';
    }
    if (lower.includes('api') || lower.includes('client')) {
      return 'api';
    }
    if (lower.includes('valid') || lower.includes('schema')) {
      return 'validator';
    }
    if (lower.includes('transform') || lower.includes('mapper') || lower.includes('convert')) {
      return 'transformer';
    }

    return 'unknown';
  }

  /**
   * Validate a potential vulnerability using AI context
   */
  async validateVulnerability(
    vulnId: string,
    vulnDescription: string,
    codeSnippet: string,
    context: string
  ): Promise<VulnerabilityValidation> {
    const prompt = `Analyze this potential security vulnerability:

Vulnerability: ${vulnDescription}
Code snippet:
\`\`\`
${codeSnippet}
\`\`\`

Context:
${context}

Determine if this is a TRUE vulnerability or a FALSE POSITIVE.

Consider:
1. Is user input actually reaching this code path?
2. Are there sanitization/validation steps before this code?
3. Is this in a test file or example code?
4. Is the pattern used safely in this context?

Respond ONLY with a JSON object:
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "explanation": "detailed explanation",
  "suggestedFix": "if valid, how to fix",
  "falsePositiveReason": "if false positive, why"
}`;

    const response = await this.client.complete([
      {
        role: 'system',
        content: 'You are a security expert analyzing potential vulnerabilities. Be thorough but avoid false positives.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        vulnerabilityId: vulnId,
        isValid: parsed.isValid,
        confidence: parsed.confidence,
        explanation: parsed.explanation,
        suggestedFix: parsed.suggestedFix,
        falsePositiveReason: parsed.falsePositiveReason
      };
    } catch (error) {
      return {
        vulnerabilityId: vulnId,
        isValid: true, // Default to valid if parsing fails
        confidence: 0.5,
        explanation: 'Could not analyze - manual review recommended'
      };
    }
  }

  /**
   * Generate a natural language explanation of code
   */
  async explainCode(code: string, question?: string): Promise<CodeExplanation> {
    const prompt = question
      ? `Analyze this code and answer: ${question}\n\nCode:\n\`\`\`\n${code}\n\`\`\``
      : `Analyze this code and provide a summary:\n\`\`\`\n${code}\n\`\`\``;

    const response = await this.client.complete([
      {
        role: 'system',
        content: 'You are a code analysis expert. Provide clear, concise explanations.'
      },
      {
        role: 'user',
        content: `${prompt}

Respond with a JSON object:
{
  "summary": "one sentence summary",
  "purpose": "what this code does",
  "keyComponents": ["main functions/classes"],
  "dependencies": ["external dependencies used"],
  "potentialIssues": ["any concerns"]
}`
      }
    ]);

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      return {
        summary: 'Analysis could not be completed',
        purpose: 'Unknown',
        keyComponents: [],
        dependencies: []
      };
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createAIAnalyzer(config?: Partial<AIConfig>): AIAnalyzer {
  return new AIAnalyzer(config);
}
