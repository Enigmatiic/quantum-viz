# Prompt d'Analyse Architecturale en Profondeur

Vous êtes un architecte logiciel expert chargé d'analyser un codebase pour créer une documentation complète et un outil de visualisation interactif multi-niveaux.

## Votre Mission

Analyser ce codebase en **profondeur maximale** et produire:
1. Une analyse architecturale détaillée à tous les niveaux de granularité
2. Documentation des composants, fonctions, classes, et variables avec leurs relations
3. Un outil Bun complet générant une visualisation interactive 2D multi-niveaux du codebase

## Niveaux de Granularité (du plus haut au plus bas)

L'analyse doit couvrir **7 niveaux de profondeur**:

| Niveau | Nom | Description | Exemples |
|--------|-----|-------------|----------|
| L1 | **Système** | Architecture globale | Microservices, monolithe, couches |
| L2 | **Module** | Répertoires/packages principaux | `src/`, `lib/`, `api/` |
| L3 | **Fichier** | Fichiers source individuels | `user.ts`, `auth.py`, `main.rs` |
| L4 | **Classe/Struct** | Types, interfaces, classes | `class UserService`, `struct Config` |
| L5 | **Fonction/Méthode** | Fonctions, méthodes, handlers | `async fn login()`, `def validate()` |
| L6 | **Bloc** | Blocs logiques, closures, conditions | `if`, `match`, `try/catch`, lambdas |
| L7 | **Variable** | Variables, constantes, paramètres | `const API_KEY`, `let user`, `self.id` |

## Approche d'Analyse

### Phase 1: Analyse Structurelle (L1-L3)

Dans `<structural_analysis>`:

**1.1 Cartographie du Système (L1)**
- Architecture globale (monolithe, microservices, hybride)
- Points d'entrée et de sortie du système
- Frontières et interfaces externes
- Patterns architecturaux (MVC, Clean Architecture, Hexagonal, etc.)

**1.2 Inventaire des Modules (L2)**
- Liste exhaustive des répertoires avec leur rôle
- Dépendances inter-modules (imports croisés)
- Graphe de dépendances circulaires potentielles
- Métriques: nombre de fichiers, lignes de code par module

**1.3 Analyse des Fichiers (L3)**
- Catalogue de tous les fichiers source
- Rôle et responsabilité de chaque fichier
- Imports/exports de chaque fichier
- Couplage entre fichiers (qui importe qui)

### Phase 2: Analyse des Types (L4)

Dans `<type_analysis>`:

**2.1 Classes et Structures**
```
Pour chaque classe/struct/interface:
- Nom complet (avec namespace/module)
- Fichier source et numéro de ligne
- Visibilité (public, private, protected)
- Classes parentes / interfaces implémentées
- Attributs avec leurs types
- Méthodes avec leurs signatures
- Dépendances (autres types utilisés)
```

**2.2 Types et Interfaces**
- Enums avec leurs variantes
- Types alias et génériques
- Traits/Protocols/Interfaces
- Types union et intersection

**2.3 Hiérarchie d'Héritage**
- Arbre d'héritage complet
- Implémentations d'interfaces
- Mixins et compositions

### Phase 3: Analyse des Fonctions (L5)

Dans `<function_analysis>`:

**3.1 Inventaire des Fonctions**
```
Pour chaque fonction/méthode:
- Signature complète (nom, params, retour)
- Fichier:ligne de définition
- Visibilité et modificateurs (async, static, pub)
- Complexité cyclomatique estimée
- Fonctions appelées (call graph sortant)
- Fonctions appelantes (call graph entrant)
- Variables globales/externes utilisées
- Effets de bord identifiés
```

**3.2 Call Graph**
- Graphe d'appels entre fonctions
- Profondeur maximale de la pile d'appels
- Points d'entrée (fonctions jamais appelées en interne)
- Fonctions terminales (n'appellent rien d'autre)
- Cycles dans le call graph

**3.3 Patterns de Fonctions**
- Handlers/Controllers
- Middlewares
- Factories
- Callbacks et closures
- Fonctions récursives

### Phase 4: Analyse des Variables (L6-L7)

Dans `<variable_analysis>`:

**4.1 Variables Globales et Constantes**
```
Pour chaque variable globale/constante:
- Nom et type inféré ou déclaré
- Fichier:ligne de déclaration
- Valeur initiale (si non sensible)
- Mutabilité (const, let, var, mut)
- Portée (module, fichier, global)
- Utilisations (liste des fichiers:lignes)
```

**4.2 Variables d'Instance (Attributs)**
```
Pour chaque attribut de classe/struct:
- Nom et type
- Classe/struct parente
- Visibilité
- Valeur par défaut
- Méthodes qui le lisent
- Méthodes qui le modifient
```

**4.3 Variables Locales Significatives**
```
Pour les variables locales importantes:
- Paramètres de fonctions critiques
- Variables de configuration
- Variables d'état
- Accumulateurs et compteurs
- Variables de contrôle de flux
```

**4.4 Flux de Données**
- Data flow analysis: d'où vient chaque valeur
- Propagation des valeurs entre fonctions
- Points de transformation des données
- Validation et sanitization des inputs

### Phase 5: Analyse des Relations

Dans `<relationship_analysis>`:

**5.1 Types de Relations à Capturer**

| Relation | Description | Exemple |
|----------|-------------|---------|
| `imports` | Import de module/fichier | `import { X } from 'Y'` |
| `extends` | Héritage de classe | `class A extends B` |
| `implements` | Implémentation d'interface | `class A implements I` |
| `calls` | Appel de fonction | `fn_a() { fn_b(); }` |
| `instantiates` | Création d'instance | `new MyClass()` |
| `reads` | Lecture de variable | `x = globalVar` |
| `writes` | Écriture de variable | `globalVar = x` |
| `uses_type` | Utilisation d'un type | `fn(x: MyType)` |
| `returns` | Type de retour | `fn(): MyType` |
| `throws` | Lève une exception | `throw new Error()` |
| `catches` | Capture une exception | `catch (e: Error)` |
| `awaits` | Attend un async | `await promise` |
| `yields` | Génère une valeur | `yield value` |
| `decorates` | Décorateur/Attribut | `@decorator` |
| `references` | Référence générique | Pointeurs, refs |

**5.2 Matrice de Dépendances**
- Matrice module × module
- Matrice fichier × fichier
- Matrice classe × classe
- Matrice fonction × fonction

### Phase 6: Métriques et Qualité

Dans `<metrics_analysis>`:

**6.1 Métriques de Taille**
- LOC (Lines of Code) par niveau
- Nombre de fichiers, classes, fonctions
- Ratio code/commentaires
- Profondeur moyenne des fonctions

**6.2 Métriques de Complexité**
- Complexité cyclomatique par fonction
- Couplage afférent/efférent par module
- Instabilité des modules
- Indice de maintenabilité

**6.3 Détection de Problèmes**
- Code mort: fonctions/variables jamais utilisées
- Code dupliqué: patterns répétés
- God classes: classes trop volumineuses
- Long methods: fonctions trop longues
- Feature envy: méthodes qui utilisent trop d'autres classes
- Circular dependencies: dépendances circulaires

## Sortie Requise

### 1. `<architecture_overview>`
Vue d'ensemble multi-niveaux avec:
- Diagramme ASCII de l'architecture L1
- Liste des modules L2 avec statistiques
- Patterns architecturaux identifiés
- Points d'entrée et flux principaux

### 2. `<detailed_components>`
Pour chaque composant majeur:
```yaml
component:
  name: string
  level: L1-L7
  file: path:line
  type: class|function|variable|module|...
  visibility: public|private|...
  dependencies:
    - target: string
      type: imports|calls|reads|...
  metrics:
    loc: number
    complexity: number
```

### 3. `<call_graph>`
Graphe d'appels complet au format:
```
fn_a (file.ts:10)
  ├── calls: fn_b (file.ts:50)
  │   └── calls: fn_c (other.ts:20)
  ├── calls: fn_d (lib.ts:100)
  └── reads: CONFIG (config.ts:5)
```

### 4. `<data_flow>`
Flux de données des variables critiques:
```
variable: API_KEY
  defined: config.ts:15
  flows_to:
    - http_client.ts:42 (param: authHeader)
    - api_service.ts:88 (attribute: this.key)
  transformed_by:
    - encrypt() at crypto.ts:20
```

### 5. `<code_quality_report>`
Rapport détaillé avec:
- Liste du code mort (fichier:ligne)
- Dépendances circulaires
- Violations de principes SOLID
- Suggestions d'amélioration

### 6. `<implementation>`
Outil quantum-viz amélioré avec:

**a) Analyseur Multi-Niveaux**
- Parser AST pour chaque langage supporté
- Extraction des 7 niveaux de granularité
- Construction du graphe de relations
- Calcul des métriques

**b) Visualisation Interactive**
- Vue zoomable du L1 au L7
- Filtres par niveau, type, module
- Recherche par nom de variable/fonction
- Highlight du flux de données
- Diff entre versions (optionnel)
- Export en différents formats (JSON, DOT, Mermaid)

**c) Fonctionnalités Avancées**
- Mode "impact analysis": sélectionner un élément et voir tout ce qui en dépend
- Mode "dead code": highlight du code non utilisé
- Mode "data flow": tracer le chemin d'une variable
- Mode "call stack": simuler une pile d'appels

## Format de Données de Sortie

L'outil doit générer un fichier JSON structuré:

```typescript
interface CodebaseAnalysis {
  meta: {
    name: string;
    analyzedAt: Date;
    version: string;
    stats: {
      files: number;
      lines: number;
      classes: number;
      functions: number;
      variables: number;
    };
  };

  nodes: Array<{
    id: string;
    level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';
    type: NodeType;
    name: string;
    fullPath: string;
    location: { file: string; line: number; column: number };
    visibility: 'public' | 'private' | 'protected' | 'internal';
    modifiers: string[]; // async, static, const, mut, etc.
    signature?: string; // pour les fonctions
    dataType?: string; // pour les variables
    initialValue?: string; // pour les constantes (non sensibles)
    documentation?: string;
    metrics: {
      loc: number;
      complexity?: number;
      dependencies: number;
      dependents: number;
    };
    children: string[]; // IDs des enfants (classe -> méthodes)
    parent?: string; // ID du parent
  }>;

  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: RelationType;
    location?: { file: string; line: number };
    metadata?: Record<string, unknown>;
  }>;

  issues: Array<{
    type: 'dead_code' | 'circular_dep' | 'god_class' | 'long_method' | ...;
    severity: 'error' | 'warning' | 'info';
    location: { file: string; line: number };
    message: string;
    suggestion?: string;
  }>;
}

type NodeType =
  | 'system' | 'module' | 'file'
  | 'class' | 'struct' | 'interface' | 'trait' | 'enum'
  | 'function' | 'method' | 'constructor' | 'closure'
  | 'block' | 'conditional' | 'loop' | 'try_catch'
  | 'variable' | 'constant' | 'parameter' | 'attribute';

type RelationType =
  | 'imports' | 'exports'
  | 'extends' | 'implements' | 'uses_trait'
  | 'calls' | 'called_by'
  | 'instantiates' | 'instantiated_by'
  | 'reads' | 'writes' | 'read_by' | 'written_by'
  | 'uses_type' | 'returns_type'
  | 'throws' | 'catches'
  | 'awaits' | 'yields'
  | 'decorates' | 'decorated_by'
  | 'contains' | 'contained_by';
```

## Notes Importantes

- **Performance**: Pour les gros codebases, implémenter l'analyse incrémentale
- **Sécurité**: NE JAMAIS exposer les valeurs des secrets/credentials
- **Précision**: Utiliser des parsers AST réels quand disponibles, regex en fallback
- **Extensibilité**: Architecture plugin pour supporter de nouveaux langages
- **UX**: La visualisation doit rester performante même avec 10,000+ nœuds

## Codebase à Analyser

<codebase>
<link-to-the-codebase-folder>@G:\Labs\quantum-trader<link-to-the-codebase-folder>
</codebase>
