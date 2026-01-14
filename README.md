# Quantum Viz

> Outil de visualisation d'architecture de codebase multi-niveaux L1-L7 avec détection automatique de patterns et analyse IA.

## Features

- **Visualisation 3D** avec Three.js + bloom post-processing
- **Visualisation 2D** avec Cytoscape.js
- **Analyse multi-niveaux** L1 (Système) → L7 (Variables)
- **Détection d'architecture** automatique (MVC, Clean, Hexagonal, DDD, etc.)
- **Classification de fichiers** par couche et rôle
- **Analyse de flux de données** avec détection de cycles
- **Explication IA** via Ollama (local LLM)
- **Analyse de sécurité** AST + AI (réduction faux positifs ~85%)
- **Scan CVE** des dépendances via OSV.dev

## Installation

```bash
bun install
```

## Usage

```bash
# Analyse basique (2D)
bun run analyze.ts ./mon-projet

# Visualisation 3D
bun run analyze.ts ./mon-projet -3d

# Avec analyse d'architecture
bun run analyze.ts ./mon-projet --arch

# Avec explication IA (requiert Ollama)
bun run analyze.ts ./mon-projet --arch --explain

# Analyse de sécurité
bun run analyze.ts ./mon-projet --security

# Combo complet
bun run analyze.ts ./mon-projet -3d --arch --explain --security --cve --verbose
```

## Options

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Fichier de sortie (défaut: ./output/visualization.html) |
| `-3d, --three` | Mode visualisation 3D avec Three.js |
| `-s, --security` | Analyse de sécurité (AST + AI optionnel) |
| `-c, --cve` | Scan des dépendances pour CVE connues |
| `-a, --arch` | Détection et analyse de l'architecture |
| `-e, --explain` | Explication IA de l'architecture (requiert Ollama) |
| `-m, --model <model>` | Modèle Ollama à utiliser (défaut: llama3.2) |
| `-v, --verbose` | Affichage détaillé |

## Patterns Architecturaux Supportés

- **Clean Architecture** - Cercles concentriques avec domaine au centre
- **Hexagonal** - Ports & Adapters
- **DDD** - Domain-Driven Design
- **MVC** - Model-View-Controller
- **MVVM** - Model-View-ViewModel
- **Layered** - Architecture en couches classique
- **Microservices** - Services distribués
- **Feature-Based** - Modules par fonctionnalité

## Structure du Projet

```
quantum-viz/
├── analyze.ts              # Point d'entrée CLI
├── src/
│   ├── analyzer.ts         # Analyseur principal
│   ├── visualizer.ts       # Générateur 2D (Cytoscape)
│   ├── visualizer-3d.ts    # Générateur 3D (Three.js)
│   ├── cli/                # Module CLI
│   ├── types/              # Types TypeScript
│   ├── ai/                 # Intégration Ollama
│   ├── architecture/       # Détection de patterns
│   ├── analysis/           # Parseurs par langage
│   └── visualization/      # Templates et scripts
```

## Variables d'Environnement

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Clé API pour validation AI sécurité (optionnel) |
| `OPENAI_API_KEY` | Alternative OpenAI (optionnel) |
| `AI_SECURITY_ENABLED` | `false` pour désactiver l'AI sécurité |

## License

MIT
