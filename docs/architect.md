# Quantum Viz - Architecture Document

## 1. Vue d'Ensemble

### 1.1 Architecture Actuelle

```
┌─────────────────────────────────────────────────────────────────┐
│                          analyze.ts                              │
│                     (Point d'entrée CLI)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│    analyzer.ts   │ │ security-analyzer│ │   visualizer-3d.ts   │
│   (Multi-level   │ │      .ts         │ │   (Three.js Render)  │
│    L1-L7)        │ │ (200+ patterns)  │ │                      │
└──────────────────┘ └──────────────────┘ └──────────────────────┘
        │                    │                      │
        ▼                    ▼                      ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│    types.ts      │ │  CWE/OWASP Map   │ │  visualizer.ts (2D)  │
│  (Type System)   │ │                  │ │   (Cytoscape.js)     │
└──────────────────┘ └──────────────────┘ └──────────────────────┘
```

### 1.2 Flux de Données

```
Codebase (fichiers)
    │
    ▼
┌─────────────────────────────────────────┐
│            FileScanner                   │
│  - Glob des fichiers                     │
│  - Détection du langage                  │
│  - Lecture du contenu                    │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│            CodebaseAnalyzer              │
│  - Parse TypeScript/JS/Rust/Python       │
│  - Extrait imports/exports/classes       │
│  - Construit le graphe de dépendances    │
│  - Calcule les métriques                 │
└─────────────────────────────────────────┘
    │
    ├──────────────────────────────────────┐
    ▼                                      ▼
┌─────────────────────┐    ┌─────────────────────────┐
│  SecurityAnalyzer   │    │    AnalysisResult       │
│  - Pattern matching │    │  - nodes: CodeNode[]    │
│  - Context analysis │    │  - edges: CodeEdge[]    │
│  - Deduplication    │    │  - files: FileInfo[]    │
└─────────────────────┘    │  - callGraph            │
    │                      │  - dataFlows            │
    ▼                      │  - issues               │
┌─────────────────────┐    └─────────────────────────┘
│  SecurityReport     │                │
│  - vulnerabilities  │                │
│  - attackSurface    │                │
│  - secretsFound     │                │
└─────────────────────┘                │
    │                                  │
    └──────────────┬───────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│         Visualizer (3D/2D)               │
│  - Génère HTML avec embedded JS          │
│  - Three.js ou Cytoscape.js              │
│  - Export JSON pour outils externes      │
└─────────────────────────────────────────┘
    │
    ▼
output/visualization.html + output/visualization.json
```

---

## 2. Architecture Cible v2.0

### 2.1 Nouveaux Composants

```
┌─────────────────────────────────────────────────────────────────────┐
│                            analyze.ts                                │
└─────────────────────────────────────────────────────────────────────┘
                                   │
        ┌──────────────┬───────────┼───────────┬──────────────┐
        ▼              ▼           ▼           ▼              ▼
┌──────────────┐ ┌───────────┐ ┌─────────┐ ┌─────────┐ ┌────────────┐
│ analyzer.ts  │ │ security- │ │ cve-    │ │ ai-     │ │visualizer- │
│              │ │ analyzer  │ │ scanner │ │ analyzer│ │   3d       │
└──────────────┘ └───────────┘ └─────────┘ └─────────┘ └────────────┘
                                   │           │
                       ┌───────────┴───┐   ┌───┴────────┐
                       ▼               ▼   ▼            ▼
               ┌───────────┐   ┌───────────┐   ┌───────────────┐
               │ osv-client│   │nvd-client │   │ llm-client.ts │
               │    .ts    │   │    .ts    │   │(OpenAI/Claude)│
               └───────────┘   └───────────┘   └───────────────┘
```

### 2.2 Module: CVE Scanner

```typescript
// src/cve-scanner.ts

interface DependencyFile {
  type: 'npm' | 'cargo' | 'pip' | 'go';
  path: string;
  dependencies: Dependency[];
}

interface Dependency {
  name: string;
  version: string;
  isDev: boolean;
}

interface CVEResult {
  dependency: string;
  version: string;
  vulnerabilities: VulnerabilityInfo[];
}

interface VulnerabilityInfo {
  id: string;           // CVE-2024-XXXXX
  aliases: string[];    // GHSA-xxxx-xxxx
  severity: Severity;
  cvss: number;
  summary: string;
  affected: string[];   // Version ranges
  fixed: string[];      // Fixed versions
  references: string[];
}

class CVEScanner {
  private osvClient: OSVClient;
  private cache: Map<string, CVEResult>;

  async scanDirectory(dir: string): Promise<CVEResult[]>;
  async scanDependencyFile(file: DependencyFile): Promise<CVEResult[]>;
  async queryVulnerabilities(pkg: string, version: string): Promise<VulnerabilityInfo[]>;
}
```

### 2.3 Module: AI Analyzer

```typescript
// src/ai-analyzer.ts

interface AIConfig {
  provider: 'openai' | 'anthropic' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;  // Pour Ollama
}

interface ClassificationResult {
  nodeId: string;
  role: ComponentRole;
  confidence: number;
  reasoning: string;
}

type ComponentRole =
  | 'controller'
  | 'service'
  | 'repository'
  | 'model'
  | 'utility'
  | 'config'
  | 'test'
  | 'middleware'
  | 'view';

interface VulnerabilityValidation {
  vulnerabilityId: string;
  isValid: boolean;
  confidence: number;
  explanation: string;
  suggestedFix?: string;
}

class AIAnalyzer {
  private config: AIConfig;
  private client: LLMClient;

  async classifyComponents(nodes: CodeNode[]): Promise<ClassificationResult[]>;
  async validateVulnerability(vuln: SecurityVulnerability, context: string): Promise<VulnerabilityValidation>;
  async explainCode(code: string, question: string): Promise<string>;
  async suggestRefactoring(code: string, issue: CodeIssue): Promise<string>;
}
```

### 2.4 Visualizer 3D Amélioré

```typescript
// src/visualizer-3d.ts - Sections à modifier

// Nouveau système de géométries
const GEOMETRY_CONFIG = {
  system: {
    geometry: () => new THREE.IcosahedronGeometry(1, 2),
    material: {
      metalness: 0.4,
      roughness: 0.3,
      emissiveIntensity: 0.2
    }
  },
  module: {
    geometry: () => new RoundedBoxGeometry(1, 1, 1, 4, 0.1),
    material: {
      metalness: 0.3,
      roughness: 0.5,
      emissiveIntensity: 0.15
    }
  },
  file: {
    geometry: () => createHexagonGeometry(1, 0.2),
    material: {
      metalness: 0.2,
      roughness: 0.6,
      emissiveIntensity: 0.1,
      transparent: true,
      opacity: 0.85
    }
  },
  // ... autres types
};

// Post-processing optimisé
const BLOOM_CONFIG = {
  intensity: 0.4,      // Réduit de 1.5
  threshold: 0.8,      // Augmenté de 0.3
  radius: 0.5          // Réduit de 0.75
};

// Nouvelles animations
class NodeAnimator {
  animatePulse(mesh: THREE.Mesh, intensity: number);
  animateRotation(mesh: THREE.Mesh, speed: number);
  animateGlow(mesh: THREE.Mesh, color: THREE.Color);
}
```

---

## 3. Interfaces et Contrats

### 3.1 API Interne

```typescript
// Contrat entre analyzer et security-analyzer
interface AnalyzerOutput {
  files: FileInfo[];
  nodes: CodeNode[];
  edges: CodeEdge[];
}

// Contrat entre security-analyzer et visualizer
interface SecurityOutput {
  vulnerabilities: SecurityVulnerability[];
  attackSurface: AttackSurface;
  secretsFound: SecretFound[];
}

// Contrat entre cve-scanner et visualizer
interface CVEOutput {
  dependencies: DependencyVulnerability[];
  summary: {
    total: number;
    bySeverity: Record<Severity, number>;
  };
}

// Contrat entre ai-analyzer et autres modules
interface AIOutput {
  classifications: ClassificationResult[];
  validations: VulnerabilityValidation[];
}
```

### 3.2 Configuration

```typescript
// quantum-viz.config.ts (nouveau)
interface QuantumVizConfig {
  analysis: {
    languages: Language[];
    maxFileSize: number;
    ignorePatterns: string[];
  };
  security: {
    enablePatternScan: boolean;
    enableCVEScan: boolean;
    cveProviders: ('osv' | 'nvd' | 'snyk')[];
  };
  ai: {
    enabled: boolean;
    provider: AIConfig['provider'];
    model: string;
    features: ('classification' | 'validation' | 'chat')[];
  };
  visualization: {
    mode: '2d' | '3d';
    theme: 'light' | 'dark' | 'custom';
    bloomIntensity: number;
  };
}
```

---

## 4. Patterns et Conventions

### 4.1 Pattern: Plugin Architecture

```typescript
// Pour extensibilité future
interface AnalyzerPlugin {
  name: string;
  version: string;

  // Hooks
  onFileScanned?(file: FileInfo): void;
  onNodeCreated?(node: CodeNode): CodeNode;
  onAnalysisComplete?(result: AnalysisResult): AnalysisResult;
}

class PluginManager {
  private plugins: AnalyzerPlugin[] = [];

  register(plugin: AnalyzerPlugin): void;
  unregister(name: string): void;

  async runHook<K extends keyof AnalyzerPlugin>(
    hook: K,
    ...args: Parameters<AnalyzerPlugin[K]>
  ): Promise<void>;
}
```

### 4.2 Pattern: Caching

```typescript
// Cache pour les requêtes CVE et AI
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class QueryCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;

  get(key: string): T | undefined;
  set(key: string, value: T, ttl?: number): void;
  clear(): void;

  // Persistance optionnelle
  async loadFromDisk(path: string): Promise<void>;
  async saveToDisk(path: string): Promise<void>;
}
```

### 4.3 Convention: Error Handling

```typescript
// Erreurs typées pour meilleur debugging
class QuantumVizError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public context?: Record<string, unknown>
  ) {
    super(message);
  }
}

enum ErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_CONFIG = 'INVALID_CONFIG'
}
```

---

## 5. Sécurité de l'Architecture

### 5.1 Principes
- **No Data Exfiltration**: Le code source n'est jamais envoyé à des serveurs externes
- **Minimal API Calls**: Seuls les noms de packages sont envoyés pour CVE lookup
- **Local AI Option**: Support d'Ollama pour une exécution 100% locale
- **No Persistent Storage**: Pas de base de données, tout en mémoire

### 5.2 Flux de Données Sensibles

```
┌─────────────────────────────────────────────────────────────────┐
│                     ZONE LOCALE (sécurisée)                      │
│                                                                  │
│  Code Source ─────► Analyzer ─────► Visualisation                │
│       │                                                          │
│       │ (noms seulement)                                         │
│       ▼                                                          │
│  ┌─────────────┐                                                │
│  │ Package     │──── Query: "lodash@4.17.0" ────┐               │
│  │ Names Only  │                                 │               │
│  └─────────────┘                                 │               │
└──────────────────────────────────────────────────│───────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ZONE EXTERNE (APIs)                          │
│                                                                  │
│           OSV.dev / NVD / Snyk (CVE data only)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Performance

### 6.1 Bottlenecks Identifiés
1. **Parsing de gros fichiers** → Solution: Streaming parser
2. **Rendu 3D de nombreux nœuds** → Solution: LOD + Instancing
3. **Requêtes CVE multiples** → Solution: Batch queries + Cache
4. **Appels LLM coûteux** → Solution: Cache agressif + Batch

### 6.2 Optimisations Prévues

```typescript
// WebWorkers pour parsing parallèle
const workerPool = new WorkerPool(navigator.hardwareConcurrency);
await workerPool.parseFiles(files);

// LOD pour visualisation 3D
class LODManager {
  setDetailLevel(distance: number): void {
    if (distance > 100) return 'low';    // Simples sphères
    if (distance > 50) return 'medium';  // Géométries simplifiées
    return 'high';                        // Détail complet
  }
}

// Instancing pour nœuds similaires
const instancedMesh = new THREE.InstancedMesh(
  geometry,
  material,
  nodeCount
);
```

---

## 7. Testabilité

### 7.1 Structure des Tests

```
tests/
├── unit/
│   ├── analyzer.test.ts
│   ├── security-analyzer.test.ts
│   ├── cve-scanner.test.ts
│   └── ai-analyzer.test.ts
├── integration/
│   ├── full-analysis.test.ts
│   └── cve-integration.test.ts
├── e2e/
│   └── visualization.test.ts
└── fixtures/
    ├── sample-codebase/
    └── mock-responses/
```

### 7.2 Mocking Strategy

```typescript
// Mock pour tests offline
class MockOSVClient implements OSVClientInterface {
  async query(pkg: string, version: string): Promise<VulnerabilityInfo[]> {
    return fixtures.getVulnerabilities(pkg, version);
  }
}

class MockLLMClient implements LLMClientInterface {
  async complete(prompt: string): Promise<string> {
    return fixtures.getAIResponse(prompt);
  }
}
```

---

## 8. Déploiement

### 8.1 Build Pipeline

```bash
# Production build
bun run build

# Output structure
dist/
├── cli/
│   └── quantum-viz          # Binary CLI
├── lib/
│   ├── index.js            # Library entry
│   └── types.d.ts          # Type definitions
└── templates/
    ├── 2d.html             # 2D visualization template
    └── 3d.html             # 3D visualization template
```

### 8.2 Distribution

| Canal | Format | Usage |
|-------|--------|-------|
| npm | Package | `npm install -g quantum-viz` |
| GitHub Releases | Binary | Download direct |
| Docker | Image | `docker run quantum-viz` |

---

## 9. Diagramme de Séquence - Analyse Complète

```
User            CLI           Analyzer      Security      CVE         AI          Visualizer
 │               │               │             │           │           │              │
 │──analyze ./───►│               │             │           │           │              │
 │               │               │             │           │           │              │
 │               │──scan files──►│             │           │           │              │
 │               │               │             │           │           │              │
 │               │◄──FileInfo[]──│             │           │           │              │
 │               │               │             │           │           │              │
 │               │──────────────analyze───────►│           │           │              │
 │               │               │             │           │           │              │
 │               │◄─────────────CodeNode[]─────│           │           │              │
 │               │               │             │           │           │              │
 │               │──────────────────scan──────►│           │           │              │
 │               │               │             │           │           │              │
 │               │◄────────────SecurityReport──│           │           │              │
 │               │               │             │           │           │              │
 │               │──────────────────────scan deps─────────►│           │              │
 │               │               │             │           │           │              │
 │               │◄──────────────────────CVEResult[]──────│           │              │
 │               │               │             │           │           │              │
 │               │─────────────────────────classify───────►│           │              │
 │               │               │             │           │           │              │
 │               │◄────────────────────Classification[]───│           │              │
 │               │               │             │           │           │              │
 │               │──────────────────────────────────generate──────────►│              │
 │               │               │             │           │           │              │
 │               │◄─────────────────────────────────────HTML───────────│              │
 │               │               │             │           │           │              │
 │◄──output.html─│               │             │           │           │              │
 │               │               │             │           │           │              │
```

---

*Document d'architecture - Version 2.0 - 2026-01-14*
