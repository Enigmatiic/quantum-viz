// =============================================================================
// OLLAMA CLIENT - Client pour l'IA locale Ollama
// =============================================================================

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout: number;
  temperature: number;
  maxTokens: number;
  keepAlive: string;
  systemPrompt?: string;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    top_p?: number;
    top_k?: number;
  };
  keep_alive?: string;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaListResponse {
  models: OllamaModelInfo[];
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2',
  timeout: 120000,
  temperature: 0.7,
  maxTokens: 4096,
  keepAlive: '5m',
  systemPrompt: `Tu es un expert en architecture logicielle. Tu analyses du code et expliques les patterns architecturaux de manière claire et concise. Tu réponds toujours en JSON valide quand on te le demande.`
};

// =============================================================================
// OLLAMA CLIENT CLASS
// =============================================================================

export class OllamaClient {
  private config: OllamaConfig;
  private isAvailable: boolean | null = null;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Vérifie si Ollama est disponible
   */
  async checkAvailability(): Promise<boolean> {
    if (this.isAvailable !== null) return this.isAvailable;

    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      this.isAvailable = response.ok;
      return this.isAvailable;
    } catch {
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Liste les modèles disponibles
   */
  async listModels(): Promise<OllamaModelInfo[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as OllamaListResponse;
      return data.models || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  /**
   * Vérifie si un modèle spécifique est disponible
   */
  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some(m => m.name === modelName || m.name.startsWith(`${modelName}:`));
  }

  /**
   * Génère une réponse
   */
  async generate(prompt: string, options: Partial<OllamaConfig> = {}): Promise<string> {
    const mergedConfig = { ...this.config, ...options };

    const request: OllamaGenerateRequest = {
      model: mergedConfig.model,
      prompt: prompt,
      system: mergedConfig.systemPrompt,
      stream: false,
      options: {
        temperature: mergedConfig.temperature,
        num_predict: mergedConfig.maxTokens
      },
      keep_alive: mergedConfig.keepAlive
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(mergedConfig.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json() as OllamaGenerateResponse;
      return data.response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          throw new Error(`Ollama timeout after ${mergedConfig.timeout}ms`);
        }
        throw new Error(`Ollama error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Génère une réponse JSON
   */
  async generateJSON<T>(prompt: string, options: Partial<OllamaConfig> = {}): Promise<T> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans explication.`;

    const response = await this.generate(jsonPrompt, options);

    // Extraire le JSON de la réponse
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch {
      throw new Error(`Invalid JSON in response: ${response.slice(0, 200)}`);
    }
  }

  /**
   * Génère avec streaming (pour les longues réponses)
   */
  async *generateStream(
    prompt: string,
    options: Partial<OllamaConfig> = {}
  ): AsyncGenerator<string, void, unknown> {
    const mergedConfig = { ...this.config, ...options };

    const request: OllamaGenerateRequest = {
      model: mergedConfig.model,
      prompt: prompt,
      system: mergedConfig.systemPrompt,
      stream: true,
      options: {
        temperature: mergedConfig.temperature,
        num_predict: mergedConfig.maxTokens
      },
      keep_alive: mergedConfig.keepAlive
    };

    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(mergedConfig.timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as OllamaGenerateResponse;
            if (data.response) {
              yield data.response;
            }
          } catch {
            // Ignorer les lignes non-JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Chat multi-tour
   */
  async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: Partial<OllamaConfig> = {}
  ): Promise<string> {
    const mergedConfig = { ...this.config, ...options };

    const request = {
      model: mergedConfig.model,
      messages: messages,
      stream: false,
      options: {
        temperature: mergedConfig.temperature,
        num_predict: mergedConfig.maxTokens
      }
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(mergedConfig.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as { message: { content: string } };
      return data.message.content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Ollama chat error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Obtient les embeddings d'un texte
   */
  async getEmbeddings(text: string, model?: string): Promise<number[]> {
    const request = {
      model: model || 'nomic-embed-text',
      prompt: text
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as { embedding: number[] };
      return data.embedding;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Ollama embeddings error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Configure le modèle à utiliser
   */
  setModel(model: string): void {
    this.config.model = model;
  }

  /**
   * Configure l'URL de base
   */
  setBaseUrl(url: string): void {
    this.config.baseUrl = url;
    this.isAvailable = null; // Reset availability cache
  }

  /**
   * Obtient la configuration actuelle
   */
  getConfig(): OllamaConfig {
    return { ...this.config };
  }
}

// =============================================================================
// FACTORY & HELPERS
// =============================================================================

let defaultClient: OllamaClient | null = null;

/**
 * Obtient le client Ollama par défaut
 */
export function getOllamaClient(): OllamaClient {
  if (!defaultClient) {
    defaultClient = new OllamaClient();
  }
  return defaultClient;
}

/**
 * Crée un client Ollama avec une configuration personnalisée
 */
export function createOllamaClient(config: Partial<OllamaConfig>): OllamaClient {
  return new OllamaClient(config);
}

/**
 * Vérifie si Ollama est disponible (helper global)
 */
export async function isOllamaAvailable(): Promise<boolean> {
  return getOllamaClient().checkAvailability();
}

/**
 * Liste des modèles recommandés pour l'analyse de code
 */
export const RECOMMENDED_MODELS = [
  { name: 'llama3.2', description: 'Bon équilibre performance/qualité', size: '3B' },
  { name: 'codellama', description: 'Spécialisé pour le code', size: '7B' },
  { name: 'deepseek-coder', description: 'Excellent pour l\'analyse de code', size: '6.7B' },
  { name: 'mistral', description: 'Rapide et efficace', size: '7B' },
  { name: 'qwen2.5-coder', description: 'Très bon pour le code', size: '7B' }
];

export default OllamaClient;
