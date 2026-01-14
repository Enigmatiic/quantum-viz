// =============================================================================
// CLI REPORTER - Fonctions d'affichage console
// =============================================================================

import chalk from 'chalk';
import type { EnhancedSecurityReport } from '../enhanced-security-pipeline';
import type { CVEScanResult } from '../cve-scanner';
import type { DetectionResult, ClassificationResult, FlowAnalysisResult } from '../architecture';
import type { ArchitectureExplanation } from '../ai';
import { formatProvider } from './config';

export interface ArchitectureAnalysisResult {
  detection: DetectionResult;
  classification: ClassificationResult;
  flows: FlowAnalysisResult;
  explanation?: ArchitectureExplanation;
}

// =============================================================================
// SECURITY SUMMARY
// =============================================================================

export function printSecuritySummary(report: EnhancedSecurityReport, verbose: boolean): void {
  const { summary, pipeline } = report;
  const total = summary.critical + summary.high + summary.medium + summary.low + summary.info;

  if (pipeline) {
    console.log(chalk.bold('  Pipeline de filtrage:'));
    console.log(`    Detections initiales (regex): ${chalk.yellow(pipeline.originalCount)}`);
    console.log(`    Apres filtrage AST: ${chalk.cyan(pipeline.afterASTFilter)} ${chalk.gray(`(-${pipeline.originalCount - pipeline.afterASTFilter} faux positifs)`)}`);
    if (pipeline.truePositivesConfirmed > 0) {
      console.log(`    Vrais positifs confirmes (AI): ${chalk.green(pipeline.truePositivesConfirmed)}`);
    }
    console.log(`    ${chalk.bold.green(`Faux positifs elimines: ${pipeline.falsePositivesRemoved} (${Math.round(pipeline.falsePositivesRemoved / pipeline.originalCount * 100)}%)`)}`);
    console.log(`    Temps de traitement: ${pipeline.processingTimeMs}ms\n`);
  }

  console.log(`  ${chalk.bold('Vulnerabilites finales:')} ${total}\n`);

  if (summary.critical > 0) {
    console.log(`  ${chalk.bgRed.white.bold(' CRITICAL ')} ${summary.critical} vulnerabilite(s) critique(s)`);
  }
  if (summary.high > 0) {
    console.log(`  ${chalk.bgRed.white(' HIGH ')}     ${summary.high} vulnerabilite(s) haute(s)`);
  }
  if (summary.medium > 0) {
    console.log(`  ${chalk.bgYellow.black(' MEDIUM ')}  ${summary.medium} vulnerabilite(s) moyenne(s)`);
  }
  if (summary.low > 0) {
    console.log(`  ${chalk.bgBlue.white(' LOW ')}      ${summary.low} vulnerabilite(s) basse(s)`);
  }
  if (summary.info > 0) {
    console.log(`  ${chalk.bgGray.white(' INFO ')}     ${summary.info} informations`);
  }

  const as = report.attackSurface;
  console.log(chalk.bold('\n  Surface d\'attaque:'));
  console.log(`    Endpoints HTTP: ${as.endpoints.length}`);
  console.log(`    Points d'entree: ${as.inputPoints.length}`);
  console.log(`    Appels externes: ${as.externalCalls.length}`);
  console.log(`    Operations DB: ${as.databaseOperations.length}`);
  console.log(`    Operations fichier: ${as.fileOperations.length}`);
  console.log(`    Executions processus: ${as.processExecutions.length}`);

  if (report.secretsFound.length > 0) {
    console.log(chalk.bold.red(`\n  ${report.secretsFound.length} secrets potentiels detectes!`));
  }

  if (verbose) {
    if (report.astFiltered && report.astFiltered.length > 0) {
      console.log(chalk.bold('\n  Faux positifs filtres par AST (top 5):'));
      report.astFiltered.slice(0, 5).forEach(({ vuln, reason }) => {
        console.log(`    ${chalk.gray('x')} [${vuln.severity.toUpperCase()}] ${vuln.title}`);
        console.log(`      ${chalk.gray(vuln.location.file)}:${vuln.location.line}`);
        console.log(`      ${chalk.green(`Raison: ${reason}`)}`);
      });
    }

    console.log(chalk.bold('\n  Top vulnerabilites restantes:'));
    report.vulnerabilities.slice(0, 10).forEach(v => {
      const color = v.severity === 'critical' ? chalk.red :
                    v.severity === 'high' ? chalk.yellow :
                    v.severity === 'medium' ? chalk.cyan : chalk.gray;
      console.log(`    ${color('*')} [${v.severity.toUpperCase()}] ${v.title}`);
      console.log(`      ${chalk.gray(v.location.file)}:${v.location.line}`);
      if (v.cwe) console.log(`      ${chalk.gray(`CWE: ${v.cwe}`)}`);
    });

    console.log(chalk.bold('\n  Par categorie:'));
    Object.entries(report.byCategory)
      .filter(([_, vulns]) => vulns.length > 0)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([category, vulns]) => {
        console.log(`    ${category.padEnd(20)}: ${vulns.length}`);
      });
  }
}

// =============================================================================
// CVE SUMMARY
// =============================================================================

export function printCVESummary(results: CVEScanResult[], verbose: boolean): void {
  results.forEach(result => {
    console.log(`  ${chalk.bold(`${result.ecosystem.toUpperCase()} Dependencies`)}`);
    console.log(`    Scanned: ${result.totalDependencies} packages`);
    console.log(`    Vulnerable: ${result.vulnerableDependencies} packages\n`);

    const s = result.summary;
    if (s.critical > 0) {
      console.log(`    ${chalk.bgRed.white.bold(' CRITICAL ')} ${s.critical} vulnerabilite(s) critique(s)`);
    }
    if (s.high > 0) {
      console.log(`    ${chalk.bgRed.white(' HIGH ')}     ${s.high} vulnerabilite(s) haute(s)`);
    }
    if (s.medium > 0) {
      console.log(`    ${chalk.bgYellow.black(' MEDIUM ')}  ${s.medium} vulnerabilite(s) moyenne(s)`);
    }
    if (s.low > 0) {
      console.log(`    ${chalk.bgBlue.white(' LOW ')}      ${s.low} vulnerabilite(s) basse(s)`);
    }

    if (verbose && result.vulnerabilities.length > 0) {
      console.log(chalk.bold('\n    Top dependances vulnerables:'));
      result.vulnerabilities.slice(0, 10).forEach(dv => {
        console.log(`\n    ${chalk.yellow(dv.dependency.name)}@${chalk.gray(dv.dependency.version)}`);
        dv.vulnerabilities.forEach(v => {
          const color = v.severity === 'critical' ? chalk.red :
                        v.severity === 'high' ? chalk.yellow :
                        v.severity === 'medium' ? chalk.cyan : chalk.gray;
          const cvss = v.cvss ? ` (CVSS: ${v.cvss})` : '';
          console.log(`      ${color('*')} [${v.severity.toUpperCase()}] ${v.id}${cvss}`);
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
// ARCHITECTURE SUMMARY
// =============================================================================

export function printArchitectureSummary(result: ArchitectureAnalysisResult, verbose: boolean): void {
  const { detection, classification, flows, explanation } = result;

  console.log(chalk.bold('\n  Pattern Architectural:'));
  console.log(`    Pattern: ${chalk.bold.cyan(detection.pattern.name)}`);
  console.log(`    Confiance: ${getConfidenceColor(detection.confidence)}${detection.confidence}%${chalk.reset}`);
  console.log(`    Description: ${chalk.gray(detection.pattern.description)}`);

  console.log(chalk.bold('\n  Distribution par couche:'));
  detection.pattern.layers.forEach(layer => {
    const count = classification.byLayer.get(layer.name)?.length || 0;
    const bar = '='.repeat(Math.min(20, Math.ceil(count / 5)));
    console.log(`    ${chalk.hex(layer.color)(layer.name.padEnd(15))}: ${count.toString().padStart(4)} fichiers ${chalk.gray(bar)}`);
  });

  console.log(chalk.bold('\n  Flux de donnees:'));
  console.log(`    Total: ${flows.flows.length} flux identifies`);
  console.log(`    Longueur moyenne: ${flows.metrics.avgFlowLength} etapes`);
  if (flows.metrics.cyclicDependencies > 0) {
    console.log(`    ${chalk.yellow('Dependances cycliques:')} ${flows.metrics.cyclicDependencies}`);
  }

  if (detection.violations.length > 0) {
    console.log(chalk.bold.yellow(`\n  Violations architecturales: ${detection.violations.length}`));
    if (verbose) {
      detection.violations.slice(0, 10).forEach(v => {
        const color = v.severity === 'error' ? chalk.red : chalk.yellow;
        console.log(`    ${color('*')} ${v.sourceLayer} -> ${v.targetLayer}`);
        console.log(`      ${chalk.gray(v.message)}`);
      });
    }
  } else {
    console.log(chalk.green('\n  Aucune violation architecturale detectee'));
  }

  if (explanation) {
    console.log(chalk.bold.cyan('\n  Analyse IA:'));
    console.log(chalk.gray('  -----------------------------------------'));

    console.log(`\n  ${chalk.white(explanation.summary)}`);

    const q = explanation.codeQuality;
    console.log(chalk.bold('\n  Score de qualite:'));
    console.log(`    Global: ${getScoreBar(q.overallScore)} ${q.overallScore}%`);
    if (verbose) {
      console.log(`    Separation: ${getScoreBar(q.separation)} ${q.separation}%`);
      console.log(`    Cohesion: ${getScoreBar(q.cohesion)} ${q.cohesion}%`);
      console.log(`    Couplage: ${getScoreBar(q.coupling)} ${q.coupling}%`);
      console.log(`    Testabilite: ${getScoreBar(q.testability)} ${q.testability}%`);
    }

    if (explanation.recommendations.length > 0) {
      console.log(chalk.bold('\n  Recommandations:'));
      explanation.recommendations.slice(0, 5).forEach(r => {
        const icon = r.type === 'warning' ? '[!]' :
                     r.type === 'improvement' ? '[+]' :
                     r.type === 'refactoring' ? '[R]' : '[*]';
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

// =============================================================================
// STATISTICS
// =============================================================================

export interface AnalysisResult {
  meta: { projectPath: string };
  stats: {
    totalFiles: number;
    totalLines: number;
    byLanguage: Record<string, number>;
    byLayer: Record<string, number>;
    byLevel: Record<string, number>;
  };
  nodes: Array<{ type: string }>;
  edges: Array<{ source: string; target: string }>;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    type: string;
    message: string;
    location: { file: string; line: number };
  }>;
}

export function printStatistics(result: AnalysisResult, verbose: boolean): void {
  console.log(chalk.gray('\n---------------------------------------------'));
  console.log(chalk.bold('\n Statistiques:\n'));
  console.log(`  ${chalk.cyan('Fichiers analyses:')} ${result.stats.totalFiles}`);
  console.log(`  ${chalk.cyan('Lignes de code:')} ${result.stats.totalLines.toLocaleString()}`);
  console.log(`  ${chalk.cyan('Composants identifies:')} ${result.nodes.length.toLocaleString()}`);
  console.log(`  ${chalk.cyan('Relations detectees:')} ${result.edges.length.toLocaleString()}`);

  console.log(chalk.bold('\n Par langage:'));
  Object.entries(result.stats.byLanguage)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .forEach(([lang, count]) => {
      console.log(`  ${chalk.yellow(lang.padEnd(12))}: ${count} fichiers`);
    });

  console.log(chalk.bold('\n Par couche:'));
  Object.entries(result.stats.byLayer)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .forEach(([layer, count]) => {
      console.log(`  ${chalk.green(layer.padEnd(12))}: ${count} fichiers`);
    });

  console.log(chalk.bold('\n Par niveau de granularite:'));
  Object.entries(result.stats.byLevel)
    .filter(([_, count]) => count > 0)
    .forEach(([level, count]) => {
      const bar = '='.repeat(Math.min(30, Math.floor(count / 100)));
      console.log(`  ${chalk.blue(level.padEnd(4))}: ${count.toString().padStart(6)} ${chalk.gray(bar)}`);
    });

  console.log(chalk.bold('\n Composants par type:'));
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
}

export function printIssuesSummary(result: AnalysisResult, verbose: boolean): void {
  if (result.issues.length === 0) return;

  console.log(chalk.bold('\n Problemes detectes:'));

  const issueCounts = { error: 0, warning: 0, info: 0 };
  result.issues.forEach(issue => {
    issueCounts[issue.severity]++;
  });

  if (issueCounts.error > 0) {
    console.log(`  ${chalk.red('*')} Erreurs: ${issueCounts.error}`);
  }
  if (issueCounts.warning > 0) {
    console.log(`  ${chalk.yellow('*')} Warnings: ${issueCounts.warning}`);
  }
  if (issueCounts.info > 0) {
    console.log(`  ${chalk.blue('*')} Info: ${issueCounts.info}`);
  }

  if (verbose) {
    console.log(chalk.gray('\n  Top 10 problemes:'));
    result.issues
      .sort((a, b) => {
        const order = { error: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      })
      .slice(0, 10)
      .forEach(issue => {
        const color = issue.severity === 'error' ? chalk.red :
                      issue.severity === 'warning' ? chalk.yellow : chalk.blue;
        console.log(`    ${color('*')} [${issue.type}] ${issue.message.substring(0, 60)}...`);
        console.log(`      ${chalk.gray(issue.location.file)}:${issue.location.line}`);
      });
  }
}

export function printFeatureSummary(mode: '2d' | '3d', options: { security: boolean; arch: boolean; explain: boolean }): void {
  console.log(chalk.bold.cyan('==========================================================='));
  console.log(chalk.bold('Fonctionnalites de la visualisation:'));
  console.log(chalk.gray('-----------------------------------------------------------'));
  if (mode === '3d') {
    console.log('  Rendu 3D avec Three.js + post-processing Bloom');
    console.log('  Animation de flux de donnees style reseau neuronal');
    console.log('  Drill-down multi-niveaux par double-clic');
    console.log('  Controles: Molette=Zoom, Glisser=Rotation, 1-7=Niveaux');
  } else {
    console.log('  Visualisation 2D avec Cytoscape.js');
    console.log('  Navigation multi-niveaux L1-L7');
  }
  console.log('  Recherche par nom de composant');
  console.log('  Panneau de details avec metriques');
  console.log('  Liste des issues avec navigation');
  if (options.security) {
    console.log('  Analyse de securite avec vulnerabilites OWASP');
  }
  if (options.arch) {
    console.log('  Detection de pattern architectural (MVC, Clean, Hexagonal...)');
    console.log('  Classification des fichiers par couche');
    console.log('  Analyse des flux de donnees');
    if (options.explain) {
      console.log('  Explication IA de l\'architecture via Ollama');
    }
  }
  console.log(chalk.bold.cyan('===========================================================\n'));
}

// =============================================================================
// HELPERS
// =============================================================================

function getConfidenceColor(confidence: number): typeof chalk.green {
  if (confidence >= 80) return chalk.green;
  if (confidence >= 60) return chalk.yellow;
  return chalk.red;
}

function getScoreBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  const color = score >= 70 ? chalk.green :
                score >= 50 ? chalk.yellow : chalk.red;
  return color('='.repeat(filled)) + chalk.gray('-'.repeat(empty));
}
