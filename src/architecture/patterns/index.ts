// =============================================================================
// ARCHITECTURE PATTERNS - Définitions des patterns architecturaux
// =============================================================================

export interface ArchitectureLayer {
  name: string;
  aliases: string[];           // Noms de dossiers/fichiers qui matchent
  patterns: RegExp[];          // Patterns regex pour matcher
  color: string;               // Couleur pour la visualisation
  level: number;               // Niveau dans la hiérarchie (0 = plus haut)
  allowedDependencies: string[]; // Couches dont cette couche peut dépendre
  description: string;
}

export interface ArchitecturePattern {
  name: string;
  description: string;
  layers: ArchitectureLayer[];
  indicators: PatternIndicator[];  // Indicateurs pour détecter ce pattern
  flowDirection: 'top-down' | 'outside-in' | 'bidirectional';
  strictness: 'strict' | 'flexible'; // Si les violations sont critiques
}

export interface PatternIndicator {
  type: 'folder' | 'file' | 'naming' | 'import';
  pattern: RegExp;
  weight: number;  // Poids dans le score de détection (0-10)
  required: boolean;
}

export interface DetectionResult {
  pattern: ArchitecturePattern;
  confidence: number;  // 0-100
  matchedIndicators: PatternIndicator[];
  layerDistribution: Map<string, number>;  // Nombre de fichiers par couche
  violations: ArchitectureViolation[];
}

export interface ArchitectureViolation {
  type: 'dependency' | 'naming' | 'placement';
  severity: 'error' | 'warning' | 'info';
  sourceFile: string;
  targetFile?: string;
  sourceLayer: string;
  targetLayer?: string;
  message: string;
}

// =============================================================================
// PATTERN: MVC (Model-View-Controller)
// =============================================================================
export const MVC_PATTERN: ArchitecturePattern = {
  name: 'MVC',
  description: 'Model-View-Controller - Séparation en modèles de données, vues et contrôleurs',
  flowDirection: 'bidirectional',
  strictness: 'flexible',
  layers: [
    {
      name: 'view',
      aliases: ['views', 'view', 'templates', 'pages', 'screens', 'ui'],
      patterns: [
        /views?\//i,
        /templates?\//i,
        /pages?\//i,
        /screens?\//i,
        /\.view\.(ts|js|tsx|jsx)$/i,
        /\.template\.(ts|js|html)$/i
      ],
      color: '#00ff88',
      level: 0,
      allowedDependencies: ['controller', 'model', 'viewmodel'],
      description: 'Couche de présentation - Interface utilisateur'
    },
    {
      name: 'controller',
      aliases: ['controllers', 'controller', 'handlers', 'actions'],
      patterns: [
        /controllers?\//i,
        /handlers?\//i,
        /actions?\//i,
        /\.controller\.(ts|js)$/i,
        /\.handler\.(ts|js)$/i
      ],
      color: '#00ccff',
      level: 1,
      allowedDependencies: ['model', 'service'],
      description: 'Couche de contrôle - Logique de coordination'
    },
    {
      name: 'model',
      aliases: ['models', 'model', 'entities', 'domain'],
      patterns: [
        /models?\//i,
        /entities?\//i,
        /\.model\.(ts|js)$/i,
        /\.entity\.(ts|js)$/i
      ],
      color: '#ff6600',
      level: 2,
      allowedDependencies: [],
      description: 'Couche de données - Modèles et entités'
    },
    {
      name: 'service',
      aliases: ['services', 'service', 'providers'],
      patterns: [
        /services?\//i,
        /providers?\//i,
        /\.service\.(ts|js)$/i
      ],
      color: '#ff00ff',
      level: 1,
      allowedDependencies: ['model', 'repository'],
      description: 'Couche de services - Logique métier'
    }
  ],
  indicators: [
    { type: 'folder', pattern: /controllers?\//i, weight: 9, required: true },
    { type: 'folder', pattern: /models?\//i, weight: 8, required: true },
    { type: 'folder', pattern: /views?\//i, weight: 7, required: false },
    { type: 'file', pattern: /\.controller\.(ts|js)$/i, weight: 6, required: false },
    { type: 'file', pattern: /\.model\.(ts|js)$/i, weight: 5, required: false }
  ]
};

// =============================================================================
// PATTERN: Clean Architecture
// =============================================================================
export const CLEAN_ARCHITECTURE_PATTERN: ArchitecturePattern = {
  name: 'Clean Architecture',
  description: 'Architecture en cercles concentriques avec le domaine au centre',
  flowDirection: 'outside-in',
  strictness: 'strict',
  layers: [
    {
      name: 'presentation',
      aliases: ['presentation', 'ui', 'web', 'api', 'controllers'],
      patterns: [
        /presentation\//i,
        /ui\//i,
        /web\//i,
        /api\//i,
        /controllers?\//i
      ],
      color: '#00ff88',
      level: 0,
      allowedDependencies: ['application', 'domain'],
      description: 'Couche externe - UI, API, CLI'
    },
    {
      name: 'infrastructure',
      aliases: ['infrastructure', 'infra', 'adapters', 'frameworks', 'external'],
      patterns: [
        /infrastructure\//i,
        /infra\//i,
        /adapters?\//i,
        /frameworks?\//i,
        /external\//i
      ],
      color: '#888888',
      level: 0,
      allowedDependencies: ['application', 'domain'],
      description: 'Couche externe - Implémentations techniques'
    },
    {
      name: 'application',
      aliases: ['application', 'app', 'usecases', 'use-cases', 'interactors'],
      patterns: [
        /application\//i,
        /app\//i,
        /use-?cases?\//i,
        /interactors?\//i
      ],
      color: '#00ccff',
      level: 1,
      allowedDependencies: ['domain'],
      description: 'Couche application - Cas d\'utilisation'
    },
    {
      name: 'domain',
      aliases: ['domain', 'core', 'entities', 'business'],
      patterns: [
        /domain\//i,
        /core\//i,
        /entities?\//i,
        /business\//i
      ],
      color: '#ff6600',
      level: 2,
      allowedDependencies: [],
      description: 'Couche domaine - Règles métier'
    }
  ],
  indicators: [
    { type: 'folder', pattern: /domain\//i, weight: 10, required: true },
    { type: 'folder', pattern: /use-?cases?\//i, weight: 9, required: false },
    { type: 'folder', pattern: /application\//i, weight: 8, required: false },
    { type: 'folder', pattern: /infrastructure\//i, weight: 8, required: false },
    { type: 'folder', pattern: /adapters?\//i, weight: 7, required: false },
    { type: 'folder', pattern: /entities?\//i, weight: 6, required: false }
  ]
};

// =============================================================================
// PATTERN: Hexagonal Architecture (Ports & Adapters)
// =============================================================================
export const HEXAGONAL_PATTERN: ArchitecturePattern = {
  name: 'Hexagonal',
  description: 'Architecture hexagonale - Ports et Adaptateurs',
  flowDirection: 'outside-in',
  strictness: 'strict',
  layers: [
    {
      name: 'adapters-in',
      aliases: ['adapters/in', 'adapters/primary', 'driving', 'inbound'],
      patterns: [
        /adapters?\/in\//i,
        /adapters?\/primary\//i,
        /driving\//i,
        /inbound\//i,
        /\.adapter\.(ts|js)$/i
      ],
      color: '#00ff88',
      level: 0,
      allowedDependencies: ['ports-in', 'application'],
      description: 'Adaptateurs entrants - API, UI, CLI'
    },
    {
      name: 'adapters-out',
      aliases: ['adapters/out', 'adapters/secondary', 'driven', 'outbound'],
      patterns: [
        /adapters?\/out\//i,
        /adapters?\/secondary\//i,
        /driven\//i,
        /outbound\//i
      ],
      color: '#888888',
      level: 0,
      allowedDependencies: ['ports-out', 'domain'],
      description: 'Adaptateurs sortants - DB, External APIs'
    },
    {
      name: 'ports-in',
      aliases: ['ports/in', 'ports/primary', 'ports/driving'],
      patterns: [
        /ports?\/in\//i,
        /ports?\/primary\//i,
        /\.port\.(ts|js)$/i
      ],
      color: '#00ccff',
      level: 1,
      allowedDependencies: ['domain'],
      description: 'Ports entrants - Interfaces des use cases'
    },
    {
      name: 'ports-out',
      aliases: ['ports/out', 'ports/secondary', 'ports/driven'],
      patterns: [
        /ports?\/out\//i,
        /ports?\/secondary\//i
      ],
      color: '#ffcc00',
      level: 1,
      allowedDependencies: ['domain'],
      description: 'Ports sortants - Interfaces des repositories'
    },
    {
      name: 'application',
      aliases: ['application', 'app', 'usecases', 'services'],
      patterns: [
        /application\//i,
        /use-?cases?\//i
      ],
      color: '#ff00ff',
      level: 1,
      allowedDependencies: ['domain', 'ports-out'],
      description: 'Application - Orchestration des use cases'
    },
    {
      name: 'domain',
      aliases: ['domain', 'core', 'model'],
      patterns: [
        /domain\//i,
        /core\//i,
        /model\//i
      ],
      color: '#ff6600',
      level: 2,
      allowedDependencies: [],
      description: 'Domaine - Entités et règles métier'
    }
  ],
  indicators: [
    { type: 'folder', pattern: /ports?\//i, weight: 10, required: true },
    { type: 'folder', pattern: /adapters?\//i, weight: 10, required: true },
    { type: 'folder', pattern: /domain\//i, weight: 8, required: true },
    { type: 'file', pattern: /\.port\.(ts|js)$/i, weight: 7, required: false },
    { type: 'file', pattern: /\.adapter\.(ts|js)$/i, weight: 7, required: false }
  ]
};

// =============================================================================
// PATTERN: Layered Architecture
// =============================================================================
export const LAYERED_PATTERN: ArchitecturePattern = {
  name: 'Layered',
  description: 'Architecture en couches classique',
  flowDirection: 'top-down',
  strictness: 'flexible',
  layers: [
    {
      name: 'presentation',
      aliases: ['presentation', 'ui', 'web', 'api', 'views'],
      patterns: [
        /presentation\//i,
        /ui\//i,
        /web\//i,
        /views?\//i
      ],
      color: '#00ff88',
      level: 0,
      allowedDependencies: ['business', 'service'],
      description: 'Couche présentation'
    },
    {
      name: 'business',
      aliases: ['business', 'bll', 'logic', 'services'],
      patterns: [
        /business\//i,
        /bll\//i,
        /logic\//i,
        /services?\//i
      ],
      color: '#00ccff',
      level: 1,
      allowedDependencies: ['data', 'persistence'],
      description: 'Couche logique métier'
    },
    {
      name: 'data',
      aliases: ['data', 'dal', 'persistence', 'repositories', 'db'],
      patterns: [
        /data\//i,
        /dal\//i,
        /persistence\//i,
        /repositories?\//i,
        /db\//i
      ],
      color: '#ff6600',
      level: 2,
      allowedDependencies: [],
      description: 'Couche accès aux données'
    }
  ],
  indicators: [
    { type: 'folder', pattern: /presentation\//i, weight: 8, required: false },
    { type: 'folder', pattern: /business\//i, weight: 8, required: false },
    { type: 'folder', pattern: /services?\//i, weight: 6, required: false },
    { type: 'folder', pattern: /(data|dal|persistence)\//i, weight: 7, required: false },
    { type: 'folder', pattern: /repositories?\//i, weight: 6, required: false }
  ]
};

// =============================================================================
// PATTERN: MVVM (Model-View-ViewModel)
// =============================================================================
export const MVVM_PATTERN: ArchitecturePattern = {
  name: 'MVVM',
  description: 'Model-View-ViewModel - Pattern de présentation avec data binding',
  flowDirection: 'bidirectional',
  strictness: 'flexible',
  layers: [
    {
      name: 'view',
      aliases: ['views', 'view', 'pages', 'screens', 'components'],
      patterns: [
        /views?\//i,
        /pages?\//i,
        /screens?\//i,
        /\.view\.(ts|js|tsx|jsx)$/i
      ],
      color: '#00ff88',
      level: 0,
      allowedDependencies: ['viewmodel'],
      description: 'Couche View - Interface utilisateur'
    },
    {
      name: 'viewmodel',
      aliases: ['viewmodels', 'viewmodel', 'vm', 'stores'],
      patterns: [
        /view-?models?\//i,
        /vm\//i,
        /stores?\//i,
        /\.viewmodel\.(ts|js)$/i,
        /\.vm\.(ts|js)$/i,
        /\.store\.(ts|js)$/i
      ],
      color: '#00ccff',
      level: 1,
      allowedDependencies: ['model', 'service'],
      description: 'Couche ViewModel - État et logique de présentation'
    },
    {
      name: 'model',
      aliases: ['models', 'model', 'entities', 'domain'],
      patterns: [
        /models?\//i,
        /entities?\//i,
        /domain\//i,
        /\.model\.(ts|js)$/i
      ],
      color: '#ff6600',
      level: 2,
      allowedDependencies: [],
      description: 'Couche Model - Données et logique métier'
    },
    {
      name: 'service',
      aliases: ['services', 'service', 'api'],
      patterns: [
        /services?\//i,
        /api\//i,
        /\.service\.(ts|js)$/i
      ],
      color: '#ff00ff',
      level: 1,
      allowedDependencies: ['model'],
      description: 'Couche Service - Accès aux données'
    }
  ],
  indicators: [
    { type: 'folder', pattern: /view-?models?\//i, weight: 10, required: true },
    { type: 'file', pattern: /\.viewmodel\.(ts|js)$/i, weight: 9, required: false },
    { type: 'file', pattern: /\.vm\.(ts|js)$/i, weight: 8, required: false },
    { type: 'folder', pattern: /stores?\//i, weight: 6, required: false },
    { type: 'folder', pattern: /views?\//i, weight: 5, required: false }
  ]
};

// =============================================================================
// PATTERN: Microservices
// =============================================================================
export const MICROSERVICES_PATTERN: ArchitecturePattern = {
  name: 'Microservices',
  description: 'Architecture microservices - Services indépendants et découplés',
  flowDirection: 'bidirectional',
  strictness: 'flexible',
  layers: [
    {
      name: 'gateway',
      aliases: ['gateway', 'api-gateway', 'proxy', 'bff'],
      patterns: [
        /gateway\//i,
        /api-gateway\//i,
        /proxy\//i,
        /bff\//i
      ],
      color: '#00ff88',
      level: 0,
      allowedDependencies: ['service'],
      description: 'API Gateway - Point d\'entrée unique'
    },
    {
      name: 'service',
      aliases: ['services', 'service', 'microservices'],
      patterns: [
        /services?\//i,
        /microservices?\//i,
        /-service\//i
      ],
      color: '#00ccff',
      level: 1,
      allowedDependencies: ['shared', 'common'],
      description: 'Microservices - Services métier'
    },
    {
      name: 'shared',
      aliases: ['shared', 'common', 'libs', 'packages'],
      patterns: [
        /shared\//i,
        /common\//i,
        /libs?\//i,
        /packages?\//i
      ],
      color: '#ff6600',
      level: 2,
      allowedDependencies: [],
      description: 'Shared - Code partagé entre services'
    }
  ],
  indicators: [
    { type: 'folder', pattern: /services?\/[^/]+\/src\//i, weight: 10, required: false },
    { type: 'folder', pattern: /microservices?\//i, weight: 9, required: false },
    { type: 'folder', pattern: /gateway\//i, weight: 8, required: false },
    { type: 'folder', pattern: /api-gateway\//i, weight: 8, required: false },
    { type: 'folder', pattern: /(shared|common)\//i, weight: 6, required: false },
    { type: 'file', pattern: /docker-compose\.ya?ml$/i, weight: 5, required: false }
  ]
};

// =============================================================================
// PATTERN: DDD (Domain-Driven Design)
// =============================================================================
export const DDD_PATTERN: ArchitecturePattern = {
  name: 'DDD',
  description: 'Domain-Driven Design - Conception pilotée par le domaine',
  flowDirection: 'outside-in',
  strictness: 'strict',
  layers: [
    {
      name: 'interface',
      aliases: ['interface', 'interfaces', 'api', 'presentation', 'web'],
      patterns: [
        /interfaces?\//i,
        /api\//i,
        /presentation\//i,
        /web\//i
      ],
      color: '#00ff88',
      level: 0,
      allowedDependencies: ['application', 'domain'],
      description: 'Couche Interface - API et UI'
    },
    {
      name: 'application',
      aliases: ['application', 'app', 'usecases', 'services'],
      patterns: [
        /application\//i,
        /app\//i,
        /use-?cases?\//i
      ],
      color: '#00ccff',
      level: 1,
      allowedDependencies: ['domain', 'infrastructure'],
      description: 'Couche Application - Services applicatifs'
    },
    {
      name: 'domain',
      aliases: ['domain', 'core', 'model'],
      patterns: [
        /domain\//i,
        /core\//i
      ],
      color: '#ff6600',
      level: 2,
      allowedDependencies: [],
      description: 'Couche Domaine - Entités, Value Objects, Aggregates'
    },
    {
      name: 'infrastructure',
      aliases: ['infrastructure', 'infra', 'persistence', 'repositories'],
      patterns: [
        /infrastructure\//i,
        /infra\//i,
        /persistence\//i
      ],
      color: '#888888',
      level: 1,
      allowedDependencies: ['domain'],
      description: 'Couche Infrastructure - Implémentations techniques'
    }
  ],
  indicators: [
    { type: 'folder', pattern: /domain\//i, weight: 9, required: true },
    { type: 'folder', pattern: /aggregates?\//i, weight: 10, required: false },
    { type: 'folder', pattern: /entities?\//i, weight: 7, required: false },
    { type: 'folder', pattern: /value-?objects?\//i, weight: 10, required: false },
    { type: 'folder', pattern: /repositories?\//i, weight: 7, required: false },
    { type: 'file', pattern: /\.aggregate\.(ts|js)$/i, weight: 9, required: false },
    { type: 'file', pattern: /\.entity\.(ts|js)$/i, weight: 6, required: false },
    { type: 'file', pattern: /\.value-?object\.(ts|js)$/i, weight: 8, required: false }
  ]
};

// =============================================================================
// PATTERN: Feature-based / Modular
// =============================================================================
export const FEATURE_BASED_PATTERN: ArchitecturePattern = {
  name: 'Feature-Based',
  description: 'Architecture modulaire par fonctionnalité',
  flowDirection: 'bidirectional',
  strictness: 'flexible',
  layers: [
    {
      name: 'feature',
      aliases: ['features', 'feature', 'modules', 'module'],
      patterns: [
        /features?\//i,
        /modules?\//i
      ],
      color: '#00ccff',
      level: 0,
      allowedDependencies: ['shared', 'core'],
      description: 'Features - Modules fonctionnels'
    },
    {
      name: 'shared',
      aliases: ['shared', 'common', 'lib'],
      patterns: [
        /shared\//i,
        /common\//i,
        /lib\//i
      ],
      color: '#ff6600',
      level: 1,
      allowedDependencies: ['core'],
      description: 'Shared - Composants partagés'
    },
    {
      name: 'core',
      aliases: ['core', 'kernel', 'base'],
      patterns: [
        /core\//i,
        /kernel\//i,
        /base\//i
      ],
      color: '#ff00ff',
      level: 2,
      allowedDependencies: [],
      description: 'Core - Noyau de l\'application'
    }
  ],
  indicators: [
    { type: 'folder', pattern: /features?\//i, weight: 10, required: true },
    { type: 'folder', pattern: /modules?\//i, weight: 8, required: false },
    { type: 'folder', pattern: /(shared|common)\//i, weight: 6, required: false },
    { type: 'folder', pattern: /core\//i, weight: 5, required: false }
  ]
};

// =============================================================================
// ALL PATTERNS
// =============================================================================
export const ALL_PATTERNS: ArchitecturePattern[] = [
  CLEAN_ARCHITECTURE_PATTERN,
  HEXAGONAL_PATTERN,
  DDD_PATTERN,
  MVC_PATTERN,
  MVVM_PATTERN,
  LAYERED_PATTERN,
  MICROSERVICES_PATTERN,
  FEATURE_BASED_PATTERN
];

export function getPatternByName(name: string): ArchitecturePattern | undefined {
  return ALL_PATTERNS.find(p => p.name.toLowerCase() === name.toLowerCase());
}
