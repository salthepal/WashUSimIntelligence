export interface AIModelOption {
  id: string;
  label: string;
  description: string;
}

export interface AIModelConfiguration {
  provider: 'openai' | 'gemini';
  model: string;
  models: AIModelOption[];
  lightweightModel: string;
}

/** Used only until the backend configuration loads. */
export const DEFAULT_MODEL = 'gpt-5.4-mini';
