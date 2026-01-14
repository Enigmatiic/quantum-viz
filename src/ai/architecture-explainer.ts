// =============================================================================
// ARCHITECTURE EXPLAINER - Génération d'explications IA de l'architecture
// =============================================================================

import { OllamaClient, isOllamaAvailable } from './ollama-client';
import type { DetectionResult, ArchitectureViolation } from '../architecture/patterns';
import type { ClassificationResult, ClassifiedFile } from '../architecture/classifier';
import type { FlowAnalysisResult, DataFlow } from '../architecture/flow-analyzer';

// =============================================================================
// TYPES
// =============================================================================

export interface ArchitectureExplanation {
  summary: string;
  patternAnalysis: PatternAnalysis;
  layerExplanations: LayerExplanation[];
  flowExplanations: FlowExplanation[];
  recommendations: Recommendation[];
  codeQuality: CodeQualityAssessment;
}

export interface PatternAnalysis {
  detectedPattern: string;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  conformityScore: number;
  alternativePatterns: string[];
}

export interface LayerExplanation {
  layerName: string;
  purpose: string;
  responsibilities: string[];
  keyFiles: string[];
  dependencies: string[];
  healthScore: number;
}

export interface FlowExplanation {
  flowName: string;
  description: string;
  steps: string[];
  dataTransformations: string[];
  potentialIssues: string[];
}

export interface Recommendation {
  type: 'improvement' | 'warning' | 'best-practice' | 'refactoring';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedFiles: string[];
  suggestedActions: string[];
}

export interface CodeQualityAssessment {
  overallScore: number;
  separation: number;      // Séparation des concerns
  cohesion: number;        // Cohésion des modules
  coupling: number;        // Couplage (faible = bon)
  testability: number;     // Facilité de test
  maintainability: number; // Maintenabilité
}

export interface ExplainerConfig {
  aiClient: OllamaClient;
  language: 'fr' | 'en';
  detailLevel: 'brief' | 'normal' | 'detailed';
  includeCodeSnippets: boolean;
}

// =============================================================================
// ARCHITECTURE EXPLAINER CLASS
// =============================================================================

export class ArchitectureExplainer {
  private config: ExplainerConfig;

  constructor(config: ExplainerConfig) {
    this.config = config;
  }

  /**
   * Génère une explication complète de l'architecture
   */
  async explain(
    detection: DetectionResult,
    classification: ClassificationResult,
    flowAnalysis: FlowAnalysisResult
  ): Promise<ArchitectureExplanation> {
    // Vérifier la disponibilité d'Ollama
    const available = await isOllamaAvailable();
    if (!available) {
      return this.generateFallbackExplanation(detection, classification, flowAnalysis);
    }

    try {
      // Générer les différentes parties en parallèle
      const [patternAnalysis, layerExplanations, flowExplanations, recommendations] =
        await Promise.all([
          this.analyzePattern(detection),
          this.explainLayers(classification, detection),
          this.explainFlows(flowAnalysis),
          this.generateRecommendations(detection, classification, flowAnalysis)
        ]);

      // Générer le résumé
      const summary = await this.generateSummary(
        detection,
        classification,
        flowAnalysis,
        patternAnalysis
      );

      // Évaluer la qualité du code
      const codeQuality = this.assessCodeQuality(detection, classification, flowAnalysis);

      return {
        summary,
        patternAnalysis,
        layerExplanations,
        flowExplanations,
        recommendations,
        codeQuality
      };
    } catch (error) {
      console.error('AI explanation failed, using fallback:', error);
      return this.generateFallbackExplanation(detection, classification, flowAnalysis);
    }
  }

  /**
   * Analyse le pattern architectural avec l'IA
   */
  private async analyzePattern(detection: DetectionResult): Promise<PatternAnalysis> {
    const prompt = this.buildPrompt('pattern_analysis', {
      pattern: detection.pattern.name,
      description: detection.pattern.description,
      confidence: detection.confidence,
      layers: detection.pattern.layers.map(l => l.name),
      violations: detection.violations.slice(0, 10)
    });

    try {
      const response = await this.config.aiClient.generateJSON<{
        strengths: string[];
        weaknesses: string[];
        conformityScore: number;
        alternativePatterns: string[];
      }>(prompt);

      return {
        detectedPattern: detection.pattern.name,
        confidence: detection.confidence,
        strengths: response.strengths || [],
        weaknesses: response.weaknesses || [],
        conformityScore: response.conformityScore || detection.confidence,
        alternativePatterns: response.alternativePatterns || []
      };
    } catch {
      return {
        detectedPattern: detection.pattern.name,
        confidence: detection.confidence,
        strengths: ['Architecture détectée avec succès'],
        weaknesses: detection.violations.length > 0
          ? [`${detection.violations.length} violations détectées`]
          : [],
        conformityScore: detection.confidence,
        alternativePatterns: []
      };
    }
  }

  /**
   * Explique chaque couche architecturale
   */
  private async explainLayers(
    classification: ClassificationResult,
    detection: DetectionResult
  ): Promise<LayerExplanation[]> {
    const explanations: LayerExplanation[] = [];

    for (const layer of detection.pattern.layers) {
      const layerFiles = classification.byLayer.get(layer.name) || [];

      if (layerFiles.length === 0) continue;

      const prompt = this.buildPrompt('layer_explanation', {
        layerName: layer.name,
        description: layer.description,
        fileCount: layerFiles.length,
        sampleFiles: layerFiles.slice(0, 10).map(f => f.path),
        roles: [...new Set(layerFiles.map(f => f.role))]
      });

      try {
        const response = await this.config.aiClient.generateJSON<{
          purpose: string;
          responsibilities: string[];
          healthScore: number;
        }>(prompt);

        explanations.push({
          layerName: layer.name,
          purpose: response.purpose || layer.description,
          responsibilities: response.responsibilities || [],
          keyFiles: layerFiles.slice(0, 5).map(f => f.path),
          dependencies: layer.allowedDependencies,
          healthScore: response.healthScore || 75
        });
      } catch {
        explanations.push({
          layerName: layer.name,
          purpose: layer.description,
          responsibilities: [],
          keyFiles: layerFiles.slice(0, 5).map(f => f.path),
          dependencies: layer.allowedDependencies,
          healthScore: 75
        });
      }
    }

    return explanations;
  }

  /**
   * Explique les flux de données
   */
  private async explainFlows(flowAnalysis: FlowAnalysisResult): Promise<FlowExplanation[]> {
    const explanations: FlowExplanation[] = [];

    for (const flow of flowAnalysis.flows.slice(0, 10)) {
      const prompt = this.buildPrompt('flow_explanation', {
        flowName: flow.name,
        type: flow.type,
        steps: flow.steps.map(s => ({
          file: s.file,
          layer: s.layer,
          action: s.action
        })),
        direction: flow.direction
      });

      try {
        const response = await this.config.aiClient.generateJSON<{
          description: string;
          stepsExplained: string[];
          dataTransformations: string[];
          potentialIssues: string[];
        }>(prompt);

        explanations.push({
          flowName: flow.name,
          description: response.description || `Flux ${flow.type}`,
          steps: response.stepsExplained || flow.steps.map(s => s.action),
          dataTransformations: response.dataTransformations || [],
          potentialIssues: response.potentialIssues || []
        });
      } catch {
        explanations.push({
          flowName: flow.name,
          description: `Flux ${flow.type} avec ${flow.steps.length} étapes`,
          steps: flow.steps.map(s => `${s.layer}: ${s.action}`),
          dataTransformations: [],
          potentialIssues: []
        });
      }
    }

    return explanations;
  }

  /**
   * Génère des recommandations
   */
  private async generateRecommendations(
    detection: DetectionResult,
    classification: ClassificationResult,
    flowAnalysis: FlowAnalysisResult
  ): Promise<Recommendation[]> {
    const prompt = this.buildPrompt('recommendations', {
      pattern: detection.pattern.name,
      violations: detection.violations,
      unclassifiedCount: classification.unclassified.length,
      flowMetrics: flowAnalysis.metrics,
      stats: classification.stats
    });

    try {
      const response = await this.config.aiClient.generateJSON<{
        recommendations: Array<{
          type: string;
          priority: string;
          title: string;
          description: string;
          suggestedActions: string[];
        }>;
      }>(prompt);

      return (response.recommendations || []).map(r => ({
        type: r.type as Recommendation['type'],
        priority: r.priority as Recommendation['priority'],
        title: r.title,
        description: r.description,
        affectedFiles: [],
        suggestedActions: r.suggestedActions || []
      }));
    } catch {
      // Générer des recommandations basiques basées sur les violations
      const recommendations: Recommendation[] = [];

      if (detection.violations.length > 0) {
        recommendations.push({
          type: 'warning',
          priority: 'high',
          title: 'Violations architecturales détectées',
          description: `${detection.violations.length} violations des règles de dépendance ont été trouvées.`,
          affectedFiles: detection.violations.map(v => v.sourceFile),
          suggestedActions: ['Réviser les imports entre couches', 'Appliquer le principe d\'inversion de dépendances']
        });
      }

      if (classification.unclassified.length > 10) {
        recommendations.push({
          type: 'improvement',
          priority: 'medium',
          title: 'Fichiers non classifiés',
          description: `${classification.unclassified.length} fichiers n'ont pas pu être classifiés dans une couche.`,
          affectedFiles: classification.unclassified.slice(0, 5).map(f => f.path),
          suggestedActions: ['Réorganiser les fichiers selon la structure du pattern', 'Utiliser des conventions de nommage cohérentes']
        });
      }

      return recommendations;
    }
  }

  /**
   * Génère un résumé global
   */
  private async generateSummary(
    detection: DetectionResult,
    classification: ClassificationResult,
    flowAnalysis: FlowAnalysisResult,
    patternAnalysis: PatternAnalysis
  ): Promise<string> {
    const prompt = this.buildPrompt('summary', {
      pattern: detection.pattern.name,
      confidence: detection.confidence,
      totalFiles: classification.stats.totalFiles,
      classificationRate: classification.stats.classificationRate,
      layerDistribution: classification.stats.layerDistribution,
      flowCount: flowAnalysis.flows.length,
      violationCount: detection.violations.length,
      strengths: patternAnalysis.strengths,
      weaknesses: patternAnalysis.weaknesses
    });

    try {
      const response = await this.config.aiClient.generate(prompt);
      return response.trim();
    } catch {
      return this.generateFallbackSummary(detection, classification, flowAnalysis);
    }
  }

  /**
   * Évalue la qualité du code
   */
  private assessCodeQuality(
    detection: DetectionResult,
    classification: ClassificationResult,
    flowAnalysis: FlowAnalysisResult
  ): CodeQualityAssessment {
    // Séparation des concerns (basée sur le taux de classification)
    const separation = classification.stats.classificationRate;

    // Cohésion (basée sur la distribution par couche)
    const layerCounts = Object.values(classification.stats.layerDistribution);
    const avgLayerSize = layerCounts.reduce((a, b) => a + b, 0) / layerCounts.length;
    const variance = layerCounts.reduce((sum, c) => sum + Math.pow(c - avgLayerSize, 2), 0) / layerCounts.length;
    const cohesion = Math.max(0, 100 - (variance / avgLayerSize) * 10);

    // Couplage (basé sur les violations - moins de violations = meilleur)
    const coupling = Math.max(0, 100 - detection.violations.length * 5);

    // Testabilité (basée sur la présence de fichiers de test)
    const testFiles = classification.files.filter(f => f.role === 'test').length;
    const testRatio = testFiles / classification.stats.totalFiles;
    const testability = Math.min(100, testRatio * 500); // 20% de tests = 100%

    // Maintenabilité (moyenne des autres métriques)
    const maintainability = (separation + cohesion + coupling + testability) / 4;

    // Score global
    const overallScore = Math.round(
      (separation * 0.25) +
      (cohesion * 0.2) +
      (coupling * 0.25) +
      (testability * 0.15) +
      (maintainability * 0.15)
    );

    return {
      overallScore,
      separation: Math.round(separation),
      cohesion: Math.round(cohesion),
      coupling: Math.round(coupling),
      testability: Math.round(testability),
      maintainability: Math.round(maintainability)
    };
  }

  /**
   * Construit un prompt selon le type et les données
   */
  private buildPrompt(type: string, data: Record<string, unknown>): string {
    const lang = this.config.language === 'fr' ? 'français' : 'anglais';
    const detail = this.config.detailLevel;

    const prompts: Record<string, string> = {
      pattern_analysis: `Analyse ce pattern architectural et évalue sa qualité.

Pattern: ${data.pattern}
Description: ${data.description}
Confiance de détection: ${data.confidence}%
Couches: ${(data.layers as string[]).join(', ')}
Violations: ${JSON.stringify(data.violations)}

Réponds en ${lang} avec un JSON:
{
  "strengths": ["point fort 1", "point fort 2"],
  "weaknesses": ["faiblesse 1"],
  "conformityScore": number (0-100),
  "alternativePatterns": ["pattern alternatif possible"]
}`,

      layer_explanation: `Explique le rôle de cette couche architecturale.

Couche: ${data.layerName}
Description: ${data.description}
Nombre de fichiers: ${data.fileCount}
Fichiers exemples: ${(data.sampleFiles as string[]).join(', ')}
Rôles détectés: ${(data.roles as string[]).join(', ')}

Réponds en ${lang} avec un JSON ${detail === 'brief' ? 'bref' : 'détaillé'}:
{
  "purpose": "objectif principal",
  "responsibilities": ["responsabilité 1", "responsabilité 2"],
  "healthScore": number (0-100)
}`,

      flow_explanation: `Explique ce flux de données.

Nom: ${data.flowName}
Type: ${data.type}
Direction: ${data.direction}
Étapes: ${JSON.stringify(data.steps)}

Réponds en ${lang} avec un JSON:
{
  "description": "description du flux",
  "stepsExplained": ["étape 1 expliquée", "étape 2 expliquée"],
  "dataTransformations": ["transformation 1"],
  "potentialIssues": ["problème potentiel 1"]
}`,

      recommendations: `Génère des recommandations pour améliorer cette architecture.

Pattern: ${data.pattern}
Violations: ${JSON.stringify(data.violations)}
Fichiers non classifiés: ${data.unclassifiedCount}
Métriques flux: ${JSON.stringify(data.flowMetrics)}

Réponds en ${lang} avec un JSON:
{
  "recommendations": [
    {
      "type": "improvement|warning|best-practice|refactoring",
      "priority": "high|medium|low",
      "title": "titre",
      "description": "description",
      "suggestedActions": ["action 1"]
    }
  ]
}`,

      summary: `Génère un résumé de cette analyse architecturale.

Pattern: ${data.pattern} (confiance: ${data.confidence}%)
Fichiers: ${data.totalFiles} (${data.classificationRate}% classifiés)
Distribution: ${JSON.stringify(data.layerDistribution)}
Flux détectés: ${data.flowCount}
Violations: ${data.violationCount}
Points forts: ${(data.strengths as string[]).join(', ')}
Faiblesses: ${(data.weaknesses as string[]).join(', ')}

Génère un résumé en ${lang}, ${detail === 'brief' ? '2-3 phrases' : detail === 'detailed' ? '2-3 paragraphes' : '1 paragraphe'}.
Ne pas utiliser de JSON, juste du texte.`
    };

    return prompts[type] || '';
  }

  /**
   * Génère une explication de repli sans IA
   */
  private generateFallbackExplanation(
    detection: DetectionResult,
    classification: ClassificationResult,
    flowAnalysis: FlowAnalysisResult
  ): ArchitectureExplanation {
    return {
      summary: this.generateFallbackSummary(detection, classification, flowAnalysis),
      patternAnalysis: {
        detectedPattern: detection.pattern.name,
        confidence: detection.confidence,
        strengths: ['Pattern architectural identifié'],
        weaknesses: detection.violations.length > 0
          ? [`${detection.violations.length} violations détectées`]
          : [],
        conformityScore: detection.confidence,
        alternativePatterns: []
      },
      layerExplanations: detection.pattern.layers.map(layer => ({
        layerName: layer.name,
        purpose: layer.description,
        responsibilities: [],
        keyFiles: (classification.byLayer.get(layer.name) || []).slice(0, 3).map(f => f.path),
        dependencies: layer.allowedDependencies,
        healthScore: 70
      })),
      flowExplanations: flowAnalysis.flows.slice(0, 5).map(flow => ({
        flowName: flow.name,
        description: `Flux ${flow.type}`,
        steps: flow.steps.map(s => s.action),
        dataTransformations: [],
        potentialIssues: []
      })),
      recommendations: this.generateBasicRecommendations(detection, classification),
      codeQuality: this.assessCodeQuality(detection, classification, flowAnalysis)
    };
  }

  /**
   * Génère un résumé de repli
   */
  private generateFallbackSummary(
    detection: DetectionResult,
    classification: ClassificationResult,
    flowAnalysis: FlowAnalysisResult
  ): string {
    const lang = this.config.language;

    if (lang === 'fr') {
      return `Ce projet utilise une architecture **${detection.pattern.name}** ` +
        `(confiance: ${detection.confidence}%). ` +
        `Sur ${classification.stats.totalFiles} fichiers analysés, ` +
        `${classification.stats.classificationRate}% ont été classifiés dans une couche. ` +
        `${flowAnalysis.flows.length} flux de données ont été identifiés. ` +
        (detection.violations.length > 0
          ? `⚠️ ${detection.violations.length} violations architecturales ont été détectées.`
          : '✅ Aucune violation architecturale majeure détectée.');
    }

    return `This project uses a **${detection.pattern.name}** architecture ` +
      `(confidence: ${detection.confidence}%). ` +
      `Out of ${classification.stats.totalFiles} analyzed files, ` +
      `${classification.stats.classificationRate}% were classified into a layer. ` +
      `${flowAnalysis.flows.length} data flows were identified. ` +
      (detection.violations.length > 0
        ? `⚠️ ${detection.violations.length} architectural violations were detected.`
        : '✅ No major architectural violations detected.');
  }

  /**
   * Génère des recommandations basiques
   */
  private generateBasicRecommendations(
    detection: DetectionResult,
    classification: ClassificationResult
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (detection.violations.length > 0) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: 'Corriger les violations architecturales',
        description: `${detection.violations.length} dépendances non conformes au pattern ${detection.pattern.name}.`,
        affectedFiles: [...new Set(detection.violations.map(v => v.sourceFile))].slice(0, 5),
        suggestedActions: [
          'Réviser les imports entre couches',
          'Utiliser des interfaces/ports pour inverser les dépendances',
          'Déplacer les fichiers dans les bonnes couches'
        ]
      });
    }

    if (classification.stats.classificationRate < 70) {
      recommendations.push({
        type: 'improvement',
        priority: 'medium',
        title: 'Améliorer la structure du projet',
        description: `Seulement ${classification.stats.classificationRate}% des fichiers suivent les conventions.`,
        affectedFiles: classification.unclassified.slice(0, 5).map(f => f.path),
        suggestedActions: [
          'Utiliser des conventions de nommage cohérentes',
          'Organiser les fichiers selon les couches du pattern',
          'Documenter la structure du projet'
        ]
      });
    }

    return recommendations;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createArchitectureExplainer(
  aiClient: OllamaClient,
  options: Partial<Omit<ExplainerConfig, 'aiClient'>> = {}
): ArchitectureExplainer {
  return new ArchitectureExplainer({
    aiClient,
    language: options.language || 'fr',
    detailLevel: options.detailLevel || 'normal',
    includeCodeSnippets: options.includeCodeSnippets || false
  });
}

export default ArchitectureExplainer;
