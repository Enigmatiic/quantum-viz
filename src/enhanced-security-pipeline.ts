// =============================================================================
// ENHANCED SECURITY PIPELINE
// Intègre l'analyse AST + validation AI pour réduire les faux positifs de 80% à ~15%
// Module principal de sécurité - remplace l'ancien security-analyzer
// =============================================================================

import {
  SecurityAnalyzer as BaseSecurityAnalyzer,
  type SecurityReport,
  type SecurityVulnerability,
  type VulnerabilitySeverity,
  type VulnerabilityCategory,
  type AttackSurface,
  type EndpointInfo,
  type InputPoint,
  type ExternalCall,
  type DatabaseOperation,
  type FileOperation,
  type ProcessExecution,
  type DataFlowRisk,
  type SecretFinding,
} from './security-analyzer';
import { filterVulnerabilityWithAST } from './ast-analyzer';
import {
  AIVulnerabilityValidator,
  createAIVulnerabilityValidator,
  extractFunctionContext,
  getSurroundingContext,
  type AIValidationResult,
  type AIValidatorConfig,
  type VulnerabilityContext
} from './ai-vulnerability-validator';
import type { FileInfo } from './types';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// RE-EXPORT DES TYPES POUR COMPATIBILITÉ
// =============================================================================

export type {
  SecurityReport,
  SecurityVulnerability,
  VulnerabilitySeverity,
  VulnerabilityCategory,
  AttackSurface,
  EndpointInfo,
  InputPoint,
  ExternalCall,
  DatabaseOperation,
  FileOperation,
  ProcessExecution,
  DataFlowRisk,
  SecretFinding,
};

// =============================================================================
// TYPES
// =============================================================================

export interface EnhancedSecurityConfig {
  // Enable/disable pipeline stages
  enableASTFiltering: boolean;
  enableAIValidation: boolean;

  // AST settings
  ast: {
    strictMode: boolean;  // Fail-safe: only filter if very confident
  };

  // AI validation settings
  ai: AIValidatorConfig;

  // Filtering thresholds
  thresholds: {
    astConfidenceToFilter: number;    // Min AST confidence to auto-filter (0-1)
    aiConfidenceToFilter: number;     // Min AI confidence to auto-filter (0-1)
    maxVulnsForAIValidation: number;  // Max vulns to send to AI (cost control)
  };

  // Callbacks
  onProgress?: (stage: string, current: number, total: number) => void;
  onVulnerabilityFiltered?: (vuln: SecurityVulnerability, reason: string, method: 'ast' | 'ai') => void;
}

export interface EnhancedSecurityReport extends SecurityReport {
  pipeline: {
    originalCount: number;
    afterASTFilter: number;
    afterAIValidation: number;
    falsePositivesRemoved: number;
    truePositivesConfirmed: number;
    needsManualReview: number;
    processingTimeMs: number;
  };
  aiValidations: Map<string, AIValidationResult>;
  astFiltered: Array<{ vuln: SecurityVulnerability; reason: string }>;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: EnhancedSecurityConfig = {
  enableASTFiltering: true,
  enableAIValidation: true,
  ast: {
    strictMode: true,
  },
  ai: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4000,
    temperature: 0.2,
    timeout: 60000,
    batchSize: 5,
    rateLimitMs: 200,
    enableDataFlowAnalysis: true,
    enableASTAnalysis: true,
  },
  thresholds: {
    astConfidenceToFilter: 0.85,
    aiConfidenceToFilter: 0.80,
    maxVulnsForAIValidation: 50,
  },
};

// =============================================================================
// ENHANCED SECURITY PIPELINE CLASS
// =============================================================================

export class EnhancedSecurityPipeline {
  private config: EnhancedSecurityConfig;
  private baseAnalyzer: BaseSecurityAnalyzer;
  private aiValidator?: AIVulnerabilityValidator;
  private fileContentCache: Map<string, string> = new Map();

  constructor(config: Partial<EnhancedSecurityConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);
    this.baseAnalyzer = new BaseSecurityAnalyzer();

    if (this.config.enableAIValidation && this.config.ai.apiKey) {
      this.aiValidator = createAIVulnerabilityValidator(this.config.ai);
    }
  }

  // ===========================================================================
  // MÉTHODE COMPATIBLE AVEC L'ANCIEN SecurityAnalyzer.analyzeFiles()
  // ===========================================================================

  /**
   * Analyse les fichiers avec le pipeline amélioré (AST + AI optionnel)
   * Compatible avec l'ancienne API de SecurityAnalyzer
   */
  async analyzeFiles(
    files: FileInfo[],
    basePath: string,
    readFile: (path: string) => string
  ): Promise<EnhancedSecurityReport> {
    // Charger le contenu des fichiers
    const filesWithContent: FileInfo[] = files.map(file => {
      try {
        const fullPath = path.join(basePath, file.path);
        const content = readFile(fullPath);
        return { ...file, content };
      } catch {
        return file;
      }
    });

    // Lancer le pipeline complet
    return this.analyze(filesWithContent);
  }

  private mergeConfig(
    defaults: EnhancedSecurityConfig,
    overrides: Partial<EnhancedSecurityConfig>
  ): EnhancedSecurityConfig {
    return {
      ...defaults,
      ...overrides,
      ast: { ...defaults.ast, ...overrides.ast },
      ai: { ...defaults.ai, ...overrides.ai },
      thresholds: { ...defaults.thresholds, ...overrides.thresholds },
    };
  }

  // ===========================================================================
  // MAIN PIPELINE
  // ===========================================================================

  /**
   * Run the full enhanced security analysis pipeline
   */
  async analyze(files: FileInfo[]): Promise<EnhancedSecurityReport> {
    const startTime = Date.now();

    // Cache file contents for AST analysis
    this.cacheFileContents(files);

    // Stage 1: Base security analysis (détection regex)
    this.reportProgress('base_analysis', 0, 1);

    // Créer une map des contenus pour l'analyseur de base
    const fileMap = new Map<string, string>();
    for (const file of files) {
      if (file.content) {
        fileMap.set(file.path, file.content);
      }
    }

    // Utiliser analyzeFiles de l'analyseur de base
    // Note: baseAnalyzer.analyzeFiles utilise `${basePath}/${file.path}` donc on passe
    // une fonction qui retire le préfixe '/' pour retrouver le bon chemin
    const baseReport = await this.baseAnalyzer.analyzeFiles(
      files,
      '', // basePath vide car les fichiers ont déjà le contenu
      (filePath: string) => {
        // filePath sera "/<path>" donc on retire le "/" initial
        const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        return fileMap.get(cleanPath) || '';
      }
    );
    const originalCount = baseReport.vulnerabilities.length;

    let vulnerabilities = [...baseReport.vulnerabilities];
    const astFiltered: Array<{ vuln: SecurityVulnerability; reason: string }> = [];
    const aiValidations = new Map<string, AIValidationResult>();

    // Stage 2: AST-based filtering
    if (this.config.enableASTFiltering) {
      const astResult = this.applyASTFiltering(vulnerabilities);
      vulnerabilities = astResult.remaining;
      astFiltered.push(...astResult.filtered);
    }

    // Stage 3: AI-based validation
    let truePositivesConfirmed = 0;
    let needsManualReview = 0;

    if (this.config.enableAIValidation && this.aiValidator) {
      const aiResult = await this.applyAIValidation(vulnerabilities, files);
      vulnerabilities = aiResult.remaining;
      truePositivesConfirmed = aiResult.truePositives;
      needsManualReview = aiResult.needsReview;

      for (const [key, value] of aiResult.validations) {
        aiValidations.set(key, value);
      }
    }

    // Build enhanced report
    const processingTimeMs = Date.now() - startTime;

    return {
      ...baseReport,
      vulnerabilities,
      summary: this.recalculateSummary(vulnerabilities),
      byCategory: this.recategorize(vulnerabilities),
      pipeline: {
        originalCount,
        afterASTFilter: originalCount - astFiltered.length,
        afterAIValidation: vulnerabilities.length,
        falsePositivesRemoved: originalCount - vulnerabilities.length,
        truePositivesConfirmed,
        needsManualReview,
        processingTimeMs,
      },
      aiValidations,
      astFiltered,
    };
  }

  // ===========================================================================
  // STAGE 2: AST FILTERING
  // ===========================================================================

  private applyASTFiltering(vulnerabilities: SecurityVulnerability[]): {
    remaining: SecurityVulnerability[];
    filtered: Array<{ vuln: SecurityVulnerability; reason: string }>;
  } {
    const remaining: SecurityVulnerability[] = [];
    const filtered: Array<{ vuln: SecurityVulnerability; reason: string }> = [];

    for (let i = 0; i < vulnerabilities.length; i++) {
      const vuln = vulnerabilities[i];
      this.reportProgress('ast_filtering', i + 1, vulnerabilities.length);

      const fileContent = this.fileContentCache.get(vuln.location.file);
      if (!fileContent) {
        remaining.push(vuln);
        continue;
      }

      const astResult = filterVulnerabilityWithAST(vuln, fileContent);

      if (
        astResult.isLikelyFalsePositive &&
        astResult.confidence >= this.config.thresholds.astConfidenceToFilter
      ) {
        filtered.push({ vuln, reason: astResult.reason || 'AST analysis' });
        this.config.onVulnerabilityFiltered?.(vuln, astResult.reason || 'AST analysis', 'ast');
      } else {
        remaining.push(vuln);
      }
    }

    return { remaining, filtered };
  }

  // ===========================================================================
  // STAGE 3: AI VALIDATION
  // ===========================================================================

  private async applyAIValidation(
    vulnerabilities: SecurityVulnerability[],
    files: FileInfo[]
  ): Promise<{
    remaining: SecurityVulnerability[];
    truePositives: number;
    needsReview: number;
    validations: Map<string, AIValidationResult>;
  }> {
    if (!this.aiValidator) {
      return {
        remaining: vulnerabilities,
        truePositives: 0,
        needsReview: vulnerabilities.length,
        validations: new Map(),
      };
    }

    // Limit number of vulns sent to AI (cost control)
    const vulnsToValidate = vulnerabilities.slice(0, this.config.thresholds.maxVulnsForAIValidation);
    const remaining: SecurityVulnerability[] = [];
    const validations = new Map<string, AIValidationResult>();
    let truePositives = 0;
    let needsReview = 0;

    // Build contexts for AI validation
    const contexts: VulnerabilityContext[] = vulnsToValidate.map(vuln => {
      const fileContent = this.fileContentCache.get(vuln.location.file) || '';
      const fileInfo = files.find(f => f.path === vuln.location.file);

      return {
        vulnerability: vuln,
        fullFunction: extractFunctionContext(fileContent, vuln.location.line, this.detectLanguage(vuln.location.file)),
        fileContent,
        fileImports: fileInfo?.imports.map(i => i.module) || [],
        surroundingCode: getSurroundingContext(fileContent, vuln.location.line, 30),
      };
    });

    // Validate with AI
    const results = await this.aiValidator.validateBatch(
      contexts,
      (current, total, result) => {
        this.reportProgress('ai_validation', current, total);
      }
    );

    // Process results
    for (const vuln of vulnsToValidate) {
      const key = `${vuln.location.file}:${vuln.location.line}`;
      const result = results.get(key);

      if (result) {
        validations.set(key, result);

        if (result.verdict === 'FALSE_POSITIVE' &&
            result.confidence >= this.config.thresholds.aiConfidenceToFilter) {
          // Filter out
          this.config.onVulnerabilityFiltered?.(vuln, result.falsePositiveReason || 'AI validation', 'ai');
        } else if (result.verdict === 'TRUE_POSITIVE') {
          truePositives++;
          remaining.push(vuln);
        } else {
          needsReview++;
          remaining.push(vuln);
        }
      } else {
        remaining.push(vuln);
        needsReview++;
      }
    }

    // Add vulns that weren't validated (over limit)
    const notValidated = vulnerabilities.slice(this.config.thresholds.maxVulnsForAIValidation);
    remaining.push(...notValidated);
    needsReview += notValidated.length;

    return { remaining, truePositives, needsReview, validations };
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  private cacheFileContents(files: FileInfo[]): void {
    for (const file of files) {
      if (file.content) {
        this.fileContentCache.set(file.path, file.content);
      }
    }
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'rs': 'rust',
      'go': 'go',
    };
    return langMap[ext] || 'typescript';
  }

  private reportProgress(stage: string, current: number, total: number): void {
    this.config.onProgress?.(stage, current, total);
  }

  private recalculateSummary(vulnerabilities: SecurityVulnerability[]): SecurityReport['summary'] {
    return {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      info: vulnerabilities.filter(v => v.severity === 'info').length,
      total: vulnerabilities.length,
    };
  }

  private recategorize(
    vulnerabilities: SecurityVulnerability[]
  ): Record<string, SecurityVulnerability[]> {
    const byCategory: Record<string, SecurityVulnerability[]> = {};

    for (const vuln of vulnerabilities) {
      if (!byCategory[vuln.category]) {
        byCategory[vuln.category] = [];
      }
      byCategory[vuln.category].push(vuln);
    }

    return byCategory;
  }

  // ===========================================================================
  // STATS
  // ===========================================================================

  getAIValidatorStats() {
    return this.aiValidator?.getStats();
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createEnhancedSecurityPipeline(
  config?: Partial<EnhancedSecurityConfig>
): EnhancedSecurityPipeline {
  return new EnhancedSecurityPipeline(config);
}

// =============================================================================
// QUICK ANALYSIS FUNCTION
// =============================================================================

/**
 * Quick function to run enhanced security analysis with default settings
 */
export async function analyzeSecurityEnhanced(
  files: FileInfo[],
  options: {
    apiKey?: string;
    provider?: 'anthropic' | 'openai' | 'ollama';
    model?: string;
    onProgress?: (stage: string, current: number, total: number) => void;
  } = {}
): Promise<EnhancedSecurityReport> {
  const pipeline = createEnhancedSecurityPipeline({
    enableAIValidation: !!options.apiKey,
    ai: {
      provider: options.provider || 'anthropic',
      model: options.model || 'claude-sonnet-4-20250514',
      apiKey: options.apiKey,
      maxTokens: 4000,
      temperature: 0.2,
      timeout: 60000,
      batchSize: 5,
      rateLimitMs: 200,
      enableDataFlowAnalysis: true,
      enableASTAnalysis: true,
    },
    onProgress: options.onProgress,
  });

  return pipeline.analyze(files);
}

// =============================================================================
// ALIAS POUR COMPATIBILITÉ
// =============================================================================

/**
 * SecurityAnalyzer - Alias vers EnhancedSecurityPipeline
 * Permet de remplacer l'ancien security-analyzer par le nouveau pipeline
 * tout en gardant la même interface.
 *
 * Usage:
 *   import { SecurityAnalyzer } from './enhanced-security-pipeline';
 *   const analyzer = new SecurityAnalyzer();
 *   const report = await analyzer.analyzeFiles(files, basePath, readFile);
 */
export { EnhancedSecurityPipeline as SecurityAnalyzer };
