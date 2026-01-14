#!/usr/bin/env bun

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { CodebaseAnalyzer } from './src/analyzer';
import { generateVisualization } from './src/visualizer';
import { generate3DVisualization } from './src/visualizer-3d';
import { SecurityAnalyzer, type EnhancedSecurityReport } from './src/enhanced-security-pipeline';
import type { AnalysisResult, FileInfo } from './src/types';
import { CVEScanner } from './src/cve-scanner';
import type { CVEScanResult } from './src/cve-scanner';

// Architecture Analysis
import {
  ArchitectureDetector,
  ArchitectureClassifier,
  FlowAnalyzer,
  createDetectionContext,
} from './src/architecture';
import {
  OllamaClient,
  isOllamaAvailable,
  createArchitectureExplainer,
  RECOMMENDED_MODELS
} from './src/ai';

// CLI Module
import {
  parseArgs,
  printHeader,
  getAIConfig,
  printAIConfig,
  formatProvider,
  printSecuritySummary,
  printCVESummary,
  printArchitectureSummary,
  printStatistics,
  printIssuesSummary,
  printFeatureSummary,
  type AnalyzeOptions,
  type AIModuleConfig,
  type ArchitectureAnalysisResult,
} from './src/cli';

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (!parsed) {
    process.exit(0);
  }

  const { codebasePath, options } = parsed;

  printHeader();

  try {
    // Phase 1: Analyze codebase structure
    console.log(chalk.bold.yellow('--- Phase 1: Analyse Structurelle ---\n'));
    const analyzer = new CodebaseAnalyzer(codebasePath);
    const result = await analyzer.analyze();

    const aiConfig = getAIConfig();
    printAIConfig(aiConfig, options.verbose);

    // Phase 2: Security analysis (if enabled)
    let securityReport: EnhancedSecurityReport | undefined;
    if (options.security) {
      console.log(chalk.bold.yellow('\n--- Phase 2: Analyse de Securite Amelioree (AST + AI) ---\n'));
      securityReport = await runSecurityAnalysis(result, codebasePath, options, aiConfig);
      printSecuritySummary(securityReport, options.verbose);
    }

    // Phase 3: CVE Scan (if enabled)
    let cveResults: CVEScanResult[] | undefined;
    if (options.cve) {
      console.log(chalk.bold.yellow('\n--- Phase 3: Scan CVE des Dependances (OSV.dev) ---\n'));
      const cveScanner = new CVEScanner();
      cveResults = await cveScanner.scanDirectory(codebasePath);
      printCVESummary(cveResults, options.verbose);
    }

    // Phase 4: Architecture Analysis (if enabled)
    let archResult: ArchitectureAnalysisResult | undefined;
    if (options.arch) {
      console.log(chalk.bold.yellow('\n--- Phase 4: Analyse d\'Architecture ---\n'));
      archResult = await analyzeArchitecture(result, codebasePath, options, aiConfig);
      printArchitectureSummary(archResult, options.verbose);
    }

    // Print statistics
    printStatistics(result as any, options.verbose);
    printIssuesSummary(result as any, options.verbose);

    // Generate visualization
    console.log(chalk.gray('\n---------------------------------------------'));
    console.log(chalk.bold(`\n Generation de la visualisation ${options.mode.toUpperCase()}...\n`));

    const html = options.mode === '3d'
      ? generate3DVisualization(result, securityReport)
      : generateVisualization(result);

    // Ensure output directory exists
    const outputDir = path.dirname(path.resolve(options.output));
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write output
    const resolvedOutputPath = path.resolve(options.output);
    fs.writeFileSync(resolvedOutputPath, html);

    // Save JSON data
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

    console.log(chalk.green(' Visualisation generee avec succes!'));
    console.log(chalk.cyan(`\n Fichiers generes:`));
    console.log(`   HTML: ${resolvedOutputPath}`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(chalk.gray(`\nOuvrez le fichier HTML dans un navigateur pour explorer l'architecture.\n`));

    printFeatureSummary(options.mode, options);

  } catch (error) {
    console.error(chalk.red('\n Erreur lors de l\'analyse:'), error);
    process.exit(1);
  }
}

// =============================================================================
// SECURITY ANALYSIS
// =============================================================================

async function runSecurityAnalysis(
  result: AnalysisResult,
  codebasePath: string,
  options: AnalyzeOptions,
  aiConfig: AIModuleConfig
): Promise<EnhancedSecurityReport> {
  const securityProvider = aiConfig.security;
  let apiKey: string | undefined;
  let aiProvider: 'anthropic' | 'openai' = 'anthropic';

  if (securityProvider === 'anthropic') {
    apiKey = process.env.ANTHROPIC_API_KEY;
    aiProvider = 'anthropic';
  } else if (securityProvider === 'openai') {
    apiKey = process.env.OPENAI_API_KEY;
    aiProvider = 'openai';
  }

  const aiEnabled = securityProvider !== 'none' && !!apiKey && process.env.AI_SECURITY_ENABLED !== 'false';

  if (aiEnabled) {
    console.log(chalk.green(`   Validation AI activee (${formatProvider(securityProvider)})`));
  } else if (securityProvider === 'none') {
    console.log(chalk.gray('   Validation AI desactivee par configuration'));
  } else {
    console.log(chalk.gray(`   Validation AI desactivee (configurez ${securityProvider.toUpperCase()}_API_KEY dans .env)`));
  }

  const securityAnalyzer = new SecurityAnalyzer({
    enableASTFiltering: true,
    enableAIValidation: aiEnabled,
    ai: {
      apiKey: apiKey,
      provider: aiProvider,
      model: aiProvider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4',
      maxTokens: 4000,
      temperature: 0.2,
      timeout: 60000,
      batchSize: 5,
      rateLimitMs: 200,
      enableDataFlowAnalysis: true,
      enableASTAnalysis: true,
    },
    thresholds: {
      astConfidenceToFilter: 0.85,
      aiConfidenceToFilter: 0.80,
      maxVulnsForAIValidation: parseInt(process.env.MAX_VULNS_FOR_AI || '50', 10),
    },
    onProgress: (stage, current, total) => {
      if (options.verbose) {
        const stages: Record<string, string> = {
          'base_analysis': 'Detection regex',
          'ast_filtering': 'Filtrage AST',
          'ai_validation': 'Validation AI',
        };
        process.stdout.write(`\r  ${chalk.gray(`[${stages[stage] || stage}] ${current}/${total}`)}`);
      }
    }
  });

  return securityAnalyzer.analyzeFiles(
    result.files,
    codebasePath,
    (filePath) => fs.readFileSync(filePath, 'utf-8')
  );
}

// =============================================================================
// ARCHITECTURE ANALYSIS
// =============================================================================

async function analyzeArchitecture(
  result: AnalysisResult,
  projectRoot: string,
  options: AnalyzeOptions,
  aiConfig: AIModuleConfig
): Promise<ArchitectureAnalysisResult> {
  const detectionContext = createDetectionContext(
    {
      files: result.files.map(f => ({
        path: f.path,
        imports: f.imports?.map(i => i.source || i.module) || [],
        exports: f.exports?.map(e => e.name) || []
      }))
    },
    projectRoot
  );

  const useOllamaForArch = aiConfig.architecture === 'ollama';
  const useOllamaForClassification = aiConfig.classification === 'ollama';
  const useOllamaForFlow = aiConfig.flow === 'ollama';
  const needsOllama = options.explain || useOllamaForArch || useOllamaForClassification || useOllamaForFlow;

  let aiClient: OllamaClient | undefined;
  if (needsOllama) {
    console.log(chalk.gray('  Verification de la disponibilite d\'Ollama...'));
    const available = await isOllamaAvailable();
    if (available) {
      const tempClient = new OllamaClient();
      const availableModels = await tempClient.listModels();

      let selectedModel = options.aiModel;
      const hasRequestedModel = availableModels.some(m =>
        m.name === options.aiModel || m.name.startsWith(`${options.aiModel}:`)
      );

      if (!hasRequestedModel) {
        const alternativeModel = RECOMMENDED_MODELS.find(rec =>
          availableModels.some(m => m.name === rec.name || m.name.startsWith(`${rec.name}:`))
        );

        if (alternativeModel) {
          const actualModel = availableModels.find(m =>
            m.name === alternativeModel.name || m.name.startsWith(`${alternativeModel.name}:`)
          );
          selectedModel = actualModel?.name || alternativeModel.name;
          console.log(chalk.yellow(`   Modele '${options.aiModel}' non trouve, utilisation de '${selectedModel}'`));
        } else if (availableModels.length > 0) {
          selectedModel = availableModels[0].name;
          console.log(chalk.yellow(`   Modele '${options.aiModel}' non trouve, utilisation de '${selectedModel}'`));
        } else {
          console.log(chalk.yellow('   Aucun modele Ollama disponible'));
          console.log(chalk.gray('    Installez un modele avec: ollama pull llama3.2'));
        }
      }

      if (hasRequestedModel || availableModels.length > 0) {
        aiClient = new OllamaClient({ model: selectedModel });
        console.log(chalk.green(`   Ollama disponible (modele: ${selectedModel})`));
      }
    } else {
      console.log(chalk.yellow('   Ollama non disponible'));
      console.log(chalk.gray('    Demarrez Ollama avec: ollama serve'));
    }
  }

  // Phase 4.1: Pattern detection
  const useAIForDetection = aiConfig.architecture === 'ollama' && !!aiClient;
  console.log(chalk.gray(`\n  [4.1] Detection du pattern architectural${useAIForDetection ? ' (IA)' : ''}...`));
  const detector = new ArchitectureDetector({
    useAI: useAIForDetection,
    aiClient: useAIForDetection ? aiClient : undefined,
    minConfidence: 30,
    detectViolations: true
  });
  const detectionResults = await detector.detect(detectionContext);

  if (detectionResults.length === 0) {
    throw new Error('Aucun pattern architectural detecte');
  }

  const detection = detectionResults[0];
  console.log(chalk.green(`   Pattern detecte: ${chalk.bold(detection.pattern.name)} (${detection.confidence}% confiance)`));

  // Phase 4.2: File classification
  const useAIForClassification = aiConfig.classification === 'ollama' && !!aiClient;
  console.log(chalk.gray(`\n  [4.2] Classification des fichiers par couche${useAIForClassification ? ' (IA)' : ''}...`));
  const classifier = new ArchitectureClassifier({
    useAI: useAIForClassification,
    aiClient: useAIForClassification ? aiClient : undefined,
    aiBatchSize: 10
  });
  const classification = await classifier.classify(
    result.files.map(f => ({
      path: f.path,
      imports: f.imports?.map(i => i.source || i.module).filter((s): s is string => !!s) || [],
      exports: f.exports?.map(e => e.name) || []
    })),
    detection
  );
  console.log(chalk.green(`   ${classification.stats.classifiedFiles}/${classification.stats.totalFiles} fichiers classifies (${classification.stats.classificationRate}%)`));

  // Phase 4.3: Flow analysis
  const useAIForFlow = aiConfig.flow === 'ollama' && !!aiClient;
  console.log(chalk.gray(`\n  [4.3] Analyse des flux de donnees${useAIForFlow ? ' (IA)' : ''}...`));
  const flowAnalyzer = new FlowAnalyzer({
    useAI: useAIForFlow,
    aiClient: useAIForFlow ? aiClient : undefined,
    detectCycles: true,
    maxFlowDepth: 20
  });
  const flows = await flowAnalyzer.analyze(
    classification,
    detection,
    result.edges.map(e => ({ source: e.source, target: e.target, type: e.type }))
  );
  console.log(chalk.green(`   ${flows.flows.length} flux de donnees identifies`));

  // Phase 4.4: AI explanation (if enabled)
  let explanation;
  if (options.explain && aiClient) {
    console.log(chalk.gray('\n  [4.4] Generation de l\'explication IA...'));
    const explainer = createArchitectureExplainer(aiClient, {
      language: 'fr',
      detailLevel: options.verbose ? 'detailed' : 'normal'
    });
    explanation = await explainer.explain(detection, classification, flows);
    console.log(chalk.green('   Explication generee'));
  }

  return {
    detection,
    classification,
    flows,
    explanation
  };
}

main();
