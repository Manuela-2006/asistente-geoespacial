import { NextRequest, NextResponse } from "next/server";
import { openai, OPENAI_MODEL, assertOpenAIKey } from "@/lib/openai";

import {
  buscarCoordenadas,
  buscarCoordenadasToolOpenAI,
} from "@/lib/tools/buscarCoordenadas";

import {
  capasUrbanismo,
  capasUrbanismoToolOpenAI,
} from "@/lib/tools/capasUrbanismo";

import {
  riesgoInundacion,
  riesgoInundacionToolOpenAI,
} from "@/lib/tools/riesgoInundacion";

type ToolResult = {
  tool: string;
  arguments: any;
  result: any;
};

type OpenAIToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
};

// Función de validación de respuestas
function validarRespuesta(toolResults: ToolResult[], aiResponse: string) {
  const warnings = [];
  
  // Verificar que se usaron las tools necesarias
  const toolsUsadas = toolResults.map(t => t.tool);
  
  if (toolsUsadas.length === 0) {
    warnings.push('No se utilizaron herramientas - la respuesta puede no estar basada en datos reales');
  }
  
  // Verificar que todas las tools tuvieron éxito
  for (const tr of toolResults) {
    if (tr.result.success === false) {
      warnings.push(`La herramienta ${tr.tool} falló: ${tr.result.error || 'Error desconocido'}`);
    }
  }
  
  // Verificar que la respuesta menciona las fuentes
  const fuentesMencionadas = [
    aiResponse.includes('Nominatim') || aiResponse.includes('OpenStreetMap'),
    aiResponse.includes('Overpass') || aiResponse.includes('OSM'),
    aiResponse.includes('Open-Elevation') || aiResponse.includes('elevación')
  ];
  
  if (!fuentesMencionadas.some(f => f)) {
    warnings.push('La respuesta no cita claramente las fuentes de datos');
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

export async function POST(request: NextRequest) {
  try {
    assertOpenAIKey();

    const body = await request.json();
    const { query, latitude, longitude } = body ?? {};

    // Validación robusta (ojo: 0 es válido)
    const hasCoords =
      latitude !== undefined &&
      longitude !== undefined &&
      latitude !== null &&
      longitude !== null;

    if (!query && !hasCoords) {
      return NextResponse.json(
        { error: "Se requiere query o coordenadas (latitude, longitude)" },
        { status: 400 }
      );
    }

    const tools = [
      buscarCoordenadasToolOpenAI,
      capasUrbanismoToolOpenAI,
      riesgoInundacionToolOpenAI,
    ] as const;

    const userPrompt =
      query ||
      `Analiza esta ubicación por coordenadas: lat=${latitude}, lon=${longitude}.`;

    const messages: any[] = [
      {
        role: "system",
        content: `Eres un asistente experto en análisis geoespacial. 

INSTRUCCIONES:
1. Usa las herramientas disponibles para obtener datos reales
2. NUNCA inventes información - solo usa datos de las tools
3. Cita siempre las fuentes: Nominatim/OSM, Overpass/OSM, Open-Elevation
4. Si una API falla, menciona la limitación pero continúa con los datos disponibles

FORMATO DEL INFORME:
Tu respuesta debe ser un informe estructurado con estas secciones:

## 📍 Ubicación
- Coordenadas exactas y dirección completa
- Fuente de datos

## 🏙️ Infraestructura Urbana
- Resumen de elementos encontrados por categoría
- Destacar servicios más relevantes
- Radio de búsqueda

## 🌊 Evaluación de Riesgo de Inundación
- Nivel de riesgo (bajo/medio/alto) con justificación
- Factores considerados (elevación, proximidad a ríos)
- Recomendaciones específicas

## 📊 Conclusión
- Resumen ejecutivo de la zona
- Consideraciones finales

Usa formato Markdown para mejor legibilidad. Sé conciso pero completo.`
      },
      { role: "user", content: userPrompt },
    ];

    const toolResults: ToolResult[] = [];

    const MAX_ITER = 6;

    for (let i = 0; i < MAX_ITER; i++) {
      const resp = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages,
        tools: tools as any,
        tool_choice: "auto",
      });

      const msg = resp.choices?.[0]?.message;
      if (!msg) break;

      const toolCalls = (msg.tool_calls ?? []) as OpenAIToolCall[];

      // Si no hay tool calls, es respuesta final
      if (toolCalls.length === 0) {
        const finalResponse = msg.content || "";
        const validation = validarRespuesta(toolResults, finalResponse);

        return NextResponse.json({
          success: true,
          query: query || `${latitude}, ${longitude}`,
          tools_used: toolResults,
          ai_response: finalResponse,
          iterations: i,
          validation: validation,
          timestamp: new Date().toISOString(),
        });
      }

      // Guardar el mensaje del assistant que pide tools
      messages.push(msg);

      // Ejecutar tools
      for (const tc of toolCalls) {
        const name = tc.function.name;

        let args: any = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = {};
        }

        let result: any;

        try {
          switch (name) {
            case "buscarCoordenadas":
              result = await buscarCoordenadas(args.direccion);
              break;

            case "capasUrbanismo":
              result = await capasUrbanismo(
                args.lat,
                args.lon,
                args.radius ?? 500
              );
              break;

            case "riesgoInundacion":
              result = await riesgoInundacion(args.lat, args.lon);
              break;

            default:
              result = {
                success: false,
                error: `Tool desconocida: ${name}`,
              };
          }
        } catch (e: any) {
          result = {
            success: false,
            error: `Error ejecutando ${name}`,
            details: e?.message || "Error desconocido",
          };
        }

        toolResults.push({ tool: name, arguments: args, result });

        // CRÍTICO: role=tool con tool_call_id para que el modelo lo vincule
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Si llegamos aquí, se alcanzó el límite de iteraciones
    return NextResponse.json(
      {
        success: false,
        error: "Límite de iteraciones alcanzado",
        tools_used: toolResults,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno", details: error?.message || "Desconocido" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "API de análisis geoespacial con IA (OpenAI)",
    status: "online",
    model: OPENAI_MODEL,
    tools_available: [
      "buscarCoordenadas - Geocodificación (Nominatim/OSM)",
      "capasUrbanismo - Infraestructura cercana (Overpass/OSM)",
      "riesgoInundacion - Riesgo de inundación (Open-Elevation + Overpass/OSM)",
    ],
    endpoints: {
      POST: "/api/analyze - Analizar ubicación",
    },
  });
}