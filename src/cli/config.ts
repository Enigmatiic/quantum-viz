// =============================================================================
// CLI CONFIG - Configuration IA par module
// =============================================================================

import chalk from 'chalk';

export type AIProvider = 'ollama' | 'anthropic' | 'openai' | 'none';

export interface AIModuleConfig {
  security: AIProvider;
  architecture: AIProvider;
  classification: AIProvider;
  flow: AIProvider;
}

export interface AnalyzeOptions {
  output: string;
  mode: '2d' | '3d';
  security: boolean;
  cve: boolean;
  deep: boolean;
  verbose: boolean;
  arch: boolean;
  explain: boolean;
  aiModel: string;
}

/**
 * Recupere la configuration IA depuis les variables d'environnement
 */
export function getAIConfig(): AIModuleConfig {
  return {
    security: (process.env.AI_SECURITY_PROVIDER as AIProvider) || 'anthropic',
    architecture: (process.env.AI_ARCHITECTURE_PROVIDER as AIProvider) || 'ollama',
    classification: (process.env.AI_CLASSIFICATION_PROVIDER as AIProvider) || 'none',
    flow: (process.env.AI_FLOW_PROVIDER as AIProvider) || 'ollama',
  };
}

/**
 * Affiche la configuration IA active
 */
export function printAIConfig(config: AIModuleConfig, verbose: boolean): void {
  if (verbose) {
    console.log(chalk.bold('\n  Configuration IA:'));
    console.log(`    Securite:       ${formatProvider(config.security)}`);
    console.log(`    Architecture:   ${formatProvider(config.architecture)}`);
    console.log(`    Classification: ${formatProvider(config.classification)}`);
    console.log(`    Flux:           ${formatProvider(config.flow)}`);
  }
}

export function formatProvider(provider: AIProvider): string {
  const colors: Record<AIProvider, (s: string) => string> = {
    ollama: chalk.cyan,
    anthropic: chalk.magenta,
    openai: chalk.green,
    none: chalk.gray,
  };
  const icons: Record<AIProvider, string> = {
    ollama: '[O]',
    anthropic: '[A]',
    openai: '[G]',
    none: '[-]',
  };
  return `${icons[provider]} ${colors[provider](provider)}`;
}

/**
 * Options par defaut
 */
export function getDefaultOptions(): AnalyzeOptions {
  return {
    output: './output/visualization.html',
    mode: '2d',
    security: false,
    cve: false,
    deep: false,
    verbose: false,
    arch: false,
    explain: false,
    aiModel: process.env.OLLAMA_MODEL || 'llama3.2'
  };
}
