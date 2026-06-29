export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  RATELIMIT: KVNamespace;
  GEMINI_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  ADMIN_TOKEN: string;
  AI: any;
  VECTORIZE: VectorizeIndex;
};
