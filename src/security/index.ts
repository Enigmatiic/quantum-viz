// =============================================================================
// SECURITY MODULE INDEX
// =============================================================================

// Core types, patterns and helpers
export * from './core';

// Re-export from existing files for backward compatibility
export { SecurityAnalyzer as BaseSecurityAnalyzer } from '../security-analyzer';
export { ASTAnalyzer } from '../ast-analyzer';
export { AIVulnerabilityValidator } from '../ai-vulnerability-validator';
export { SecurityAnalyzer, type EnhancedSecurityReport } from '../enhanced-security-pipeline';
