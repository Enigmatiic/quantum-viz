// =============================================================================
// ARCHITECTURE CLASSIFIER - Classification des fichiers par couche
// =============================================================================

import {
  ArchitecturePattern,
  ArchitectureLayer,
  DetectionResult
} from './patterns';
import type { OllamaClient } from '../ai/ollama-client';

// =============================================================================
// TYPES
// =============================================================================

export interface ClassifiedFile {
  path: string;
  layer: ArchitectureLayer | null;
  layerName: string;
  confidence: number;
  role: FileRole;
  aiClassification?: AIClassification;
}

export interface AIClassification {
  role: string;
  description: string;
  responsibilities: string[];
  dependencies: string[];
}

export type FileRole =
  | 'controller'
  | 'service'
  | 'repository'
  | 'entity'
  | 'dto'
  | 'mapper'
  | 'validator'
  | 'middleware'
  | 'handler'
  | 'usecase'
  | 'aggregate'
  | 'value-object'
  | 'factory'
  | 'event'
  | 'command'
  | 'query'
  | 'port'
  | 'adapter'
  | 'config'
  | 'util'
  | 'helper'
  | 'type'
  | 'constant'
  | 'test'
  | 'view'
  | 'component'
  | 'store'
  | 'hook'
  | 'unknown';

export interface ClassificationResult {
  files: ClassifiedFile[];
  byLayer: Map<string, ClassifiedFile[]>;
  byRole: Map<FileRole, ClassifiedFile[]>;
  unclassified: ClassifiedFile[];
  stats: ClassificationStats;
}

export interface ClassificationStats {
  totalFiles: number;
  classifiedFiles: number;
  unclassifiedFiles: number;
  classificationRate: number;
  layerDistribution: Record<string, number>;
  roleDistribution: Record<string, number>;
}

export interface ClassifierConfig {
  useAI: boolean;
  aiClient?: OllamaClient;
  aiBatchSize: number;
  includeFileContent: boolean;
}

// =============================================================================
// ROLE DETECTION PATTERNS
// =============================================================================

const ROLE_PATTERNS: Array<{ role: FileRole; patterns: RegExp[] }> = [
  {
    role: 'controller',
    patterns: [
      /\.controller\.(ts|js)$/i,
      /controllers?\//i,
      /Controller\.(ts|js)$/
    ]
  },
  {
    role: 'service',
    patterns: [
      /\.service\.(ts|js)$/i,
      /services?\//i,
      /Service\.(ts|js)$/
    ]
  },
  {
    role: 'repository',
    patterns: [
      /\.repository\.(ts|js)$/i,
      /repositories?\//i,
      /Repository\.(ts|js)$/,
      /\.repo\.(ts|js)$/i
    ]
  },
  {
    role: 'entity',
    patterns: [
      /\.entity\.(ts|js)$/i,
      /entities?\//i,
      /Entity\.(ts|js)$/
    ]
  },
  {
    role: 'dto',
    patterns: [
      /\.dto\.(ts|js)$/i,
      /dtos?\//i,
      /DTO\.(ts|js)$/,
      /\.request\.(ts|js)$/i,
      /\.response\.(ts|js)$/i
    ]
  },
  {
    role: 'mapper',
    patterns: [
      /\.mapper\.(ts|js)$/i,
      /mappers?\//i,
      /Mapper\.(ts|js)$/
    ]
  },
  {
    role: 'validator',
    patterns: [
      /\.validator\.(ts|js)$/i,
      /validators?\//i,
      /\.schema\.(ts|js)$/i,
      /schemas?\//i
    ]
  },
  {
    role: 'middleware',
    patterns: [
      /\.middleware\.(ts|js)$/i,
      /middlewares?\//i,
      /Middleware\.(ts|js)$/
    ]
  },
  {
    role: 'handler',
    patterns: [
      /\.handler\.(ts|js)$/i,
      /handlers?\//i,
      /Handler\.(ts|js)$/
    ]
  },
  {
    role: 'usecase',
    patterns: [
      /\.usecase\.(ts|js)$/i,
      /use-?cases?\//i,
      /UseCase\.(ts|js)$/,
      /\.interactor\.(ts|js)$/i
    ]
  },
  {
    role: 'aggregate',
    patterns: [
      /\.aggregate\.(ts|js)$/i,
      /aggregates?\//i,
      /Aggregate\.(ts|js)$/
    ]
  },
  {
    role: 'value-object',
    patterns: [
      /\.value-?object\.(ts|js)$/i,
      /value-?objects?\//i,
      /\.vo\.(ts|js)$/i
    ]
  },
  {
    role: 'factory',
    patterns: [
      /\.factory\.(ts|js)$/i,
      /factories?\//i,
      /Factory\.(ts|js)$/
    ]
  },
  {
    role: 'event',
    patterns: [
      /\.event\.(ts|js)$/i,
      /events?\//i,
      /Event\.(ts|js)$/
    ]
  },
  {
    role: 'command',
    patterns: [
      /\.command\.(ts|js)$/i,
      /commands?\//i,
      /Command\.(ts|js)$/
    ]
  },
  {
    role: 'query',
    patterns: [
      /\.query\.(ts|js)$/i,
      /queries\//i,
      /Query\.(ts|js)$/
    ]
  },
  {
    role: 'port',
    patterns: [
      /\.port\.(ts|js)$/i,
      /ports?\//i,
      /Port\.(ts|js)$/
    ]
  },
  {
    role: 'adapter',
    patterns: [
      /\.adapter\.(ts|js)$/i,
      /adapters?\//i,
      /Adapter\.(ts|js)$/
    ]
  },
  {
    role: 'config',
    patterns: [
      /\.config\.(ts|js)$/i,
      /config\//i,
      /configuration\//i,
      /settings\.(ts|js)$/i
    ]
  },
  {
    role: 'util',
    patterns: [
      /\.util\.(ts|js)$/i,
      /utils?\//i,
      /utilities?\//i
    ]
  },
  {
    role: 'helper',
    patterns: [
      /\.helper\.(ts|js)$/i,
      /helpers?\//i
    ]
  },
  {
    role: 'type',
    patterns: [
      /\.types?\.(ts|js)$/i,
      /types?\//i,
      /\.interface\.(ts|js)$/i,
      /interfaces?\//i,
      /\.d\.ts$/
    ]
  },
  {
    role: 'constant',
    patterns: [
      /\.constants?\.(ts|js)$/i,
      /constants?\//i,
      /\.enum\.(ts|js)$/i
    ]
  },
  {
    role: 'test',
    patterns: [
      /\.test\.(ts|js|tsx|jsx)$/i,
      /\.spec\.(ts|js|tsx|jsx)$/i,
      /__tests__\//i,
      /tests?\//i
    ]
  },
  {
    role: 'view',
    patterns: [
      /\.view\.(ts|js|tsx|jsx)$/i,
      /views?\//i,
      /pages?\//i,
      /screens?\//i
    ]
  },
  {
    role: 'component',
    patterns: [
      /\.component\.(ts|js|tsx|jsx)$/i,
      /components?\//i
    ]
  },
  {
    role: 'store',
    patterns: [
      /\.store\.(ts|js)$/i,
      /stores?\//i,
      /\.state\.(ts|js)$/i
    ]
  },
  {
    role: 'hook',
    patterns: [
      /\.hook\.(ts|js)$/i,
      /hooks?\//i,
      /^use[A-Z]/
    ]
  }
];

// =============================================================================
// CLASSIFIER CLASS
// =============================================================================

export class ArchitectureClassifier {
  private config: ClassifierConfig;
  private aiClient?: OllamaClient;

  constructor(config: Partial<ClassifierConfig> = {}) {
    this.config = {
      useAI: false,
      aiBatchSize: 10,
      includeFileContent: false,
      ...config
    };
    this.aiClient = config.aiClient;
  }

  /**
   * Classifie tous les fichiers selon le pattern détecté
   */
  async classify(
    files: Array<{ path: string; content?: string; imports?: string[]; exports?: string[] }>,
    detectionResult: DetectionResult
  ): Promise<ClassificationResult> {
    const pattern = detectionResult.pattern;
    const classifiedFiles: ClassifiedFile[] = [];

    // Classifier chaque fichier
    for (const file of files) {
      const classified = this.classifyFile(file, pattern);
      classifiedFiles.push(classified);
    }

    // Améliorer avec l'IA si activé
    if (this.config.useAI && this.aiClient) {
      await this.enhanceWithAI(classifiedFiles, files, pattern);
    }

    // Organiser par couche et par rôle
    const byLayer = new Map<string, ClassifiedFile[]>();
    const byRole = new Map<FileRole, ClassifiedFile[]>();
    const unclassified: ClassifiedFile[] = [];

    for (const cf of classifiedFiles) {
      // Par couche
      const layerName = cf.layerName || 'unclassified';
      if (!byLayer.has(layerName)) {
        byLayer.set(layerName, []);
      }
      byLayer.get(layerName)!.push(cf);

      // Par rôle
      if (!byRole.has(cf.role)) {
        byRole.set(cf.role, []);
      }
      byRole.get(cf.role)!.push(cf);

      // Non classifié
      if (!cf.layer || cf.role === 'unknown') {
        unclassified.push(cf);
      }
    }

    // Statistiques
    const stats = this.calculateStats(classifiedFiles, byLayer, byRole);

    return {
      files: classifiedFiles,
      byLayer,
      byRole,
      unclassified,
      stats
    };
  }

  /**
   * Classifie un fichier individuel
   */
  private classifyFile(
    file: { path: string; imports?: string[]; exports?: string[] },
    pattern: ArchitecturePattern
  ): ClassifiedFile {
    // Trouver la couche
    let matchedLayer: ArchitectureLayer | null = null;
    let layerConfidence = 0;

    for (const layer of pattern.layers) {
      const confidence = this.calculateLayerConfidence(file.path, layer);
      if (confidence > layerConfidence) {
        matchedLayer = layer;
        layerConfidence = confidence;
      }
    }

    // Trouver le rôle
    const role = this.detectRole(file.path);

    return {
      path: file.path,
      layer: matchedLayer,
      layerName: matchedLayer?.name || 'unknown',
      confidence: layerConfidence,
      role
    };
  }

  /**
   * Calcule la confiance qu'un fichier appartient à une couche
   */
  private calculateLayerConfidence(filePath: string, layer: ArchitectureLayer): number {
    let score = 0;

    // Vérifier les alias
    for (const alias of layer.aliases) {
      const aliasPattern = new RegExp(`[/\\\\]${alias}[/\\\\]`, 'i');
      if (aliasPattern.test(filePath)) {
        score += 50;
        break;
      }
    }

    // Vérifier les patterns
    for (const pattern of layer.patterns) {
      if (pattern.test(filePath)) {
        score += 30;
        break;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Détecte le rôle d'un fichier
   */
  private detectRole(filePath: string): FileRole {
    for (const { role, patterns } of ROLE_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(filePath)) {
          return role;
        }
      }
    }
    return 'unknown';
  }

  /**
   * Améliore la classification avec l'IA
   */
  private async enhanceWithAI(
    classifiedFiles: ClassifiedFile[],
    originalFiles: Array<{ path: string; content?: string; imports?: string[]; exports?: string[] }>,
    pattern: ArchitecturePattern
  ): Promise<void> {
    if (!this.aiClient) return;

    // Traiter par batch les fichiers non classifiés ou incertains
    const uncertainFiles = classifiedFiles.filter(
      cf => cf.role === 'unknown' || cf.confidence < 50
    );

    for (let i = 0; i < uncertainFiles.length; i += this.config.aiBatchSize) {
      const batch = uncertainFiles.slice(i, i + this.config.aiBatchSize);
      await this.classifyBatchWithAI(batch, originalFiles, pattern);
    }
  }

  /**
   * Classifie un batch de fichiers avec l'IA
   */
  private async classifyBatchWithAI(
    batch: ClassifiedFile[],
    originalFiles: Array<{ path: string; content?: string; imports?: string[]; exports?: string[] }>,
    pattern: ArchitecturePattern
  ): Promise<void> {
    if (!this.aiClient) return;

    const fileInfos = batch.map(cf => {
      const original = originalFiles.find(f => f.path === cf.path);
      return {
        path: cf.path,
        imports: original?.imports || [],
        exports: original?.exports || [],
        content: this.config.includeFileContent
          ? original?.content?.slice(0, 500)
          : undefined
      };
    });

    const prompt = `Classifie ces fichiers selon l'architecture ${pattern.name}.

Couches disponibles: ${pattern.layers.map(l => l.name).join(', ')}

Fichiers à classifier:
${JSON.stringify(fileInfos, null, 2)}

Réponds en JSON avec le format:
{
  "classifications": [
    {
      "path": "chemin/fichier",
      "layer": "nom_couche",
      "role": "role (controller, service, repository, entity, etc.)",
      "description": "description courte du rôle",
      "responsibilities": ["responsabilité 1", "responsabilité 2"],
      "confidence": number (0-100)
    }
  ]
}`;

    try {
      const response = await this.aiClient.generate(prompt);
      const result = JSON.parse(response);

      // Appliquer les classifications IA
      for (const aiClass of result.classifications || []) {
        const file = batch.find(cf => cf.path === aiClass.path);
        if (file) {
          // Trouver la couche correspondante
          const layer = pattern.layers.find(l => l.name === aiClass.layer);
          if (layer) {
            file.layer = layer;
            file.layerName = layer.name;
          }

          // Mettre à jour le rôle si c'était unknown
          if (file.role === 'unknown' && aiClass.role) {
            file.role = aiClass.role as FileRole;
          }

          // Ajouter la classification IA
          file.aiClassification = {
            role: aiClass.role,
            description: aiClass.description,
            responsibilities: aiClass.responsibilities || [],
            dependencies: []
          };

          // Ajuster la confiance
          file.confidence = Math.round(
            (file.confidence * 0.4) + (aiClass.confidence * 0.6)
          );
        }
      }
    } catch (error) {
      console.warn('AI classification failed for batch:', error);
    }
  }

  /**
   * Calcule les statistiques de classification
   */
  private calculateStats(
    files: ClassifiedFile[],
    byLayer: Map<string, ClassifiedFile[]>,
    byRole: Map<FileRole, ClassifiedFile[]>
  ): ClassificationStats {
    const classifiedFiles = files.filter(f => f.layer && f.role !== 'unknown');

    const layerDistribution: Record<string, number> = {};
    byLayer.forEach((files, layer) => {
      layerDistribution[layer] = files.length;
    });

    const roleDistribution: Record<string, number> = {};
    byRole.forEach((files, role) => {
      roleDistribution[role] = files.length;
    });

    return {
      totalFiles: files.length,
      classifiedFiles: classifiedFiles.length,
      unclassifiedFiles: files.length - classifiedFiles.length,
      classificationRate: Math.round((classifiedFiles.length / files.length) * 100),
      layerDistribution,
      roleDistribution
    };
  }
}

// =============================================================================
// ROLE HELPERS
// =============================================================================

export const ROLE_COLORS: Record<FileRole, string> = {
  controller: '#00ff88',
  service: '#00ccff',
  repository: '#ff6600',
  entity: '#ffcc00',
  dto: '#ff00ff',
  mapper: '#888888',
  validator: '#ff4444',
  middleware: '#44ff44',
  handler: '#4444ff',
  usecase: '#00ffff',
  aggregate: '#ff8800',
  'value-object': '#ffaa00',
  factory: '#aa00ff',
  event: '#ff0088',
  command: '#0088ff',
  query: '#88ff00',
  port: '#ff00aa',
  adapter: '#aa00aa',
  config: '#666666',
  util: '#999999',
  helper: '#aaaaaa',
  type: '#cccccc',
  constant: '#bbbbbb',
  test: '#44aa44',
  view: '#00ff00',
  component: '#00dd00',
  store: '#dd00dd',
  hook: '#00dddd',
  unknown: '#444444'
};

export const ROLE_ICONS: Record<FileRole, string> = {
  controller: '🎮',
  service: '⚙️',
  repository: '💾',
  entity: '📦',
  dto: '📋',
  mapper: '🔄',
  validator: '✅',
  middleware: '🔗',
  handler: '📥',
  usecase: '🎯',
  aggregate: '🏛️',
  'value-object': '💎',
  factory: '🏭',
  event: '📡',
  command: '▶️',
  query: '🔍',
  port: '🚪',
  adapter: '🔌',
  config: '⚙️',
  util: '🔧',
  helper: '🛠️',
  type: '📝',
  constant: '📌',
  test: '🧪',
  view: '👁️',
  component: '🧩',
  store: '🗄️',
  hook: '🪝',
  unknown: '❓'
};

export default ArchitectureClassifier;
