// =============================================================================
// ARCHITECTURE DETECTOR - Détection automatique du pattern architectural
// =============================================================================

import {
  ALL_PATTERNS,
  ArchitecturePattern,
  DetectionResult,
  PatternIndicator,
  ArchitectureViolation,
  ArchitectureLayer
} from './patterns';
import type { OllamaClient } from '../ai/ollama-client';

export interface DetectorConfig {
  useAI: boolean;
  aiClient?: OllamaClient;
  minConfidence: number;  // Seuil minimum de confiance (0-100)
  detectViolations: boolean;
}

export interface FileInfo {
  path: string;
  imports: string[];
  exports: string[];
}

export interface DetectionContext {
  files: FileInfo[];
  folders: string[];
  projectRoot: string;
}

const DEFAULT_CONFIG: DetectorConfig = {
  useAI: false,
  minConfidence: 30,
  detectViolations: true
};

// =============================================================================
// MAIN DETECTOR CLASS
// =============================================================================

export class ArchitectureDetector {
  private config: DetectorConfig;
  private aiClient?: OllamaClient;

  constructor(config: Partial<DetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aiClient = config.aiClient;
  }

  /**
   * Détecte le pattern architectural d'un projet
   */
  async detect(context: DetectionContext): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    // Score chaque pattern
    for (const pattern of ALL_PATTERNS) {
      const score = this.scorePattern(pattern, context);

      if (score.confidence >= this.config.minConfidence) {
        results.push(score);
      }
    }

    // Trier par confiance décroissante
    results.sort((a, b) => b.confidence - a.confidence);

    // Booster avec l'IA si activé
    if (this.config.useAI && this.aiClient && results.length > 0) {
      const aiEnhanced = await this.enhanceWithAI(results, context);
      return aiEnhanced;
    }

    return results;
  }

  /**
   * Score un pattern contre le contexte du projet
   */
  private scorePattern(pattern: ArchitecturePattern, context: DetectionContext): DetectionResult {
    const matchedIndicators: PatternIndicator[] = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    // Vérifier chaque indicateur
    for (const indicator of pattern.indicators) {
      totalWeight += indicator.weight;
      const matched = this.checkIndicator(indicator, context);

      if (matched) {
        matchedIndicators.push(indicator);
        matchedWeight += indicator.weight;
      }
    }

    // Vérifier les indicateurs requis
    const requiredIndicators = pattern.indicators.filter(i => i.required);
    const allRequiredMatched = requiredIndicators.every(i =>
      matchedIndicators.some(m => m.pattern.source === i.pattern.source)
    );

    // Calculer la distribution par couche
    const layerDistribution = this.calculateLayerDistribution(pattern, context);

    // Bonus si plusieurs couches sont présentes
    const layersPresent = Array.from(layerDistribution.values()).filter(v => v > 0).length;
    const layerBonus = (layersPresent / pattern.layers.length) * 20;

    // Calculer la confiance
    let confidence = (matchedWeight / Math.max(totalWeight, 1)) * 80 + layerBonus;

    // Pénalité si indicateurs requis manquants
    if (!allRequiredMatched) {
      confidence *= 0.3;
    }

    // Limiter à 100
    confidence = Math.min(100, Math.round(confidence));

    // Détecter les violations si demandé
    const violations: ArchitectureViolation[] = [];
    if (this.config.detectViolations && confidence > this.config.minConfidence) {
      violations.push(...this.detectViolations(pattern, context, layerDistribution));
    }

    return {
      pattern,
      confidence,
      matchedIndicators,
      layerDistribution,
      violations
    };
  }

  /**
   * Vérifie si un indicateur match
   */
  private checkIndicator(indicator: PatternIndicator, context: DetectionContext): boolean {
    switch (indicator.type) {
      case 'folder':
        return context.folders.some(f => indicator.pattern.test(f));

      case 'file':
        return context.files.some(f => indicator.pattern.test(f.path));

      case 'naming':
        return context.files.some(f => indicator.pattern.test(f.path));

      case 'import':
        return context.files.some(f =>
          f.imports.some(imp => indicator.pattern.test(imp))
        );

      default:
        return false;
    }
  }

  /**
   * Calcule la distribution des fichiers par couche
   */
  private calculateLayerDistribution(
    pattern: ArchitecturePattern,
    context: DetectionContext
  ): Map<string, number> {
    const distribution = new Map<string, number>();

    // Initialiser toutes les couches à 0
    for (const layer of pattern.layers) {
      distribution.set(layer.name, 0);
    }

    // Compter les fichiers par couche
    for (const file of context.files) {
      for (const layer of pattern.layers) {
        if (this.fileMatchesLayer(file.path, layer)) {
          distribution.set(layer.name, (distribution.get(layer.name) || 0) + 1);
          break; // Un fichier ne peut appartenir qu'à une couche
        }
      }
    }

    return distribution;
  }

  /**
   * Vérifie si un fichier appartient à une couche
   */
  private fileMatchesLayer(filePath: string, layer: ArchitectureLayer): boolean {
    // Vérifier les alias de dossiers
    for (const alias of layer.aliases) {
      const aliasPattern = new RegExp(`[/\\\\]${alias}[/\\\\]`, 'i');
      if (aliasPattern.test(filePath)) {
        return true;
      }
    }

    // Vérifier les patterns
    for (const pattern of layer.patterns) {
      if (pattern.test(filePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Détecte les violations architecturales
   */
  private detectViolations(
    pattern: ArchitecturePattern,
    context: DetectionContext,
    layerDistribution: Map<string, number>
  ): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];

    for (const file of context.files) {
      const sourceLayer = this.getFileLayer(file.path, pattern);
      if (!sourceLayer) continue;

      // Vérifier les imports
      for (const importPath of file.imports) {
        const targetLayer = this.getFileLayer(importPath, pattern);
        if (!targetLayer) continue;

        // Vérifier si cette dépendance est autorisée
        if (!this.isDependencyAllowed(sourceLayer, targetLayer, pattern)) {
          violations.push({
            type: 'dependency',
            severity: pattern.strictness === 'strict' ? 'error' : 'warning',
            sourceFile: file.path,
            targetFile: importPath,
            sourceLayer: sourceLayer.name,
            targetLayer: targetLayer.name,
            message: `Violation: ${sourceLayer.name} ne devrait pas dépendre de ${targetLayer.name}`
          });
        }
      }
    }

    return violations;
  }

  /**
   * Trouve la couche d'un fichier
   */
  private getFileLayer(filePath: string, pattern: ArchitecturePattern): ArchitectureLayer | null {
    for (const layer of pattern.layers) {
      if (this.fileMatchesLayer(filePath, layer)) {
        return layer;
      }
    }
    return null;
  }

  /**
   * Vérifie si une dépendance est autorisée
   */
  private isDependencyAllowed(
    source: ArchitectureLayer,
    target: ArchitectureLayer,
    pattern: ArchitecturePattern
  ): boolean {
    // Même couche = OK
    if (source.name === target.name) return true;

    // Vérifier les dépendances autorisées
    return source.allowedDependencies.includes(target.name);
  }

  /**
   * Améliore la détection avec l'IA
   */
  private async enhanceWithAI(
    results: DetectionResult[],
    context: DetectionContext
  ): Promise<DetectionResult[]> {
    if (!this.aiClient) return results;

    try {
      // Préparer le contexte pour l'IA
      const projectStructure = this.summarizeStructure(context);
      const topPatterns = results.slice(0, 3).map(r => ({
        name: r.pattern.name,
        confidence: r.confidence,
        layers: Array.from(r.layerDistribution.entries())
      }));

      const prompt = `Analyse cette structure de projet et confirme/ajuste la détection d'architecture:

Structure du projet:
${projectStructure}

Patterns détectés (par heuristique):
${JSON.stringify(topPatterns, null, 2)}

Réponds en JSON avec le format:
{
  "primaryPattern": "nom du pattern principal",
  "confidence": number (0-100),
  "reasoning": "explication courte",
  "adjustments": [{"pattern": "nom", "newConfidence": number}]
}`;

      const response = await this.aiClient.generate(prompt);
      const aiResult = JSON.parse(response);

      // Appliquer les ajustements de l'IA
      for (const adjustment of aiResult.adjustments || []) {
        const result = results.find(r => r.pattern.name === adjustment.pattern);
        if (result) {
          // Moyenne pondérée entre heuristique et IA
          result.confidence = Math.round(
            (result.confidence * 0.6) + (adjustment.newConfidence * 0.4)
          );
        }
      }

      // Re-trier
      results.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.warn('AI enhancement failed, using heuristic results:', error);
    }

    return results;
  }

  /**
   * Résume la structure du projet pour l'IA
   */
  private summarizeStructure(context: DetectionContext): string {
    const folderTree = context.folders
      .slice(0, 50)
      .map(f => `  ${f}`)
      .join('\n');

    const sampleFiles = context.files
      .slice(0, 30)
      .map(f => `  ${f.path}`)
      .join('\n');

    return `Dossiers principaux:\n${folderTree}\n\nFichiers exemples:\n${sampleFiles}`;
  }

  /**
   * Classifie un fichier dans une couche (pour usage externe)
   */
  classifyFile(filePath: string, pattern: ArchitecturePattern): ArchitectureLayer | null {
    return this.getFileLayer(filePath, pattern);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extrait les dossiers d'une liste de fichiers
 */
export function extractFolders(files: string[]): string[] {
  const folders = new Set<string>();

  for (const file of files) {
    const parts = file.replace(/\\/g, '/').split('/');
    let current = '';

    for (let i = 0; i < parts.length - 1; i++) {
      current += (current ? '/' : '') + parts[i];
      folders.add(current);
    }
  }

  return Array.from(folders).sort();
}

/**
 * Crée un contexte de détection à partir de données d'analyse
 */
export function createDetectionContext(
  analysisData: {
    files: Array<{ path: string; imports?: string[]; exports?: string[] }>;
  },
  projectRoot: string
): DetectionContext {
  const files: FileInfo[] = analysisData.files.map(f => ({
    path: f.path,
    imports: f.imports || [],
    exports: f.exports || []
  }));

  const folders = extractFolders(files.map(f => f.path));

  return {
    files,
    folders,
    projectRoot
  };
}

export default ArchitectureDetector;
