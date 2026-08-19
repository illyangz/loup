import OpenAI from "openai";

/**
 * Lazily constructed OpenAI client.
 *
 * The demo server must boot without the AI integration provisioned (local
 * development, pitch builds). The client is created on first use; if the
 * integration is not configured, the caller receives the underlying error
 * and can degrade gracefully (e.g. an SSE error frame).
 */
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    throw new Error(
      "AI_INTEGRATIONS_OPENAI_BASE_URL must be set. Did you forget to provision the OpenAI AI integration?",
    );
  }
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error(
      "AI_INTEGRATIONS_OPENAI_API_KEY must be set. Did you forget to provision the OpenAI AI integration?",
    );
  }
  client = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
  return client;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop);
  },
});