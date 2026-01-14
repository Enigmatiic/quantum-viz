// =============================================================================
// CLI PARSER - Parsing des arguments de la ligne de commande
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { type AnalyzeOptions, getDefaultOptions } from './config';

export interface ParseResult {
  codebasePath: string;
  options: AnalyzeOptions;
}

/**
 * Affiche l'aide de la CLI
 */
export function printHelp(): void {
  console.log(`
${chalk.bold.cyan('Quantum Viz')} - Outil de visualisation d'architecture de codebase
${chalk.gray('Analyse multi-niveaux L1-L7 avec detection de vulnerabilites')}

${chalk.bold('Usage:')}
  bun run analyze.ts <chemin-vers-codebase> [options]

${chalk.bold('Options:')}
  -o, --output <fichier>  Fichier de sortie (defaut: ./output/visualization.html)
  -3d, --three            Mode visualisation 3D avec Three.js (defaut: 2D)
  -s, --security          Analyse de securite adversariale
  -c, --cve               Scan des dependances pour CVE connues (OSV.dev)
  -d, --deep              Analyse en profondeur maximale (L8+)
  -v, --verbose           Affichage detaille
  -h, --help              Afficher cette aide

${chalk.bold.cyan('Options Architecture:')}
  -a, --arch              Detection et analyse de l'architecture
  -e, --explain           Explication IA de l'architecture (requiert Ollama)
  -m, --model <model>     Modele Ollama a utiliser (defaut: llama3.2)

${chalk.bold('Exemples:')}
  bun run analyze.ts ./mon-projet
  bun run analyze.ts ./mon-projet -3d -s
  bun run analyze.ts /chemin/projet -o ./docs/arch.html --security
  bun run analyze.ts ../projet --three --deep --verbose
  ${chalk.cyan('bun run analyze.ts ./projet --arch --explain')}
  ${chalk.cyan('bun run analyze.ts ./projet -a -e -m codellama')}
`);
}

/**
 * Parse les arguments de la ligne de commande
 */
export function parseArgs(args: string[]): ParseResult | null {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return null;
  }

  const options = getDefaultOptions();
  let codebasePath = args[0];

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
        options.arch = true;
        break;
      case '-m':
      case '--model':
        options.aiModel = args[++i];
        break;
    }
  }

  // Validate path
  codebasePath = path.resolve(codebasePath);

  if (!fs.existsSync(codebasePath)) {
    console.error(chalk.red(`Erreur: Le chemin '${codebasePath}' n'existe pas.`));
    process.exit(1);
  }

  if (!fs.statSync(codebasePath).isDirectory()) {
    console.error(chalk.red(`Erreur: '${codebasePath}' n'est pas un repertoire.`));
    process.exit(1);
  }

  return { codebasePath, options };
}

/**
 * Affiche le header de la CLI
 */
export function printHeader(): void {
  console.log(chalk.bold.cyan('\n==========================================================='));
  console.log(chalk.bold.cyan('         Quantum Viz - Analyseur d\'Architecture            '));
  console.log(chalk.bold.cyan('         Multi-niveaux L1-L7 + Securite Adversariale       '));
  console.log(chalk.bold.cyan('===========================================================\n'));
}
