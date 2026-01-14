# Quantum Viz - Architecture Document

## 1. Vue d'Ensemble

### 1.1 Architecture Actuelle

```
┌─────────────────────────────────────────────────────────────────┐
│                          analyze.ts                              │
│                     (Point d'entrée CLI)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────┬───────┴───────┬───────────────┐
        ▼               ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   src/cli/   │ │src/analyzer  │ │src/security- │ │src/cve-      │
│  (Parser,    │ │    .ts       │ │analyzer.ts + │ │scanner.ts    │
│  Config,     │ │(Multi-level  │ │enhanced-sec..│ │(OSV.dev API) │
│  Reporter)   │ │  L1-L7)      │ │(AST + AI)    │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
                        │               │
        ┌───────────────┼───────────────┤
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│src/analysis/ │ │  src/ai/     │ │src/architect-│
│parsers/      │ │(OllamaClient,│ │ure/          │
│(TS,Rust,Py)  │ │ Explainer)   │ │(Detector,    │
└──────────────┘ └──────────────┘ │Classifier,   │
                                  │FlowAnalyzer) │
                                  └──────────────┘
                                         │
        ┌────────────────────────────────┴───────────┐
        ▼                                            ▼
┌──────────────────────┐              ┌──────────────────────┐
│  src/visualizer-3d   │              │  src/visualizer.ts   │
│     .ts              │              │    (Cytoscape.js)    │
│  (Three.js Render)   │              │                      │
└──────────────────────┘              └──────────────────────┘
        │                                      │
        ▼                                      ▼
┌──────────────────────────────────────────────────────────────┐
│                 src/visualization/                            │
│   (templates/, scripts/, styles/)                             │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│                      src/types/                               │
│  (base, nodes, edges, files, analysis, visualization, etc.)  │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Flux de Données

```
Codebase (fichiers)
    │
    ▼
┌─────────────────────────────────────────┐
│     CodebaseAnalyzer (src/analyzer.ts)   │
│  - Glob des fichiers                     │
│  - Détection du langage                  │
│  - Parse via src/analysis/parsers/       │
│  - Construit le graphe de dépendances    │
│  - Calcule les métriques                 │
└─────────────────────────────────────────┘
    │
    ├───────────────────────────────────────────────────┐
    ▼                                                   ▼
┌─────────────────────────────────────┐    ┌─────────────────────────┐
│    EnhancedSecurityPipeline         │    │    AnalysisResult       │
│    (src/enhanced-security-pipeline) │    │  - nodes: CodeNode[]    │
│  - Pattern matching (regex)         │    │  - edges: CodeEdge[]    │
│  - Filtrage AST                     │    │  - files: FileInfo[]    │
│  - Validation AI (Anthropic/OpenAI) │    │  - callGraph            │
│  - Réduction faux positifs ~85%     │    │  - dataFlows            │
└─────────────────────────────────────┘    │  - issues               │
    │                                      └─────────────────────────┘
    ▼                                                   │
┌─────────────────────────────────────┐                │
│  CVEScanner (src/cve-scanner.ts)    │                │
│  - Parse package.json, Cargo.toml   │                │
│  - Query OSV.dev API                │                │
│  - CVSS scoring                     │                │
└─────────────────────────────────────┘                │
    │                                                   │
    ├───────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│           Architecture Analysis (src/architecture/)              │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐     │
│  │ Detector     │──►│ Classifier   │──►│ FlowAnalyzer     │     │
│  │ (Pattern     │   │ (Files →     │   │ (Data flows,     │     │
│  │  detection)  │   │  Layers)     │   │  Cycles)         │     │
│  └──────────────┘   └──────────────┘   └──────────────────┘     │
│         │                  │                    │                │
│         └──────────────────┼────────────────────┘                │
│                            ▼                                     │
│              ┌──────────────────────────┐                       │
│              │ ArchitectureExplainer    │                       │
│              │ (Ollama - explication    │                       │
│              │  en langage naturel)     │                       │
│              └──────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
    │
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

## 2. Modules Implémentés

### 2.1 Vue des Composants

```
┌─────────────────────────────────────────────────────────────────────┐
│                            analyze.ts                                │
└─────────────────────────────────────────────────────────────────────┘
                                   │
        ┌──────────────┬───────────┼───────────┬──────────────┐
        ▼              ▼           ▼           ▼              ▼
┌──────────────┐ ┌───────────┐ ┌─────────┐ ┌─────────┐ ┌────────────┐
│ analyzer.ts  │ │ enhanced- │ │ cve-    │ │ src/ai/ │ │visualizer- │
│              │ │ security- │ │ scanner │ │         │ │   3d.ts    │
│              │ │ pipeline  │ │   .ts   │ │         │ │            │
└──────────────┘ └───────────┘ └─────────┘ └─────────┘ └────────────┘
                       │           │           │
                       ▼           ▼           ▼
               ┌───────────┐ ┌───────────┐ ┌───────────────┐
               │ast-analyzer│ │ OSV.dev  │ │ ollama-client │
               │    .ts    │ │   API    │ │     .ts       │
               └───────────┘ └───────────┘ └───────────────┘
                                           ┌───────────────┐
                                           │ architecture- │
                                           │ explainer.ts  │
                                           └───────────────┘
```

### 2.2 Module: CVE Scanner (Implémenté)

**Fichier**: `src/cve-scanner.ts`

```typescript
// Interface principale
interface CVEScanResult {
  packageName: string;
  version: string;
  vulnerabilities: OSVVulnerability[];
}

interface OSVVulnerability {
  id: string;           // CVE-2024-XXXXX ou GHSA-xxxx
  summary: string;
  severity: string;
  cvss?: number;
  fixedVersions: string[];
  references: string[];
}

// Utilisation
const scanner = new CVEScanner();
const results = await scanner.scanDirectory('./mon-projet');
```

**Fonctionnalités implémentées** :
- Parse `package.json` et `Cargo.toml`
- Requêtes vers OSV.dev API
- Scoring CVSS et sévérité
- Suggestions de versions corrigées

### 2.3 Module: AI (Implémenté)

**Répertoire**: `src/ai/`

```typescript
// src/ai/ollama-client.ts
class OllamaClient {
  constructor(options?: { model?: string; baseUrl?: string });
  async generate(prompt: string): Promise<string>;
  async listModels(): Promise<Model[]>;
}

// src/ai/architecture-explainer.ts
const explainer = createArchitectureExplainer(ollamaClient, {
  language: 'fr',
  detailLevel: 'detailed'
});
const explanation = await explainer.explain(detection, classification, flows);
```

**Fonctionnalités implémentées** :
- Client Ollama pour LLM local
- Explication d'architecture en langage naturel
- Support multi-langues (fr, en)
- Validation de vulnérabilités via `src/ai-vulnerability-validator.ts`

### 2.4 Module: Architecture Analysis (Implémenté)

**Répertoire**: `src/architecture/`

```typescript
// Détection de pattern architectural
const detector = new ArchitectureDetector({ useAI: true, aiClient });
const patterns = await detector.detect(context);
// → Clean Architecture, Hexagonal, MVC, DDD, etc.

// Classification des fichiers par couche
const classifier = new ArchitectureClassifier({ useAI: true, aiClient });
const classification = await classifier.classify(files, pattern);

// Analyse des flux de données
const flowAnalyzer = new FlowAnalyzer({ detectCycles: true, maxFlowDepth: 20 });
const flows = await flowAnalyzer.analyze(classification, pattern, edges);
```

**Patterns supportés** : Clean Architecture, Hexagonal, DDD, MVC, MVVM, Layered, Microservices, Feature-Based

### 2.5 Module: Enhanced Security Pipeline (Implémenté)

**Fichier**: `src/enhanced-security-pipeline.ts`

```typescript
const securityAnalyzer = new SecurityAnalyzer({
  enableASTFiltering: true,      // Filtrage via AST
  enableAIValidation: true,      // Validation via Anthropic/OpenAI
  ai: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    enableDataFlowAnalysis: true,
    enableASTAnalysis: true,
  },
  thresholds: {
    astConfidenceToFilter: 0.85,
    aiConfidenceToFilter: 0.80,
  }
});
```

**Pipeline à 3 étapes** :
1. Détection regex (200+ patterns)
2. Filtrage AST (analyse syntaxique)
3. Validation AI (réduction faux positifs ~85%)

### 2.6 Module: Visualisation

**Répertoire**: `src/visualization/`

```
src/visualization/
├── templates/
│   └── html.ts         # Template HTML principal
├── scripts/
│   ├── three-setup.ts  # Configuration Three.js
│   ├── nodes.ts        # Rendu des nœuds
│   ├── edges.ts        # Rendu des arêtes
│   ├── animation.ts    # Animations
│   ├── interaction.ts  # Interactions utilisateur
│   ├── navigation.ts   # Navigation dans le graphe
│   ├── ui.ts           # Interface utilisateur
│   ├── tree.ts         # Vue arborescente
│   ├── search.ts       # Recherche
│   ├── issues-panel.ts # Panneau des issues
│   └── view-modes.ts   # Modes de vue L1-L7
└── styles/
    ├── base.ts         # Styles de base
    ├── panels.ts       # Styles des panneaux
    └── ...
```

**Fichiers principaux** :
- `src/visualizer-3d.ts` - Générateur de visualisation Three.js
- `src/visualizer.ts` - Générateur de visualisation Cytoscape.js

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

### 3.2 Configuration (via CLI et Variables d'Environnement)

```typescript
// Options CLI (src/cli/parser.ts)
interface AnalyzeOptions {
  mode: '2d' | '3d';
  output: string;
  security: boolean;
  cve: boolean;
  arch: boolean;
  explain: boolean;
  aiModel: string;
  verbose: boolean;
}

// Variables d'environnement
// ANTHROPIC_API_KEY - Pour validation AI sécurité
// OPENAI_API_KEY    - Alternative OpenAI
// AI_SECURITY_ENABLED - 'false' pour désactiver l'AI sécurité
// MAX_VULNS_FOR_AI  - Limite de vulns à valider par AI (défaut: 50)
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
User           CLI          Analyzer     Security    CVE        Architecture    Visualizer
 │              │              │            │          │              │              │
 │──analyze ./──►              │            │          │              │              │
 │              │              │            │          │              │              │
 │              │──Phase 1────►│            │          │              │              │
 │              │              │            │          │              │              │
 │              │◄─AnalysisResult───────────│          │              │              │
 │              │              │            │          │              │              │
 │              │──Phase 2 (--security)────►│          │              │              │
 │              │              │            │          │              │              │
 │              │◄───EnhancedSecurityReport─│          │              │              │
 │              │              │            │          │              │              │
 │              │──Phase 3 (--cve)─────────────────────►              │              │
 │              │              │            │          │              │              │
 │              │◄────────────────────CVEScanResult[]──│              │              │
 │              │              │            │          │              │              │
 │              │──Phase 4 (--arch)────────────────────────────────────►             │
 │              │              │            │          │              │              │
 │              │    ┌─────────────────────────────────────────────────┐             │
 │              │    │ 4.1 Detector.detect() → Pattern                 │             │
 │              │    │ 4.2 Classifier.classify() → Files/Layers        │             │
 │              │    │ 4.3 FlowAnalyzer.analyze() → Data Flows         │             │
 │              │    │ 4.4 Explainer.explain() → AI Description        │             │
 │              │    └─────────────────────────────────────────────────┘             │
 │              │◄─────────────────ArchitectureAnalysisResult──────────│             │
 │              │              │            │          │              │              │
 │              │──generate (2d/3d)────────────────────────────────────────────────►│
 │              │              │            │          │              │              │
 │              │◄─────────────────────────────────────────────HTML + JSON──────────│
 │              │              │            │          │              │              │
 │◄─output files│              │            │          │              │              │
```

---

*Document d'architecture - Version 2.1 - Mis à jour le 2026-01-14*
