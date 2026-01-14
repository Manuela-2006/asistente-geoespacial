import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, latitude, longitude, years } = body ?? {};

    const hasCoords =
      latitude !== undefined &&
      longitude !== undefined &&
      latitude !== null &&
      longitude !== null;

    if (!query && !hasCoords) {
      return NextResponse.json(
        { success: false, error: "Se requiere query o coordenadas (latitude, longitude)" },
        { status: 400 }
      );
    }

    if (!Array.isArray(years) || years.length === 0) {
      return NextResponse.json(
        { success: false, error: "Se requiere years (array) con al menos 1 año" },
        { status: 400 }
      );
    }

    const location = query || `${latitude}, ${longitude}`;
    const yearsStr = years.join(", ");

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return NextResponse.json(
        { success: false, error: "OPENROUTER_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const model =
      process.env.OPENROUTER_MODEL ||
      "meta-llama/llama-3.1-8b-instruct";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Asistente Geoespacial",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: `Actúa como un analista urbano y territorial senior especializado en ciudades españolas.

IMPORTANTE:
- NO inventes hechos históricos.
- NO menciones exposiciones universales, mundiales, olimpiadas u otros eventos internacionales concretos a menos que sean muy conocidos.
- NO incluyas fechas ni cifras exactas si no son universalmente conocidas.
- Si un dato no es seguro, exprésalo como tendencia o evolución general.
- NO utilices Markdown, símbolos (#, **, -, •) ni listas con viñetas.
- NO incluyas disculpas ni advertencias tipo "este análisis es hipotético".
- NO rechaces el análisis por tratarse de un lugar real.

FORMATO OBLIGATORIO:
- Todos los títulos de sección deben ir en MAYÚSCULAS.
- Cada sección debe ir separada por una línea en blanco.
- El contenido debe ir en párrafos claros y redactados en lenguaje profesional y natural.
- NO uses cursivas ni encabezados Markdown.

CONTENIDO A GENERAR:

Analiza la evolución histórica urbana y territorial de la siguiente ubicación:

UBICACIÓN: ${location}
PERIODO DE ANÁLISIS: ${yearsStr}

Estructura el informe exactamente con las siguientes secciones y en este orden:

UBICACIÓN
Describe la localización geográfica, el contexto territorial y el papel de la ciudad dentro de su región.

DESARROLLO URBANO
Analiza la evolución del modelo urbano a lo largo del periodo indicado, incluyendo expansión, densificación, regeneración y planificación urbana.

DEMOGRAFÍA
Describe las tendencias generales de población, estructura demográfica y cambios sociales relevantes.

ECONOMÍA
Analiza la evolución económica de la ciudad, sectores predominantes y cambios en el modelo productivo.

TRANSPORTE Y MOVILIDAD
Explica la evolución del sistema de transporte, movilidad urbana y cambios en los patrones de desplazamiento.

SERVICIOS Y EQUIPAMIENTOS
Describe la evolución de los servicios públicos, equipamientos urbanos y calidad de vida.

MEDIOAMBIENTE Y SOSTENIBILIDAD
Analiza la evolución de las políticas ambientales, zonas verdes y sostenibilidad urbana.

PROYECCIÓN Y TENDENCIA FUTURA
Expón tendencias futuras probables basadas en la evolución descrita, sin hacer predicciones concretas.

ESTILO:
- Redacción clara, técnica y profesional.
- Tono analítico, no promocional.
- Sin repeticiones innecesarias.
- Sin frases genéricas propias de IA.
- Adaptado a planificación urbana real en España.`,
          },
        ],
        max_tokens: 3000,
        temperature: 0.5,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg =
        data?.error?.message ||
        data?.error ||
        "Error de OpenRouter";
      return NextResponse.json(
        { success: false, error: msg, details: data },
        { status: response.status }
      );
    }

    const analysisText = data?.choices?.[0]?.message?.content?.trim() || "";

    if (!analysisText) {
      return NextResponse.json(
        { success: false, error: "Sin contenido en respuesta", details: data },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: analysisText,
      location,
      years,
      model,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Error desconocido" },
      { status: 500 }
    );
  }
}