export type AIProviderName = 'openai' | 'gemini';

export interface AIProviderBindings {
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  AI_LIGHTWEIGHT_MODEL?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

export interface AIModelOption {
  id: string;
  label: string;
  description: string;
}

export interface AIGenerationResult {
  text: string;
  finishReason?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface AIGenerationRequest {
  input: string;
  instructions?: string;
  model?: string;
  maxOutputTokens?: number;
  json?: boolean;
}

const PROVIDER_MODELS: Record<AIProviderName, AIModelOption[]> = {
  openai: [
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', description: 'Fast and cost-efficient' },
    { id: 'gpt-5.4', label: 'GPT-5.4', description: 'Balanced quality and cost' },
    { id: 'gpt-5.5', label: 'GPT-5.5', description: 'Highest-quality synthesis' },
  ],
  gemini: [
    { id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite', description: 'Fastest and most efficient' },
    { id: 'gemini-flash-latest', label: 'Gemini Flash', description: 'Balanced speed and quality' },
    { id: 'gemini-pro-latest', label: 'Gemini Pro', description: 'Most capable and detailed' },
  ],
};

const DEFAULT_MODELS: Record<AIProviderName, string> = {
  openai: 'gpt-5.4-mini',
  gemini: 'gemini-flash-latest',
};

const DEFAULT_LIGHTWEIGHT_MODELS: Record<AIProviderName, string> = {
  openai: 'gpt-5.4-mini',
  gemini: 'gemini-flash-lite-latest',
};

function normalizeProvider(value?: string): AIProviderName | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'openai' || normalized === 'gemini' ? normalized : null;
}

function extractOpenAIText(data: any): string {
  if (typeof data?.output_text === 'string') return data.output_text;
  return (data?.output || [])
    .flatMap((item: any) => item?.content || [])
    .filter((item: any) => item?.type === 'output_text')
    .map((item: any) => item?.text || '')
    .join('');
}

async function readProviderError(response: Response): Promise<string> {
  const data: any = await response.json().catch(() => null);
  return data?.error?.message || data?.message || `${response.status} ${response.statusText}`;
}

export class AIProviderClient {
  readonly name: AIProviderName;
  readonly defaultModel: string;
  readonly lightweightModel: string;
  readonly models: AIModelOption[];
  private readonly apiKey: string;

  constructor(env: AIProviderBindings) {
    this.name = normalizeProvider(env.AI_PROVIDER)
      || (env.OPENAI_API_KEY ? 'openai' : 'gemini');
    this.apiKey = this.name === 'openai' ? (env.OPENAI_API_KEY || '') : (env.GEMINI_API_KEY || '');
    this.defaultModel = env.AI_MODEL || DEFAULT_MODELS[this.name];
    this.lightweightModel = env.AI_LIGHTWEIGHT_MODEL || DEFAULT_LIGHTWEIGHT_MODELS[this.name];
    const configuredModel = this.defaultModel;
    this.models = PROVIDER_MODELS[this.name].some((model) => model.id === configuredModel)
      ? PROVIDER_MODELS[this.name]
      : [{ id: configuredModel, label: configuredModel, description: 'Deployment default' }, ...PROVIDER_MODELS[this.name]];
  }

  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  supportsModel(model: string): boolean {
    return this.models.some((option) => option.id === model);
  }

  async generateText(request: AIGenerationRequest): Promise<AIGenerationResult> {
    if (!this.configured) throw new Error(`${this.name} API key not configured`);
    return this.name === 'openai'
      ? this.generateOpenAI(request)
      : this.generateGemini(request);
  }

  async streamText(request: AIGenerationRequest, onDelta: (text: string) => Promise<void>): Promise<AIGenerationResult> {
    if (!this.configured) throw new Error(`${this.name} API key not configured`);
    return this.name === 'openai'
      ? this.streamOpenAI(request, onDelta)
      : this.streamGemini(request, onDelta);
  }

  private async generateOpenAI(request: AIGenerationRequest): Promise<AIGenerationResult> {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        instructions: request.instructions,
        input: request.input,
        max_output_tokens: request.maxOutputTokens,
        store: false,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${await readProviderError(response)}`);
    const data: any = await response.json();
    return {
      text: extractOpenAIText(data),
      finishReason: data?.incomplete_details?.reason || data?.status,
      usage: { inputTokens: data?.usage?.input_tokens, outputTokens: data?.usage?.output_tokens },
    };
  }

  private async streamOpenAI(request: AIGenerationRequest, onDelta: (text: string) => Promise<void>): Promise<AIGenerationResult> {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || this.defaultModel,
        instructions: request.instructions,
        input: request.input,
        max_output_tokens: request.maxOutputTokens,
        store: false,
        stream: true,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${await readProviderError(response)}`);

    let text = '';
    let finishReason: string | undefined;
    let usage: AIGenerationResult['usage'];
    await this.readSSE(response, async (event) => {
      if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
        text += event.delta;
        await onDelta(event.delta);
      } else if (event.type === 'response.completed') {
        finishReason = event.response?.status;
        usage = { inputTokens: event.response?.usage?.input_tokens, outputTokens: event.response?.usage?.output_tokens };
      } else if (event.type === 'response.incomplete') {
        finishReason = event.response?.incomplete_details?.reason || 'incomplete';
      } else if (event.type === 'error') {
        throw new Error(event.message || event.error?.message || 'OpenAI streaming error');
      }
    });
    return { text, finishReason, usage };
  }

  private async generateGemini(request: AIGenerationRequest): Promise<AIGenerationResult> {
    const model = request.model || this.defaultModel;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: request.instructions ? { parts: [{ text: request.instructions }] } : undefined,
          contents: [{ role: 'user', parts: [{ text: request.input }] }],
          generationConfig: {
            maxOutputTokens: request.maxOutputTokens,
            responseMimeType: request.json ? 'application/json' : undefined,
          },
        }),
      },
    );
    if (!response.ok) throw new Error(`Gemini API error: ${await readProviderError(response)}`);
    const data: any = await response.json();
    return {
      text: data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('') || '',
      finishReason: data?.candidates?.[0]?.finishReason,
      usage: {
        inputTokens: data?.usageMetadata?.promptTokenCount,
        outputTokens: data?.usageMetadata?.candidatesTokenCount,
      },
    };
  }

  private async streamGemini(request: AIGenerationRequest, onDelta: (text: string) => Promise<void>): Promise<AIGenerationResult> {
    const model = request.model || this.defaultModel;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: request.instructions ? { parts: [{ text: request.instructions }] } : undefined,
          contents: [{ role: 'user', parts: [{ text: request.input }] }],
          generationConfig: { maxOutputTokens: request.maxOutputTokens },
        }),
      },
    );
    if (!response.ok) throw new Error(`Gemini API error: ${await readProviderError(response)}`);

    let text = '';
    let finishReason: string | undefined;
    let usage: AIGenerationResult['usage'];
    await this.readSSE(response, async (event) => {
      if (event.error) throw new Error(event.error.message || 'Gemini streaming error');
      const delta = event?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('') || '';
      if (delta) {
        text += delta;
        await onDelta(delta);
      }
      finishReason = event?.candidates?.[0]?.finishReason || finishReason;
      if (event?.usageMetadata) {
        usage = {
          inputTokens: event.usageMetadata.promptTokenCount,
          outputTokens: event.usageMetadata.candidatesTokenCount,
        };
      }
    });
    return { text, finishReason, usage };
  }

  private async readSSE(response: Response, onEvent: (event: any) => Promise<void>): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('AI provider returned no stream body');
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        await onEvent(JSON.parse(payload));
      }
      if (done) break;
    }
    const finalLine = buffer.trim();
    if (finalLine.startsWith('data:')) {
      const payload = finalLine.slice(5).trim();
      if (payload && payload !== '[DONE]') await onEvent(JSON.parse(payload));
    }
  }
}

export function createAIProvider(env: AIProviderBindings): AIProviderClient {
  return new AIProviderClient(env);
}
