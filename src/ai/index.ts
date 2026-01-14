// =============================================================================
// AI MODULE INDEX
// =============================================================================

// Ollama Client
export {
  OllamaClient,
  getOllamaClient,
  createOllamaClient,
  isOllamaAvailable,
  RECOMMENDED_MODELS
} from './ollama-client';
export type {
  OllamaConfig,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaModelInfo,
  OllamaListResponse
} from './ollama-client';

// Architecture Explainer
export {
  ArchitectureExplainer,
  createArchitectureExplainer
} from './architecture-explainer';
export type {
  ArchitectureExplanation,
  PatternAnalysis,
  LayerExplanation,
  FlowExplanation,
  Recommendation,
  CodeQualityAssessment,
  ExplainerConfig
} from './architecture-explainer';
