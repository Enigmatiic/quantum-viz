// =============================================================================
// QUANTUM VIZ CONFIGURATION - Configuration globale du projet
// =============================================================================

import type { OllamaConfig } from './src/ai/ollama-client';

// =============================================================================
// TYPES DE CONFIGURATION
// =============================================================================

export interface QuantumVizConfig {
  // Configuration IA
  ai: AIConfig;

  // Configuration de l'analyse
  analysis: AnalysisConfig;

  // Configuration de l'architecture
  architecture: ArchitectureConfig;

  // Configuration de la visualisation
  visualization: VisualizationConfig;

  // Configuration de sortie
  output: OutputConfig;
}

export interface AIConfig {
  enabled: boolean;
  provider: 'ollama' | 'openai' | 'anthropic' | 'local';
  ollama: Partial<OllamaConfig>;
  openai?: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  anthropic?: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  // Pour l'analyse de code
  useForClassification: boolean;
  useForFlowAnalysis: boolean;
  useForExplanation: boolean;
}

export interface AnalysisConfig {
  // Fichiers à inclure/exclure
  include: string[];
  exclude: string[];

  // Profondeur d'analyse
  maxDepth: number;

  // Analyse des dépendances
  analyzeDependencies: boolean;
  analyzeImports: boolean;
  analyzeExports: boolean;

  // Analyse du code
  analyzeComplexity: boolean;
  analyzeDeadCode: boolean;
  analyzeDuplication: boolean;

  // Langages supportés
  languages: string[];
}

export interface ArchitectureConfig {
  // Détection automatique
  autoDetect: boolean;

  // Pattern forcé (si autoDetect = false)
  forcedPattern?: string;

  // Seuil de confiance minimum
  minConfidence: number;

  // Détection des violations
  detectViolations: boolean;
  strictMode: boolean;

  // Analyse des flux
  analyzeFlows: boolean;
  maxFlowDepth: number;
}

export interface VisualizationConfig {
  // Type de sortie
  type: '2d' | '3d' | 'both';

  // Configuration 3D
  three: {
    enableBloom: boolean;
    bloomIntensity: number;
    backgroundColor: string;
    nodeScale: number;
    edgeOpacity: number;
    enablePhysics: boolean;
  };

  // Configuration 2D
  graph: {
    layout: 'force' | 'hierarchical' | 'radial';
    nodeSpacing: number;
    animate: boolean;
  };

  // Thème
  theme: 'dark' | 'light' | 'auto';
}

export interface OutputConfig {
  // Répertoire de sortie
  outputDir: string;

  // Formats de sortie
  formats: Array<'html' | 'json' | 'md' | 'svg'>;

  // Inclure dans le rapport
  includeStats: boolean;
  includeViolations: boolean;
  includeRecommendations: boolean;
  includeFlowDiagrams: boolean;

  // Nom des fichiers
  filePrefix: string;
}

// =============================================================================
// CONFIGURATION PAR DÉFAUT
// =============================================================================

export const DEFAULT_CONFIG: QuantumVizConfig = {
  ai: {
    enabled: false,
    provider: 'ollama',
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2',
      temperature: 0.7,
      maxTokens: 4096,
      timeout: 120000
    },
    useForClassification: true,
    useForFlowAnalysis: true,
    useForExplanation: true
  },

  analysis: {
    include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go', '**/*.rs'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**'
    ],
    maxDepth: 10,
    analyzeDependencies: true,
    analyzeImports: true,
    analyzeExports: true,
    analyzeComplexity: true,
    analyzeDeadCode: true,
    analyzeDuplication: false,
    languages: ['typescript', 'javascript', 'python', 'go', 'rust']
  },

  architecture: {
    autoDetect: true,
    minConfidence: 30,
    detectViolations: true,
    strictMode: false,
    analyzeFlows: true,
    maxFlowDepth: 20
  },

  visualization: {
    type: '3d',
    three: {
      enableBloom: true,
      bloomIntensity: 0.4,
      backgroundColor: '#0a0a1a',
      nodeScale: 1.0,
      edgeOpacity: 0.6,
      enablePhysics: true
    },
    graph: {
      layout: 'force',
      nodeSpacing: 50,
      animate: true
    },
    theme: 'dark'
  },

  output: {
    outputDir: './quantum-viz-output',
    formats: ['html', 'json'],
    includeStats: true,
    includeViolations: true,
    includeRecommendations: true,
    includeFlowDiagrams: true,
    filePrefix: 'analysis'
  }
};

// =============================================================================
// CHARGEMENT DE LA CONFIGURATION
// =============================================================================

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Charge la configuration depuis un fichier
 */
export function loadConfig(configPath?: string): QuantumVizConfig {
  const paths = configPath
    ? [configPath]
    : [
        'quantum-viz.config.json',
        'quantum-viz.config.js',
        '.quantum-viz.json',
        '.quantumvizrc'
      ];

  for (const path of paths) {
    const fullPath = join(process.cwd(), path);
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const userConfig = JSON.parse(content);
        return mergeConfig(DEFAULT_CONFIG, userConfig);
      } catch (error) {
        console.warn(`Failed to load config from ${path}:`, error);
      }
    }
  }

  return DEFAULT_CONFIG;
}

/**
 * Fusionne la configuration utilisateur avec les valeurs par défaut
 */
export function mergeConfig(
  defaultConfig: QuantumVizConfig,
  userConfig: Partial<QuantumVizConfig>
): QuantumVizConfig {
  return {
    ai: { ...defaultConfig.ai, ...userConfig.ai },
    analysis: { ...defaultConfig.analysis, ...userConfig.analysis },
    architecture: { ...defaultConfig.architecture, ...userConfig.architecture },
    visualization: {
      ...defaultConfig.visualization,
      ...userConfig.visualization,
      three: { ...defaultConfig.visualization.three, ...userConfig.visualization?.three },
      graph: { ...defaultConfig.visualization.graph, ...userConfig.visualization?.graph }
    },
    output: { ...defaultConfig.output, ...userConfig.output }
  };
}

/**
 * Crée une configuration pour la ligne de commande
 */
export function createConfigFromArgs(args: {
  ai?: boolean;
  model?: string;
  arch?: boolean;
  explain?: boolean;
  output?: string;
  format?: string;
  '3d'?: boolean;
}): Partial<QuantumVizConfig> {
  const config: Partial<QuantumVizConfig> = {};

  if (args.ai !== undefined) {
    config.ai = {
      ...DEFAULT_CONFIG.ai,
      enabled: args.ai,
      useForExplanation: args.explain || false
    };
  }

  if (args.model) {
    config.ai = {
      ...DEFAULT_CONFIG.ai,
      ...config.ai,
      enabled: true,
      ollama: {
        ...DEFAULT_CONFIG.ai.ollama,
        model: args.model
      }
    };
  }

  if (args.arch !== undefined) {
    config.architecture = {
      ...DEFAULT_CONFIG.architecture,
      autoDetect: true,
      analyzeFlows: true
    };
  }

  if (args.output) {
    config.output = {
      ...DEFAULT_CONFIG.output,
      outputDir: args.output
    };
  }

  if (args.format) {
    config.output = {
      ...DEFAULT_CONFIG.output,
      ...config.output,
      formats: args.format.split(',') as OutputConfig['formats']
    };
  }

  if (args['3d']) {
    config.visualization = {
      ...DEFAULT_CONFIG.visualization,
      type: '3d'
    };
  }

  return config;
}

// =============================================================================
// VALIDATION DE LA CONFIGURATION
// =============================================================================

export interface ConfigValidationError {
  field: string;
  message: string;
}

export function validateConfig(config: QuantumVizConfig): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  // Validation AI
  if (config.ai.enabled) {
    if (config.ai.provider === 'openai' && !config.ai.openai?.apiKey) {
      errors.push({ field: 'ai.openai.apiKey', message: 'API key required for OpenAI' });
    }
    if (config.ai.provider === 'anthropic' && !config.ai.anthropic?.apiKey) {
      errors.push({ field: 'ai.anthropic.apiKey', message: 'API key required for Anthropic' });
    }
  }

  // Validation Architecture
  if (config.architecture.minConfidence < 0 || config.architecture.minConfidence > 100) {
    errors.push({ field: 'architecture.minConfidence', message: 'Must be between 0 and 100' });
  }

  // Validation Visualization
  if (config.visualization.three.bloomIntensity < 0 || config.visualization.three.bloomIntensity > 2) {
    errors.push({ field: 'visualization.three.bloomIntensity', message: 'Must be between 0 and 2' });
  }

  return errors;
}

// =============================================================================
// EXPORT PAR DÉFAUT
// =============================================================================

export default DEFAULT_CONFIG;
