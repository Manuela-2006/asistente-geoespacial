// lib/openai.ts
import OpenAI from "openai";

// Modelo recomendado: gpt-4o (más nuevo y mejor)
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export function assertOpenAIKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY en variables de entorno.");
  }
}

/**
 * ✅ Cliente OpenAI en modo lazy:
 * - NO se instancia al importar el módulo (evita crash en build de Vercel).
 * - Se crea solo cuando realmente se llama en runtime.
 */
let _client: OpenAI | null = null;

export function getOpenAIClient() {
  assertOpenAIKey();

  if (_client) return _client;

  _client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  return _client;
}

// ⚠️ Mantengo un export "openai" por compatibilidad,
// pero ojo: ahora es una función, no un objeto.
export const openai = {
  chat: {
    completions: {
      create: (...args: Parameters<OpenAI["chat"]["completions"]["create"]>) =>
        getOpenAIClient().chat.completions.create(...args),
    },
  },
};

/**
 * Función para verificar el estado
 * (sin reventar el build: solo valida env en runtime)
 */
export async function checkOpenAIStatus() {
  try {
    assertOpenAIKey();

    return {
      available: true,
      model: OPENAI_MODEL,
      apiKeyConfigured: true,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
