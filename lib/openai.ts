import OpenAI from "openai";

// Modelo recomendado: gpt-4o (más nuevo y mejor)
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export function assertOpenAIKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY en variables de entorno.");
  }
}

// Función para verificar el estado
export async function checkOpenAIStatus() {
  try {
    assertOpenAIKey();
    
    return {
      available: true,
      model: OPENAI_MODEL,
      apiKeyConfigured: true
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}