import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAIProvider } from '../utils/ai-provider';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AI provider selection', () => {
  it('prefers OpenAI when its key is configured', () => {
    const provider = createAIProvider({ OPENAI_API_KEY: 'test-openai', GEMINI_API_KEY: 'test-gemini' });
    expect(provider.name).toBe('openai');
    expect(provider.defaultModel).toBe('gpt-5.4-mini');
  });

  it('falls back to Gemini when no OpenAI key exists', () => {
    const provider = createAIProvider({ GEMINI_API_KEY: 'test-gemini' });
    expect(provider.name).toBe('gemini');
    expect(provider.defaultModel).toBe('gemini-flash-latest');
  });
});

describe('OpenAI Responses adapter', () => {
  it('uses server-side Responses API calls with storage disabled', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'completed',
      output_text: 'Provider response',
      usage: { input_tokens: 12, output_tokens: 3 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = createAIProvider({ OPENAI_API_KEY: 'test-openai' });
    const result = await provider.generateText({ instructions: 'System', input: 'User', maxOutputTokens: 100 });

    expect(result.text).toBe('Provider response');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(init.headers.Authorization).toBe('Bearer test-openai');
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'gpt-5.4-mini', instructions: 'System', input: 'User', max_output_tokens: 100, store: false,
    });
  });

  it('parses streamed response text deltas', async () => {
    const events = [
      'data: {"type":"response.output_text.delta","delta":"Hello "}\n\n',
      'data: {"type":"response.output_text.delta","delta":"world"}\n\n',
      'data: {"type":"response.completed","response":{"status":"completed","usage":{"input_tokens":2,"output_tokens":2}}}\n\n',
      'data: [DONE]\n\n',
    ].join('');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(events, { status: 200 })));

    const deltas: string[] = [];
    const provider = createAIProvider({ OPENAI_API_KEY: 'test-openai' });
    const result = await provider.streamText({ input: 'Hello' }, async (delta) => { deltas.push(delta); });

    expect(deltas).toEqual(['Hello ', 'world']);
    expect(result.text).toBe('Hello world');
    expect(result.usage).toEqual({ inputTokens: 2, outputTokens: 2 });
  });
});
