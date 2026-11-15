// Server-only Groq client initialization and configuration validation
// DO NOT import this file into Client Components.

import { Groq } from "groq-sdk";

export const SUPPORTED_GROQ_MODELS = [
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
] as const;

export type SupportedGroqModel = (typeof SUPPORTED_GROQ_MODELS)[number];

export const DEFAULT_GROQ_MODEL: SupportedGroqModel = "openai/gpt-oss-20b";

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "");
}

/**
 * Validates GROQ_MODEL against the strict supported model allowlist.
 * Defaults to openai/gpt-oss-20b.
 * Throws if an unsupported model ID is configured. Never automatically switches models.
 */
export function getValidatedGroqModel(): SupportedGroqModel {
  const configured = process.env.GROQ_MODEL?.trim();

  if (!configured) {
    return DEFAULT_GROQ_MODEL;
  }

  if (SUPPORTED_GROQ_MODELS.includes(configured as SupportedGroqModel)) {
    return configured as SupportedGroqModel;
  }

  throw new Error(
    `Unsupported GROQ_MODEL configured: "${configured}". Allowed models: ${SUPPORTED_GROQ_MODELS.join(", ")}`
  );
}

let cachedGroqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!isGroqConfigured()) {
    throw new Error(
      "GROQ_API_KEY is not configured on the server. Please add GROQ_API_KEY to .env.local."
    );
  }

  if (!cachedGroqClient) {
    cachedGroqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  return cachedGroqClient;
}
