#!/usr/bin/env bun

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { CodebaseAnalyzer } from './src/analyzer';
import { generateVisualization } from './src/visualizer';
import { generate3DVisualization } from './src/visualizer-3d';
import { SecurityAnalyzer } from './src/security-analyzer';
import { CVEScanner } from './src/cve-scanner';
import type { SecurityReport } from './src/security-analyzer';
import type { CVEScanResult } from './src/cve-scanner';

// Architecture Analysis
import {
  ArchitectureDetector,
  ArchitectureClassifier,
  FlowAnalyzer,
  createDetectionContext,
  type DetectionResult,
  type ClassificationResult,
  type FlowAnalysisResult
} from './src/architecture';
import {
  OllamaClient,
  isOllamaAvailable,
  createArchitectureExplainer,
  type ArchitectureExplanation
} from './src/ai';
import { loadConfig, createConfigFromArgs } from './quantum-viz.config';

interface AnalyzeOptions {
  output: string;
  mode: '2d' | '3d';
  security: boolean;
  cve: boolean;
  deep: boolean;
  verbose: boolean;
  // Architecture analysis
  arch: boolean;
  explain: boolean;
  aiModel: string;
}

interface ArchitectureAnalysisResult {
  detection: DetectionResult;
  classification: ClassificationResult;
  flows: FlowAnalysisResult;
  explanation?: ArchitectureExplanation;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${chalk.bold.cyan('Quantum Viz')} - Outil de visualisation d'architecture de codebase
${chalk.gray('Analyse multi-niveaux L1-L7 avec détection de vulnérabilités')}

${chalk.bold('Usage:')}
  bun run analyze.ts <chemin-vers-codebase> [options]

${chalk.bold('Options:')}
  -o, --output <fichier>  Fichier de sortie (defaut: ./output/visualization.html)
  -3d, --three            Mode visualisation 3D avec Three.js (defaut: 2D)
  -s, --security          Analyse de sécurité adversariale
  -c, --cve               Scan des dépendances pour CVE connues (OSV.dev)
  -d, --deep              Analyse en profondeur maximale (L8+)
  -v, --verbose           Affichage détaillé
  -h, --help              Afficher cette aide

${chalk.bold.cyan('Options Architecture (NEW):')}
  -a, --arch              Détection et analyse de l'architecture
  -e, --explain           Explication IA de l'architecture (requiert Ollama)
  -m, --model <model>     Modèle Ollama à utiliser (defaut: llama3.2)

${chalk.bold('Exemples:')}
  bun run analyze.ts ./mon-projet
  bun run analyze.ts ./mon-projet -3d -s
  bun run analyze.ts /chemin/projet -o ./docs/arch.html --security
  bun run analyze.ts ../projet --three --deep --verbose
  ${chalk.cyan('bun run analyze.ts ./projet --arch --explain')}
  ${chalk.cyan('bun run analyze.ts ./projet -a -e -m codellama')}
`);
    process.exit(0);
  }

  // Parse arguments
  let codebasePath = args[0];
  const options: AnalyzeOptions = {
    output: './output/visualization.html',
    mode: '2d',
    security: false,
    cve: false,
    deep: false,
    verbose: false,
    arch: false,
    explain: false,
    aiModel: 'deepseek-v3.1:671b'
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '-3d':
      case '--three':
        options.mode = '3d';
        break;
      case '-s':
      case '--security':
        options.security = true;
        break;
      case '-c':
      case '--cve':
        options.cve = true;
        break;
      case '-d':
      case '--deep':
        options.deep = true;
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '-a':
      case '--arch':
        options.arch = true;
        break;
      case '-e':
      case '--explain':
        options.explain = true;
        options.arch = true; // --explain implique --arch
        break;
      case '-m':
      case '--model':
        options.aiModel = args[++i];
        break;
    }
  }

  // Validate paths
  codebasePath = path.resolve(codebasePath);

  if (!fs.existsSync(codebasePath)) {
    console.error(chalk.red(`Erreur: Le chemin '${codebasePath}' n'existe pas.`));
    process.exit(1);
  }

  if (!fs.statSync(codebasePath).isDirectory()) {
    console.error(chalk.red(`Erreur: '${codebasePath}' n'est pas un repertoire.`));
    process.exit(1);
  }

  console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║         Quantum Viz - Analyseur d\'Architecture            ║'));
  console.log(chalk.bold.cyan('║         Multi-niveaux L1-L7 + Sécurité Adversariale       ║'));
  console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════╝\n'));

  try {
    // Phase 1: Analyze codebase structure
    console.log(chalk.bold.yellow('━━━ Phase 1: Analyse Structurelle ━━━\n'));
    const analyzer = new CodebaseAnalyzer(codebasePath);
    const result = await analyzer.analyze();

    // Phase 2: Security analysis (if enabled)
    let securityReport: SecurityReport | undefined;
    if (options.security) {
      console.log(chalk.bold.yellow('\n━━━ Phase 2: Analyse de Sécurité Adversariale ━━━\n'));
      const securityAnalyzer = new SecurityAnalyzer();
      securityReport = await securityAnalyzer.analyzeFiles(
        result.files,
        codebasePath,
        (filePath) => fs.readFileSync(filePath, 'utf-8')
      );

      printSecuritySummary(securityReport, options.verbose);
    }

    // Phase 3: CVE Scan (if enabled)
    let cveResults: CVEScanResult[] | undefined;
    if (options.cve) {
      console.log(chalk.bold.yellow('\n━━━ Phase 3: Scan CVE des Dépendances (OSV.dev) ━━━\n'));
      const cveScanner = new CVEScanner();
      cveResults = await cveScanner.scanDirectory(codebasePath);

      printCVESummary(cveResults, options.verbose);
    }

    // Phase 4: Architecture Analysis (if enabled)
    let archResult: ArchitectureAnalysisResult | undefined;
    if (options.arch) {
      console.log(chalk.bold.yellow('\n━━━ Phase 4: Analyse d\'Architecture ━━━\n'));
      archResult = await analyzeArchitecture(result, codebasePath, options);
      printArchitectureSummary(archResult, options.verbose);
    }

    // Print structural statistics
    console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold('\n📊 Statistiques:\n'));
    console.log(`  ${chalk.cyan('Fichiers analyses:')} ${result.stats.totalFiles}`);
    console.log(`  ${chalk.cyan('Lignes de code:')} ${result.stats.totalLines.toLocaleString()}`);
    console.log(`  ${chalk.cyan('Composants identifies:')} ${result.nodes.length.toLocaleString()}`);
    console.log(`  ${chalk.cyan('Relations detectees:')} ${result.edges.length.toLocaleString()}`);

    console.log(chalk.bold('\n📁 Par langage:'));
    Object.entries(result.stats.byLanguage)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .forEach(([lang, count]) => {
        console.log(`  ${chalk.yellow(lang.padEnd(12))}: ${count} fichiers`);
      });

    console.log(chalk.bold('\n🏗️  Par couche:'));
    Object.entries(result.stats.byLayer)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .forEach(([layer, count]) => {
        console.log(`  ${chalk.green(layer.padEnd(12))}: ${count} fichiers`);
      });

    console.log(chalk.bold('\n🧩 Par niveau de granularité:'));
    Object.entries(result.stats.byLevel)
      .filter(([_, count]) => count > 0)
      .forEach(([level, count]) => {
        const bar = '█'.repeat(Math.min(30, Math.floor(count / 100)));
        console.log(`  ${chalk.blue(level.padEnd(4))}: ${count.toString().padStart(6)} ${chalk.gray(bar)}`);
      });

    console.log(chalk.bold('\n🔍 Composants par type:'));
    const typeCount = new Map<string, number>();
    result.nodes.forEach(n => {
      typeCount.set(n.type, (typeCount.get(n.type) || 0) + 1);
    });
    Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([type, count]) => {
        console.log(`  ${chalk.magenta(type.padEnd(14))}: ${count}`);
      });

    // Issues summary
    if (result.issues.length > 0 || (securityReport && securityReport.vulnerabilities.length > 0)) {
      console.log(chalk.bold('\n⚠️  Problèmes détectés:'));

      const issueCounts = {
        error: 0,
        warning: 0,
        info: 0
      };

      result.issues.forEach(issue => {
        issueCounts[issue.severity]++;
      });

      if (issueCounts.error > 0) {
        console.log(`  ${chalk.red('●')} Erreurs: ${issueCounts.error}`);
      }
      if (issueCounts.warning > 0) {
        console.log(`  ${chalk.yellow('●')} Warnings: ${issueCounts.warning}`);
      }
      if (issueCounts.info > 0) {
        console.log(`  ${chalk.blue('●')} Info: ${issueCounts.info}`);
      }

      if (options.verbose) {
        console.log(chalk.gray('\n  Top 10 problèmes:'));
        result.issues
          .sort((a, b) => {
            const order = { error: 0, warning: 1, info: 2 };
            return order[a.severity] - order[b.severity];
          })
          .slice(0, 10)
          .forEach(issue => {
            const color = issue.severity === 'error' ? chalk.red :
                          issue.severity === 'warning' ? chalk.yellow : chalk.blue;
            console.log(`    ${color('•')} [${issue.type}] ${issue.message.substring(0, 60)}...`);
            console.log(`      ${chalk.gray(issue.location.file)}:${issue.location.line}`);
          });
      }
    }

    // Generate visualization
    console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold(`\n🎨 Generation de la visualisation ${options.mode.toUpperCase()}...\n`));

    let html: string;
    if (options.mode === '3d') {
      html = generate3DVisualization(result, securityReport);
    } else {
      html = generateVisualization(result);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(path.resolve(options.output));
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write output
    const resolvedOutputPath = path.resolve(options.output);
    fs.writeFileSync(resolvedOutputPath, html);

    // Also save JSON data for external tools
    const jsonPath = resolvedOutputPath.replace('.html', '.json');
    fs.writeFileSync(jsonPath, JSON.stringify({
      meta: result.meta,
      stats: result.stats,
      nodes: result.nodes,
      edges: result.edges,
      callGraph: result.callGraph,
      dataFlows: result.dataFlows,
      issues: result.issues,
      security: securityReport,
      cve: cveResults,
      architecture: archResult ? {
        pattern: archResult.detection.pattern.name,
        confidence: archResult.detection.confidence,
        violations: archResult.detection.violations,
        classification: archResult.classification.stats,
        flows: archResult.flows.flows.map(f => ({
          name: f.name,
          type: f.type,
          layers: f.layers,
          stepsCount: f.steps.length
        })),
        explanation: archResult.explanation
      } : undefined
    }, null, 2));

    console.log(chalk.green('✓ Visualisation générée avec succès!'));
    console.log(chalk.cyan(`\n📁 Fichiers générés:`));
    console.log(`   HTML: ${resolvedOutputPath}`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(chalk.gray(`\nOuvrez le fichier HTML dans un navigateur pour explorer l'architecture.\n`));

    // Print feature summary
    console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════'));
    console.log(chalk.bold('Fonctionnalités de la visualisation:'));
    console.log(chalk.gray('─────────────────────────────────────────────────────────────'));
    if (options.mode === '3d') {
      console.log('  🌐 Rendu 3D avec Three.js + post-processing Bloom');
      console.log('  ⚡ Animation de flux de données style réseau neuronal');
      console.log('  🔍 Drill-down multi-niveaux par double-clic');
      console.log('  🎮 Contrôles: Molette=Zoom, Glisser=Rotation, 1-7=Niveaux');
    } else {
      console.log('  📊 Visualisation 2D avec Cytoscape.js');
      console.log('  🔍 Navigation multi-niveaux L1-L7');
    }
    console.log('  🔎 Recherche par nom de composant');
    console.log('  📋 Panneau de détails avec métriques');
    console.log('  ⚠️  Liste des issues avec navigation');
    if (options.security) {
      console.log('  🔒 Analyse de sécurité avec vulnérabilités OWASP');
    }
    if (options.arch) {
      console.log('  🏛️  Détection de pattern architectural (MVC, Clean, Hexagonal...)');
      console.log('  📊 Classification des fichiers par couche');
      console.log('  🔀 Analyse des flux de données');
      if (options.explain) {
        console.log('  🤖 Explication IA de l\'architecture via Ollama');
      }
    }
    console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Erreur lors de l\'analyse:'), error);
    process.exit(1);
  }
}

function printSecuritySummary(report: SecurityReport, verbose: boolean) {
  const { summary } = report;
  const total = summary.critical + summary.high + summary.medium + summary.low + summary.info;

  console.log(`  ${chalk.bold('Vulnérabilités détectées:')} ${total}\n`);

  if (summary.critical > 0) {
    console.log(`  ${chalk.bgRed.white.bold(' CRITICAL ')} ${summary.critical} vulnérabilité(s) critique(s)`);
  }
  if (summary.high > 0) {
    console.log(`  ${chalk.bgRed.white(' HIGH ')}     ${summary.high} vulnérabilité(s) haute(s)`);
  }
  if (summary.medium > 0) {
    console.log(`  ${chalk.bgYellow.black(' MEDIUM ')}  ${summary.medium} vulnérabilité(s) moyenne(s)`);
  }
  if (summary.low > 0) {
    console.log(`  ${chalk.bgBlue.white(' LOW ')}      ${summary.low} vulnérabilité(s) basse(s)`);
  }
  if (summary.info > 0) {
    console.log(`  ${chalk.bgGray.white(' INFO ')}     ${summary.info} informations`);
  }

  // Attack surface summary
  const as = report.attackSurface;
  console.log(chalk.bold('\n  Surface d\'attaque:'));
  console.log(`    Endpoints HTTP: ${as.endpoints.length}`);
  console.log(`    Points d'entrée: ${as.inputPoints.length}`);
  console.log(`    Appels externes: ${as.externalCalls.length}`);
  console.log(`    Opérations DB: ${as.databaseOperations.length}`);
  console.log(`    Opérations fichier: ${as.fileOperations.length}`);
  console.log(`    Exécutions processus: ${as.processExecutions.length}`);

  // Secrets found
  if (report.secretsFound.length > 0) {
    console.log(chalk.bold.red(`\n  ⚠️  ${report.secretsFound.length} secrets potentiels détectés!`));
  }

  if (verbose) {
    // Print top vulnerabilities
    console.log(chalk.bold('\n  Top vulnérabilités:'));
    report.vulnerabilities.slice(0, 10).forEach(v => {
      const color = v.severity === 'critical' ? chalk.red :
                    v.severity === 'high' ? chalk.yellow :
                    v.severity === 'medium' ? chalk.cyan : chalk.gray;
      console.log(`    ${color('●')} [${v.severity.toUpperCase()}] ${v.title}`);
      console.log(`      ${chalk.gray(v.location.file)}:${v.location.line}`);
      if (v.cwe) console.log(`      ${chalk.gray(`CWE: ${v.cwe}`)}`);
    });

    // Print by category
    console.log(chalk.bold('\n  Par catégorie:'));
    Object.entries(report.byCategory)
      .filter(([_, vulns]) => vulns.length > 0)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([category, vulns]) => {
        console.log(`    ${category.padEnd(20)}: ${vulns.length}`);
      });
  }
}

function printCVESummary(results: CVEScanResult[], verbose: boolean) {
  results.forEach(result => {
    console.log(`  ${chalk.bold(`📦 ${result.ecosystem.toUpperCase()} Dependencies`)}`);
    console.log(`    Scanned: ${result.totalDependencies} packages`);
    console.log(`    Vulnerable: ${result.vulnerableDependencies} packages\n`);

    const s = result.summary;
    if (s.critical > 0) {
      console.log(`    ${chalk.bgRed.white.bold(' CRITICAL ')} ${s.critical} vulnérabilité(s) critique(s)`);
    }
    if (s.high > 0) {
      console.log(`    ${chalk.bgRed.white(' HIGH ')}     ${s.high} vulnérabilité(s) haute(s)`);
    }
    if (s.medium > 0) {
      console.log(`    ${chalk.bgYellow.black(' MEDIUM ')}  ${s.medium} vulnérabilité(s) moyenne(s)`);
    }
    if (s.low > 0) {
      console.log(`    ${chalk.bgBlue.white(' LOW ')}      ${s.low} vulnérabilité(s) basse(s)`);
    }

    if (verbose && result.vulnerabilities.length > 0) {
      console.log(chalk.bold('\n    Top dépendances vulnérables:'));
      result.vulnerabilities.slice(0, 10).forEach(dv => {
        console.log(`\n    ${chalk.yellow(dv.dependency.name)}@${chalk.gray(dv.dependency.version)}`);
        dv.vulnerabilities.forEach(v => {
          const color = v.severity === 'critical' ? chalk.red :
                        v.severity === 'high' ? chalk.yellow :
                        v.severity === 'medium' ? chalk.cyan : chalk.gray;
          const cvss = v.cvss ? ` (CVSS: ${v.cvss})` : '';
          console.log(`      ${color('●')} [${v.severity.toUpperCase()}] ${v.id}${cvss}`);
          console.log(`        ${v.summary.substring(0, 80)}...`);
          if (v.fixed && v.fixed.length > 0) {
            console.log(`        ${chalk.green('Fixed in:')} ${v.fixed.join(', ')}`);
          }
        });
      });
    }
  });
}

// =============================================================================
// ARCHITECTURE ANALYSIS
// =============================================================================

async function analyzeArchitecture(
  result: { files: Array<{ path: string; imports?: Array<{ source: string }>; exports?: string[] }>; edges: Array<{ source: string; target: string; type: string }> },
  projectRoot: string,
  options: AnalyzeOptions
): Promise<ArchitectureAnalysisResult> {
  // Créer le contexte de détection
  const detectionContext = createDetectionContext(
    {
      files: result.files.map(f => ({
        path: f.path,
        imports: f.imports?.map(i => i.source) || [],
        exports: f.exports || []
      }))
    },
    projectRoot
  );

  // Initialiser le client Ollama si nécessaire
  let aiClient: OllamaClient | undefined;
  if (options.explain) {
    console.log(chalk.gray('  Vérification de la disponibilité d\'Ollama...'));
    const available = await isOllamaAvailable();
    if (available) {
      aiClient = new OllamaClient({ model: options.aiModel });
      console.log(chalk.green(`  ✓ Ollama disponible (modèle: ${options.aiModel})`));
    } else {
      console.log(chalk.yellow('  ⚠ Ollama non disponible, explication IA désactivée'));
    }
  }

  // Phase 4.1: Détection du pattern
  console.log(chalk.gray('\n  [4.1] Détection du pattern architectural...'));
  const detector = new ArchitectureDetector({
    useAI: !!aiClient,
    aiClient,
    minConfidence: 30,
    detectViolations: true
  });
  const detectionResults = await detector.detect(detectionContext);

  if (detectionResults.length === 0) {
    throw new Error('Aucun pattern architectural détecté');
  }

  const detection = detectionResults[0];
  console.log(chalk.green(`  ✓ Pattern détecté: ${chalk.bold(detection.pattern.name)} (${detection.confidence}% confiance)`));

  // Phase 4.2: Classification des fichiers
  console.log(chalk.gray('\n  [4.2] Classification des fichiers par couche...'));
  const classifier = new ArchitectureClassifier({
    useAI: !!aiClient,
    aiClient,
    aiBatchSize: 10
  });
  const classification = await classifier.classify(
    result.files.map(f => ({
      path: f.path,
      imports: f.imports?.map(i => i.source) || [],
      exports: f.exports || []
    })),
    detection
  );
  console.log(chalk.green(`  ✓ ${classification.stats.classifiedFiles}/${classification.stats.totalFiles} fichiers classifiés (${classification.stats.classificationRate}%)`));

  // Phase 4.3: Analyse des flux
  console.log(chalk.gray('\n  [4.3] Analyse des flux de données...'));
  const flowAnalyzer = new FlowAnalyzer({
    useAI: !!aiClient,
    aiClient,
    detectCycles: true,
    maxFlowDepth: 20
  });
  const flows = await flowAnalyzer.analyze(
    classification,
    detection,
    result.edges.map(e => ({ source: e.source, target: e.target, type: e.type }))
  );
  console.log(chalk.green(`  ✓ ${flows.flows.length} flux de données identifiés`));

  // Phase 4.4: Explication IA (si activée)
  let explanation: ArchitectureExplanation | undefined;
  if (options.explain && aiClient) {
    console.log(chalk.gray('\n  [4.4] Génération de l\'explication IA...'));
    const explainer = createArchitectureExplainer(aiClient, {
      language: 'fr',
      detailLevel: options.verbose ? 'detailed' : 'normal'
    });
    explanation = await explainer.explain(detection, classification, flows);
    console.log(chalk.green('  ✓ Explication générée'));
  }

  return {
    detection,
    classification,
    flows,
    explanation
  };
}

function printArchitectureSummary(result: ArchitectureAnalysisResult, verbose: boolean) {
  const { detection, classification, flows, explanation } = result;

  // Pattern détecté
  console.log(chalk.bold('\n  🏛️  Pattern Architectural:'));
  console.log(`    Pattern: ${chalk.bold.cyan(detection.pattern.name)}`);
  console.log(`    Confiance: ${getConfidenceColor(detection.confidence)}${detection.confidence}%${chalk.reset}`);
  console.log(`    Description: ${chalk.gray(detection.pattern.description)}`);

  // Distribution par couche
  console.log(chalk.bold('\n  📊 Distribution par couche:'));
  detection.pattern.layers.forEach(layer => {
    const count = classification.byLayer.get(layer.name)?.length || 0;
    const bar = '█'.repeat(Math.min(20, Math.ceil(count / 5)));
    console.log(`    ${chalk.hex(layer.color)(layer.name.padEnd(15))}: ${count.toString().padStart(4)} fichiers ${chalk.gray(bar)}`);
  });

  // Flux de données
  console.log(chalk.bold('\n  🔀 Flux de données:'));
  console.log(`    Total: ${flows.flows.length} flux identifiés`);
  console.log(`    Longueur moyenne: ${flows.metrics.avgFlowLength} étapes`);
  if (flows.metrics.cyclicDependencies > 0) {
    console.log(`    ${chalk.yellow('⚠ Dépendances cycliques:')} ${flows.metrics.cyclicDependencies}`);
  }

  // Violations
  if (detection.violations.length > 0) {
    console.log(chalk.bold.yellow(`\n  ⚠️  Violations architecturales: ${detection.violations.length}`));
    if (verbose) {
      detection.violations.slice(0, 10).forEach(v => {
        const color = v.severity === 'error' ? chalk.red : chalk.yellow;
        console.log(`    ${color('●')} ${v.sourceLayer} → ${v.targetLayer}`);
        console.log(`      ${chalk.gray(v.message)}`);
      });
    }
  } else {
    console.log(chalk.green('\n  ✅ Aucune violation architecturale détectée'));
  }

  // Explication IA
  if (explanation) {
    console.log(chalk.bold.cyan('\n  🤖 Analyse IA:'));
    console.log(chalk.gray('  ─────────────────────────────────────────'));

    // Résumé
    console.log(`\n  ${chalk.white(explanation.summary)}`);

    // Score qualité
    const q = explanation.codeQuality;
    console.log(chalk.bold('\n  📈 Score de qualité:'));
    console.log(`    Global: ${getScoreBar(q.overallScore)} ${q.overallScore}%`);
    if (verbose) {
      console.log(`    Séparation: ${getScoreBar(q.separation)} ${q.separation}%`);
      console.log(`    Cohésion: ${getScoreBar(q.cohesion)} ${q.cohesion}%`);
      console.log(`    Couplage: ${getScoreBar(q.coupling)} ${q.coupling}%`);
      console.log(`    Testabilité: ${getScoreBar(q.testability)} ${q.testability}%`);
    }

    // Recommandations
    if (explanation.recommendations.length > 0) {
      console.log(chalk.bold('\n  💡 Recommandations:'));
      explanation.recommendations.slice(0, 5).forEach(r => {
        const icon = r.type === 'warning' ? '⚠️' :
                     r.type === 'improvement' ? '💡' :
                     r.type === 'refactoring' ? '🔧' : '✨';
        const priorityColor = r.priority === 'high' ? chalk.red :
                              r.priority === 'medium' ? chalk.yellow : chalk.gray;
        console.log(`    ${icon} ${priorityColor(`[${r.priority.toUpperCase()}]`)} ${r.title}`);
        if (verbose) {
          console.log(`       ${chalk.gray(r.description)}`);
        }
      });
    }
  }
}

function getConfidenceColor(confidence: number): chalk.Chalk {
  if (confidence >= 80) return chalk.green;
  if (confidence >= 60) return chalk.yellow;
  return chalk.red;
}

function getScoreBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  const color = score >= 70 ? chalk.green :
                score >= 50 ? chalk.yellow : chalk.red;
  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

main();
