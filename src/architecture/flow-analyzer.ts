// =============================================================================
// FLOW ANALYZER - Analyse des flux de données dans l'architecture
// =============================================================================

import {
  ArchitecturePattern,
  ArchitectureLayer,
  ArchitectureViolation,
  DetectionResult
} from './patterns';
import { ClassifiedFile, ClassificationResult } from './classifier';
import type { OllamaClient } from '../ai/ollama-client';

// =============================================================================
// TYPES
// =============================================================================

export interface DataFlow {
  id: string;
  name: string;
  description: string;
  type: FlowType;
  steps: FlowStep[];
  entryPoint: string;
  exitPoint: string;
  layers: string[];
  direction: 'inbound' | 'outbound' | 'internal';
}

export type FlowType =
  | 'request-response'   // API call → response
  | 'event-driven'       // Event → handlers
  | 'cqrs-command'       // Command → handler → aggregate
  | 'cqrs-query'         // Query → handler → read model
  | 'data-pipeline'      // Transform → process → store
  | 'messaging'          // Publish → consume
  | 'batch'              // Schedule → process → output
  | 'unknown';

export interface FlowStep {
  order: number;
  file: string;
  layer: string;
  role: string;
  action: string;
  inputType?: string;
  outputType?: string;
  nextSteps: string[];  // file paths des étapes suivantes
}

export interface LayerConnection {
  sourceLayer: string;
  targetLayer: string;
  connectionCount: number;
  files: Array<{ source: string; target: string }>;
  isAllowed: boolean;
  direction: 'down' | 'up' | 'lateral';
}

export interface FlowAnalysisResult {
  flows: DataFlow[];
  layerConnections: LayerConnection[];
  violations: ArchitectureViolation[];
  metrics: FlowMetrics;
  aiExplanation?: string;
}

export interface FlowMetrics {
  totalFlows: number;
  avgFlowLength: number;
  maxFlowLength: number;
  layerCoverage: number;  // % des couches utilisées
  violationCount: number;
  cyclicDependencies: number;
}

export interface FlowAnalyzerConfig {
  useAI: boolean;
  aiClient?: OllamaClient;
  detectCycles: boolean;
  maxFlowDepth: number;
}

// =============================================================================
// FLOW ANALYZER CLASS
// =============================================================================

export class FlowAnalyzer {
  private config: FlowAnalyzerConfig;
  private aiClient?: OllamaClient;

  constructor(config: Partial<FlowAnalyzerConfig> = {}) {
    this.config = {
      useAI: false,
      detectCycles: true,
      maxFlowDepth: 20,
      ...config
    };
    this.aiClient = config.aiClient;
  }

  /**
   * Analyse les flux de données dans l'architecture
   */
  async analyze(
    classification: ClassificationResult,
    detectionResult: DetectionResult,
    dependencies: Array<{ source: string; target: string; type: string }>
  ): Promise<FlowAnalysisResult> {
    const pattern = detectionResult.pattern;

    // Analyser les connexions entre couches
    const layerConnections = this.analyzeLayerConnections(
      classification,
      dependencies,
      pattern
    );

    // Détecter les flux de données
    const flows = this.detectFlows(classification, dependencies, pattern);

    // Détecter les violations
    const violations = this.detectViolations(layerConnections, pattern);

    // Calculer les métriques
    const metrics = this.calculateMetrics(flows, layerConnections, violations);

    // Améliorer avec l'IA si activé
    let aiExplanation: string | undefined;
    if (this.config.useAI && this.aiClient) {
      aiExplanation = await this.generateAIExplanation(
        flows,
        layerConnections,
        pattern,
        classification
      );
    }

    return {
      flows,
      layerConnections,
      violations,
      metrics,
      aiExplanation
    };
  }

  /**
   * Analyse les connexions entre les couches
   */
  private analyzeLayerConnections(
    classification: ClassificationResult,
    dependencies: Array<{ source: string; target: string; type: string }>,
    pattern: ArchitecturePattern
  ): LayerConnection[] {
    const connections = new Map<string, LayerConnection>();

    for (const dep of dependencies) {
      const sourceFile = classification.files.find(f => f.path === dep.source);
      const targetFile = classification.files.find(f => f.path === dep.target);

      if (!sourceFile?.layer || !targetFile?.layer) continue;

      const key = `${sourceFile.layerName}->${targetFile.layerName}`;

      if (!connections.has(key)) {
        const sourceLayer = pattern.layers.find(l => l.name === sourceFile.layerName);
        const targetLayer = pattern.layers.find(l => l.name === targetFile.layerName);

        const isAllowed = sourceLayer
          ? sourceLayer.allowedDependencies.includes(targetFile.layerName) ||
            sourceFile.layerName === targetFile.layerName
          : true;

        const direction = this.getConnectionDirection(
          sourceFile.layerName,
          targetFile.layerName,
          pattern
        );

        connections.set(key, {
          sourceLayer: sourceFile.layerName,
          targetLayer: targetFile.layerName,
          connectionCount: 0,
          files: [],
          isAllowed,
          direction
        });
      }

      const conn = connections.get(key)!;
      conn.connectionCount++;
      conn.files.push({ source: dep.source, target: dep.target });
    }

    return Array.from(connections.values());
  }

  /**
   * Détermine la direction d'une connexion
   */
  private getConnectionDirection(
    sourceLayerName: string,
    targetLayerName: string,
    pattern: ArchitecturePattern
  ): 'down' | 'up' | 'lateral' {
    const sourceLayer = pattern.layers.find(l => l.name === sourceLayerName);
    const targetLayer = pattern.layers.find(l => l.name === targetLayerName);

    if (!sourceLayer || !targetLayer) return 'lateral';

    if (sourceLayer.level < targetLayer.level) return 'down';
    if (sourceLayer.level > targetLayer.level) return 'up';
    return 'lateral';
  }

  /**
   * Détecte les flux de données principaux
   */
  private detectFlows(
    classification: ClassificationResult,
    dependencies: Array<{ source: string; target: string; type: string }>,
    pattern: ArchitecturePattern
  ): DataFlow[] {
    const flows: DataFlow[] = [];

    // Trouver les points d'entrée (controllers, handlers, adapters-in)
    const entryPoints = classification.files.filter(f =>
      ['controller', 'handler', 'adapter'].includes(f.role) ||
      f.layerName === 'presentation' ||
      f.layerName === 'adapters-in' ||
      f.layerName === 'interface'
    );

    // Pour chaque point d'entrée, tracer le flux
    for (const entry of entryPoints.slice(0, 20)) { // Limiter à 20 flux
      const flow = this.traceFlow(entry, classification, dependencies, pattern);
      if (flow && flow.steps.length > 1) {
        flows.push(flow);
      }
    }

    return flows;
  }

  /**
   * Trace un flux à partir d'un point d'entrée
   */
  private traceFlow(
    entry: ClassifiedFile,
    classification: ClassificationResult,
    dependencies: Array<{ source: string; target: string; type: string }>,
    pattern: ArchitecturePattern
  ): DataFlow | null {
    const steps: FlowStep[] = [];
    const visited = new Set<string>();
    const layers = new Set<string>();

    const trace = (file: ClassifiedFile, order: number): void => {
      if (visited.has(file.path) || order > this.config.maxFlowDepth) return;
      visited.add(file.path);

      const outgoing = dependencies
        .filter(d => d.source === file.path)
        .map(d => classification.files.find(f => f.path === d.target))
        .filter((f): f is ClassifiedFile => f !== undefined);

      steps.push({
        order,
        file: file.path,
        layer: file.layerName,
        role: file.role,
        action: this.inferAction(file),
        nextSteps: outgoing.map(f => f.path)
      });

      layers.add(file.layerName);

      // Continuer vers les dépendances
      for (const next of outgoing) {
        if (!visited.has(next.path)) {
          trace(next, order + 1);
        }
      }
    };

    trace(entry, 0);

    if (steps.length < 2) return null;

    const flowType = this.inferFlowType(steps, pattern);

    return {
      id: `flow-${entry.path.replace(/[^a-zA-Z0-9]/g, '-')}`,
      name: this.generateFlowName(entry),
      description: `Flux démarrant de ${entry.path}`,
      type: flowType,
      steps,
      entryPoint: entry.path,
      exitPoint: steps[steps.length - 1].file,
      layers: Array.from(layers),
      direction: this.inferFlowDirection(steps, pattern)
    };
  }

  /**
   * Infère l'action effectuée par un fichier
   */
  private inferAction(file: ClassifiedFile): string {
    const actions: Record<string, string> = {
      controller: 'Reçoit la requête',
      handler: 'Traite l\'événement',
      service: 'Exécute la logique métier',
      usecase: 'Orchestre le cas d\'utilisation',
      repository: 'Accède aux données',
      adapter: 'Adapte l\'interface',
      entity: 'Représente l\'entité',
      mapper: 'Transforme les données',
      validator: 'Valide les données',
      middleware: 'Intercepte et transforme',
      factory: 'Crée l\'instance',
      event: 'Publie l\'événement',
      command: 'Exécute la commande',
      query: 'Requête les données'
    };
    return actions[file.role] || 'Traite les données';
  }

  /**
   * Infère le type de flux
   */
  private inferFlowType(steps: FlowStep[], pattern: ArchitecturePattern): FlowType {
    const roles = steps.map(s => s.role);

    if (roles.includes('command') || roles.includes('handler')) {
      if (roles.includes('query')) return 'cqrs-query';
      if (roles.includes('command')) return 'cqrs-command';
    }

    if (roles.includes('event')) return 'event-driven';

    if (roles.includes('controller') || roles.includes('handler')) {
      return 'request-response';
    }

    return 'unknown';
  }

  /**
   * Infère la direction du flux
   */
  private inferFlowDirection(
    steps: FlowStep[],
    pattern: ArchitecturePattern
  ): 'inbound' | 'outbound' | 'internal' {
    if (steps.length === 0) return 'internal';

    const firstLayer = pattern.layers.find(l => l.name === steps[0].layer);
    const lastLayer = pattern.layers.find(l => l.name === steps[steps.length - 1].layer);

    if (!firstLayer || !lastLayer) return 'internal';

    // Si ça commence par une couche externe et finit par le domaine = inbound
    if (firstLayer.level === 0 && lastLayer.level > 0) return 'inbound';

    // Si ça commence par le domaine et finit par une couche externe = outbound
    if (firstLayer.level > 0 && lastLayer.level === 0) return 'outbound';

    return 'internal';
  }

  /**
   * Génère un nom pour le flux
   */
  private generateFlowName(entry: ClassifiedFile): string {
    const fileName = entry.path.split(/[/\\]/).pop() || entry.path;
    const baseName = fileName.replace(/\.(ts|js|tsx|jsx)$/, '');
    return `${entry.role}: ${baseName}`;
  }

  /**
   * Détecte les violations architecturales
   */
  private detectViolations(
    connections: LayerConnection[],
    pattern: ArchitecturePattern
  ): ArchitectureViolation[] {
    const violations: ArchitectureViolation[] = [];

    for (const conn of connections) {
      if (!conn.isAllowed) {
        violations.push({
          type: 'dependency',
          severity: pattern.strictness === 'strict' ? 'error' : 'warning',
          sourceFile: conn.files[0]?.source || 'unknown',
          targetFile: conn.files[0]?.target || 'unknown',
          sourceLayer: conn.sourceLayer,
          targetLayer: conn.targetLayer,
          message: `${conn.sourceLayer} ne devrait pas dépendre de ${conn.targetLayer} (${conn.connectionCount} occurrences)`
        });
      }

      // Détecter les dépendances ascendantes (layer level bas → haut)
      if (conn.direction === 'up' && pattern.flowDirection === 'top-down') {
        violations.push({
          type: 'dependency',
          severity: 'warning',
          sourceFile: conn.files[0]?.source || 'unknown',
          targetFile: conn.files[0]?.target || 'unknown',
          sourceLayer: conn.sourceLayer,
          targetLayer: conn.targetLayer,
          message: `Dépendance ascendante détectée: ${conn.sourceLayer} → ${conn.targetLayer}`
        });
      }
    }

    return violations;
  }

  /**
   * Calcule les métriques de flux
   */
  private calculateMetrics(
    flows: DataFlow[],
    connections: LayerConnection[],
    violations: ArchitectureViolation[]
  ): FlowMetrics {
    const flowLengths = flows.map(f => f.steps.length);
    const allLayers = new Set(flows.flatMap(f => f.layers));

    // Détecter les cycles
    let cyclicDependencies = 0;
    if (this.config.detectCycles) {
      cyclicDependencies = this.detectCycles(connections);
    }

    return {
      totalFlows: flows.length,
      avgFlowLength: flowLengths.length > 0
        ? Math.round(flowLengths.reduce((a, b) => a + b, 0) / flowLengths.length * 10) / 10
        : 0,
      maxFlowLength: flowLengths.length > 0 ? Math.max(...flowLengths) : 0,
      layerCoverage: allLayers.size,
      violationCount: violations.length,
      cyclicDependencies
    };
  }

  /**
   * Détecte les dépendances cycliques
   */
  private detectCycles(connections: LayerConnection[]): number {
    const graph = new Map<string, Set<string>>();

    // Construire le graphe
    for (const conn of connections) {
      if (!graph.has(conn.sourceLayer)) {
        graph.set(conn.sourceLayer, new Set());
      }
      graph.get(conn.sourceLayer)!.add(conn.targetLayer);
    }

    // Détecter les cycles avec DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();
    let cycles = 0;

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) cycles++;
      }
    }

    return cycles;
  }

  /**
   * Génère une explication IA des flux
   */
  private async generateAIExplanation(
    flows: DataFlow[],
    connections: LayerConnection[],
    pattern: ArchitecturePattern,
    classification: ClassificationResult
  ): Promise<string> {
    if (!this.aiClient) return '';

    const summary = {
      architecture: pattern.name,
      totalFlows: flows.length,
      mainFlows: flows.slice(0, 5).map(f => ({
        name: f.name,
        type: f.type,
        layers: f.layers,
        stepsCount: f.steps.length
      })),
      layerConnections: connections.slice(0, 10).map(c => ({
        from: c.sourceLayer,
        to: c.targetLayer,
        count: c.connectionCount,
        allowed: c.isAllowed
      })),
      stats: classification.stats
    };

    const prompt = `Analyse cette architecture ${pattern.name} et explique les flux de données:

${JSON.stringify(summary, null, 2)}

Fournis une explication structurée:
1. Vue d'ensemble de l'architecture
2. Principaux flux de données
3. Points forts de l'architecture
4. Problèmes potentiels ou améliorations suggérées
5. Conformité avec les principes ${pattern.name}

Réponds en français, de manière concise et technique.`;

    try {
      return await this.aiClient.generate(prompt);
    } catch (error) {
      // Erreur silencieuse si le modèle n'est pas trouvé
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes('not found')) {
        console.warn(`  ⚠ Explication IA non disponible: ${msg.substring(0, 60)}`);
      }
      return '';
    }
  }
}

// =============================================================================
// FLOW VISUALIZATION HELPERS
// =============================================================================

export interface FlowVisualizationData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  label: string;
  layer: string;
  role: string;
  level: number;
  color: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  style: 'solid' | 'dashed';
  color: string;
}

/**
 * Convertit les flux en données de visualisation
 */
export function flowsToVisualization(
  flows: DataFlow[],
  pattern: ArchitecturePattern
): FlowVisualizationData {
  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];

  for (const flow of flows) {
    for (const step of flow.steps) {
      if (!nodes.has(step.file)) {
        const layer = pattern.layers.find(l => l.name === step.layer);
        nodes.set(step.file, {
          id: step.file,
          label: step.file.split(/[/\\]/).pop() || step.file,
          layer: step.layer,
          role: step.role,
          level: layer?.level || 0,
          color: layer?.color || '#888888'
        });
      }

      for (const nextFile of step.nextSteps) {
        const edgeId = `${step.file}->${nextFile}`;
        if (!edges.find(e => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: step.file,
            target: nextFile,
            style: 'solid',
            color: '#00ccff'
          });
        }
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges
  };
}

export default FlowAnalyzer;
