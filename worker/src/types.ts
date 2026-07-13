export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  RATELIMIT: KVNamespace;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  AI_LIGHTWEIGHT_MODEL?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  TURNSTILE_SECRET_KEY: string;
  ADMIN_TOKEN: string;
  AI: any;
  VECTORIZE: VectorizeIndex;
};
