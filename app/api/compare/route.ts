import { NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  try {
    const { lugarA, lugarB } = await req.json();

    if (!lugarA || !lugarB) {
      return NextResponse.json(
        { success: false, error: "Faltan ubicaciones para comparar" },
        { status: 400 }
      );
    }

    const prompt = `
Realiza un análisis comparativo formal entre las siguientes dos ubicaciones:

- Ubicación A: ${lugarA}
- Ubicación B: ${lugarB}

El informe DEBE estructurarse exactamente con las siguientes secciones,
en este orden y escritas en MAYÚSCULAS:

UBICACIÓN
INFRAESTRUCTURA URBANA
EVALUACIÓN DE RIESGO DE INUNDACIÓN
CONSIDERACIONES FINALES
CONCLUSIÓN

Instrucciones importantes:
- En cada sección compara claramente ambas ubicaciones.
- Utiliza un tono técnico, formal y académico.
- NO utilices emojis, iconos, viñetas ni símbolos decorativos.
- NO repitas títulos dentro del texto.
- En la sección CONCLUSIÓN debes indicar claramente cuál es la ubicación
  ganadora del análisis global y justificar brevemente la decisión.
- El texto debe ser limpio y preparado para ser exportado a PDF.

Devuelve únicamente el texto del informe.
`;


    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "Eres un analista geoespacial experto en planificación urbana y riesgos naturales.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!openaiResponse.ok) {
      return NextResponse.json(
        { success: false, error: "Error al consultar la IA" },
        { status: 500 }
      );
    }

    const aiData = await openaiResponse.json();
    const text =
      aiData?.choices?.[0]?.message?.content?.trim() || "";

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Respuesta vacía de la IA" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: text,
    });
  } catch (error) {
    console.error("COMPARE ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
