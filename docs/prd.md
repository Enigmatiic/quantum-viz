# Quantum Viz - Product Requirements Document (PRD)

## Document Info
- **Version**: 2.0
- **Date**: 2026-01-14
- **Status**: Draft
- **Owner**: Quantum Viz Team

---

## 1. Objectifs du Produit

### 1.1 Vision
Devenir l'outil de référence pour la compréhension et la sécurisation des architectures logicielles, en combinant visualisation immersive et intelligence artificielle.

### 1.2 Objectifs Mesurables
| Objectif | Métrique | Cible |
|----------|----------|-------|
| Réduire le temps d'onboarding | Time to first contribution | -50% |
| Améliorer la détection de vulnérabilités | Vulnerabilities found vs manual audit | +200% |
| Réduire les faux positifs | False positive rate | < 10% |
| Satisfaction utilisateur | NPS Score | > 50 |

---

## 2. Fonctionnalités v2.0 (État Actuel)

### 2.1 Visualisation 3D ✅ Implémentée

**Status**: Complété

#### Configuration actuelle
- Géométries distinctes par type de nœud (L1-L7)
- Matériaux MeshPhongMaterial avec bloom
- Post-processing avec UnrealBloomPass
- Navigation interactive (orbit, zoom, pan)
- Modes de vue par niveau de granularité

#### Améliorations futures (P2)
- Matériaux PBR avec metalness/roughness
- SSAO pour meilleure profondeur
- Animations plus fluides

---

### 2.2 Intégration CVE/Vulnérabilités Connues ✅ Implémentée

**Status**: Complété

#### Implémentation actuelle (`src/cve-scanner.ts`)
- Source: OSV.dev API (gratuit, multi-écosystèmes)
- Parsers implémentés:
  - ✅ package.json (npm)
  - ✅ Cargo.toml (Rust)
  - 🔜 requirements.txt (Python) - à venir
  - 🔜 go.mod (Go) - à venir

#### Fonctionnalités
- ✅ Query OSV.dev pour chaque dépendance
- ✅ Affichage CVE avec score CVSS et sévérité
- ✅ Suggestions de versions corrigées
- ✅ Intégré dans le rapport JSON

---

### 2.3 Intégration IA ✅ Implémentée

**Status**: Phases 1 et 3 complétées

#### Phase 1: Classification Sémantique ✅
- Implémentation: `src/architecture/classifier.ts`
- Providers: Ollama (local), avec fallback heuristique
- Classification par couche et rôle (controller, service, repository, etc.)

#### Phase 2: Chat Contextuel 🔜
- Interface de chat dans la visualisation - à venir

#### Phase 3: Analyse de Vulnérabilités Avancée ✅
- Implémentation: `src/enhanced-security-pipeline.ts` + `src/ai-vulnerability-validator.ts`
- Pipeline à 3 étapes: Regex → AST → AI
- Réduction des faux positifs ~85%
- Providers: Anthropic (Claude), OpenAI (GPT-4)

#### Explication d'Architecture ✅
- Implémentation: `src/ai/architecture-explainer.ts`
- Génération d'explications en langage naturel via Ollama
- Support multi-langues (fr, en)

---

### 2.4 Export et Rapports

**Priorité**: P1 (Important)

#### 2.4.1 Formats d'Export
| Format | Usage | Priorité |
|--------|-------|----------|
| PNG | Capture rapide | P0 |
| SVG | Documentation | P1 |
| Mermaid | Diagrammes texte | P1 |
| PDF | Rapports formels | P2 |

#### 2.4.2 Rapport de Sécurité
- Résumé exécutif
- Liste des vulnérabilités par sévérité
- Recommandations de remédiation
- Graphique de tendance (si historique disponible)

#### Critères d'Acceptation
- [ ] Bouton "Export PNG" fonctionnel
- [ ] PNG haute résolution (2x)
- [ ] Rapport de sécurité en Markdown

---

## 3. Exigences Non-Fonctionnelles

### 3.1 Performance
| Métrique | Cible |
|----------|-------|
| Temps d'analyse (1000 fichiers) | < 30s |
| Temps de rendu initial | < 3s |
| FPS visualisation 3D | > 30 FPS |
| Mémoire max | < 2 GB |

### 3.2 Compatibilité
- Browsers: Chrome 90+, Firefox 90+, Safari 15+, Edge 90+
- Node.js: 18+
- Bun: 1.0+

### 3.3 Sécurité
- Aucune donnée envoyée à des serveurs externes (sauf CVE query)
- Pas de stockage de code source
- Option mode offline complet

---

## 4. User Stories

### US-01: Amélioration Visuelle
**En tant que** développeur utilisant Quantum Viz
**Je veux** une visualisation 3D esthétique et lisible
**Afin de** mieux comprendre l'architecture sans fatigue visuelle

### US-02: Détection CVE
**En tant que** responsable sécurité
**Je veux** voir les vulnérabilités connues de mes dépendances
**Afin de** prioriser les mises à jour critiques

### US-03: Assistant IA
**En tant que** nouveau développeur sur un projet
**Je veux** pouvoir poser des questions sur le code
**Afin de** comprendre plus rapidement l'architecture

### US-04: Export Rapport
**En tant que** consultant en sécurité
**Je veux** exporter un rapport de vulnérabilités
**Afin de** le partager avec mon client

---

## 5. Contraintes et Hypothèses

### 5.1 Contraintes
- Budget API LLM limité (utiliser caching agressif)
- Doit fonctionner offline (sauf features cloud explicites)
- Compatibilité avec les codebases existantes sans modification

### 5.2 Hypothèses
- L'utilisateur a accès au code source complet
- Le codebase utilise des langages supportés
- Une connexion internet est disponible pour les CVE

---

## 6. Roadmap

### Complétés ✅
- [x] Visualisation 3D avec géométries distinctes par type
- [x] Parser de dépendances (npm, cargo)
- [x] Intégration OSV.dev
- [x] Affichage CVE avec CVSS
- [x] Configuration LLM API (Ollama, Anthropic, OpenAI)
- [x] Classification IA des composants
- [x] Validation vulnérabilités par IA (pipeline AST + AI)
- [x] Détection de patterns architecturaux
- [x] Analyse de flux de données

### En cours / Prochains
- [ ] Export PNG/SVG
- [ ] Rapport sécurité Markdown
- [ ] Chat contextuel dans la visualisation
- [ ] Support requirements.txt, go.mod
- [ ] Amélioration matériaux PBR

---

## 7. Risques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Performance dégradée avec gros projets | Moyenne | Élevé | LOD, WebWorkers |
| Coûts API LLM | Élevée | Moyen | Cache, modèles locaux |
| Faux positifs persistants | Moyenne | Moyen | ML, feedback utilisateur |
| Latence API CVE | Faible | Faible | Cache local |

---

## 8. Métriques de Succès

| Milestone | Métrique | Objectif |
|-----------|----------|----------|
| v2.0-alpha | 3D rendering quality | User rating > 4/5 |
| v2.0-beta | CVE detection coverage | > 95% npm/cargo |
| v2.0-GA | False positive rate | < 10% |
| v2.1 | AI classification accuracy | > 80% |

---

*Document mis à jour le 2026-01-14*
