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

## 2. Fonctionnalités v2.0

### 2.1 Amélioration Visualisation 3D

**Priorité**: P0 (Critique)

#### 2.1.1 Géométries Améliorées
| Type de Nœud | Géométrie Actuelle | Géométrie Cible |
|--------------|-------------------|-----------------|
| System (L1) | IcosahedronGeometry | Sphère cristalline multi-facettes |
| Module (L2) | OctahedronGeometry | RoundedBoxGeometry avec glow |
| File (L3) | BoxGeometry | Hexagone plat holographique |
| Class (L4) | DodecahedronGeometry | Dodécaèdre transparent |
| Function (L5) | SphereGeometry | Sphère avec halo pulsant |
| Interface (L4) | TorusGeometry | Anneau rotatif |
| Variable (L7) | SphereGeometry (petit) | Point lumineux avec trail |

#### 2.1.2 Matériaux PBR
```typescript
// Configuration cible
const material = new MeshStandardMaterial({
  color: layerColor,
  metalness: 0.3,
  roughness: 0.5,
  emissive: layerColor,
  emissiveIntensity: 0.1,
  transparent: true,
  opacity: 0.9
});
```

#### 2.1.3 Post-Processing Optimisé
- **Bloom**: intensity 0.4 (actuellement 1.5), threshold 0.8
- **SSAO**: Ambient occlusion subtile
- **Outline**: Contour sur sélection

#### Critères d'Acceptation
- [ ] Les formes sont visuellement distinctes par type
- [ ] Le bloom ne "brûle" plus les couleurs
- [ ] Les animations sont fluides (60 FPS)
- [ ] L'esthétique est cohérente et professionnelle

---

### 2.2 Intégration CVE/Vulnérabilités Connues

**Priorité**: P0 (Critique)

#### 2.2.1 Sources de Données
| Source | API | Coût | Couverture |
|--------|-----|------|------------|
| OSV.dev | REST | Gratuit | Multi-écosystèmes |
| NVD | REST | Gratuit | Exhaustive mais lente |
| Snyk | REST | Freemium | npm, pip, excellent |
| GitHub Advisory | GraphQL | Gratuit | GitHub packages |

#### 2.2.2 Parsers de Dépendances
| Fichier | Écosystème | Priorité |
|---------|-----------|----------|
| package.json | npm | P0 |
| package-lock.json | npm | P0 |
| Cargo.toml | Rust | P0 |
| Cargo.lock | Rust | P0 |
| requirements.txt | Python | P0 |
| poetry.lock | Python | P1 |
| go.mod | Go | P1 |
| go.sum | Go | P1 |

#### 2.2.3 Structure de Données
```typescript
interface DependencyVulnerability {
  dependency: string;
  installedVersion: string;
  cve: string;
  cvss: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  fixedVersions: string[];
  references: string[];
  exploitAvailable: boolean;
}
```

#### Critères d'Acceptation
- [ ] Parse package.json et Cargo.toml
- [ ] Query OSV.dev pour chaque dépendance
- [ ] Affiche les CVE avec score CVSS
- [ ] Propose les versions corrigées
- [ ] Intégré dans la visualisation (indicateur sur les modules)

---

### 2.3 Intégration IA

**Priorité**: P1 (Important)

#### 2.3.1 Phase 1: Classification Sémantique
- Utiliser un LLM pour classifier automatiquement les composants
- Input: nom de fichier, imports, exports, contenu (résumé)
- Output: rôle (controller, service, repository, util, test, config)

#### 2.3.2 Phase 2: Chat Contextuel
- Interface de chat dans la visualisation
- Contexte: nœud sélectionné + fichiers liés
- Exemples de requêtes:
  - "Explique ce que fait cette fonction"
  - "Quels sont les effets de bord de ce module?"
  - "Comment refactorer ce code?"

#### 2.3.3 Phase 3: Analyse de Vulnérabilités Avancée
- Validation des vulnérabilités détectées
- Élimination des faux positifs par compréhension du contexte
- Génération de PoC pour les vraies vulnérabilités

#### Critères d'Acceptation (Phase 1)
- [ ] API LLM configurée (OpenAI/Anthropic/Ollama)
- [ ] Classification de 5+ rôles avec >80% accuracy
- [ ] Résultats affichés comme métadonnées des nœuds

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

### Sprint 1 (Actuel)
- [ ] Refonte matériaux 3D
- [ ] Réduction bloom
- [ ] Nouvelles géométries par type

### Sprint 2
- [ ] Parser de dépendances (npm, cargo)
- [ ] Intégration OSV.dev
- [ ] Affichage CVE dans visualisation

### Sprint 3
- [ ] Export PNG/SVG
- [ ] Rapport sécurité Markdown
- [ ] Configuration LLM API

### Sprint 4
- [ ] Classification IA des composants
- [ ] Chat contextuel basique
- [ ] Validation vulnérabilités par IA

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
