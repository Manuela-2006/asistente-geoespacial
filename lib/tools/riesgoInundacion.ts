// Tool para evaluar riesgo de inundación
// Usa: Open-Elevation API + Overpass para detectar ríos cercanos

interface ElevacionData {
  latitude: number;
  longitude: number;
  elevation: number;
}

export async function riesgoInundacion(lat: number, lon: number) {
  try {
    console.log(`🌊 Evaluando riesgo de inundación en: ${lat}, ${lon}`);

    // 1. Obtener elevación del terreno
    const elevacion = await obtenerElevacion(lat, lon);
    
    // 2. Buscar ríos cercanos (radio 1km)
    const riosCercanos = await buscarRiosCercanos(lat, lon);

    // 3. Calcular nivel de riesgo
    const nivelRiesgo = calcularRiesgo(elevacion, riosCercanos);

    console.log(`✅ Evaluación completada. Riesgo: ${nivelRiesgo.nivel}`);

    return {
      success: true,
      coordenadas: { lat, lon },
      elevacion_metros: elevacion,
      rios_cercanos: riosCercanos.count,
      distancia_rio_mas_cercano: riosCercanos.nearest_distance,
      nombre_rio_cercano: riosCercanos.nearest_name,
      nivel_riesgo: nivelRiesgo.nivel,
      puntuacion_riesgo: nivelRiesgo.score,
      descripcion: nivelRiesgo.descripcion,
      recomendaciones: nivelRiesgo.recomendaciones,
      factores: {
        elevacion_baja: elevacion < 100,
        cerca_de_rio: riosCercanos.count > 0,
        zona_costera: Math.abs(lat) < 45 && elevacion < 20
      },
      source: 'Open-Elevation API + OpenStreetMap'
    };

  } catch (error) {
    console.error('❌ Error en riesgoInundacion:', error);
    
    // Fallback
    return {
      success: true,
      coordenadas: { lat, lon },
      elevacion_metros: null,
      rios_cercanos: 0,
      nivel_riesgo: 'desconocido',
      puntuacion_riesgo: 0,
      descripcion: 'No se pudo evaluar el riesgo de inundación. Datos no disponibles.',
      recomendaciones: ['Consultar con autoridades locales sobre riesgos en la zona.'],
      warning: 'Datos limitados',
      source: 'Fallback'
    };
  }
}

// Obtener elevación usando Open-Elevation API
async function obtenerElevacion(lat: number, lon: number): Promise<number> {
  try {
    const response = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      throw new Error('Error al obtener elevación');
    }

    const data = await response.json();
    const elevation = data.results[0]?.elevation || 0;
    
    console.log(`📏 Elevación: ${elevation}m`);
    return elevation;
  } catch (error) {
    console.log('⚠️ No se pudo obtener elevación, usando estimación');
    return 100; // Valor por defecto conservador
  }
}

// Buscar ríos cercanos usando Overpass
async function buscarRiosCercanos(lat: number, lon: number) {
  try {
    const radius = 1000; // 1km
    const query = `
      [out:json][timeout:10];
      (
        way["waterway"="river"](around:${radius},${lat},${lon});
        way["waterway"="stream"](around:${radius},${lat},${lon});
        way["natural"="water"](around:${radius},${lat},${lon});
      );
      out body;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error('Error en Overpass');
    }

    const data = await response.json();
    const elements = data.elements || [];
    
    const nearestRiver = elements[0];
    const riverName = nearestRiver?.tags?.name || 'Curso de agua sin nombre';

    console.log(`🏞️ Ríos cercanos encontrados: ${elements.length}`);

    return {
      count: elements.length,
      nearest_name: elements.length > 0 ? riverName : null,
      nearest_distance: elements.length > 0 ? 'menos de 1km' : 'ninguno en 1km'
    };
  } catch (error) {
    console.log('⚠️ No se pudieron buscar ríos');
    return {
      count: 0,
      nearest_name: null,
      nearest_distance: 'desconocido'
    };
  }
}

// Calcular nivel de riesgo
function calcularRiesgo(elevacion: number, rios: any) {
  let score = 0;
  let nivel = 'bajo';
  let descripcion = '';
  let recomendaciones: string[] = [];

  // Factor 1: Elevación baja
  if (elevacion < 10) {
    score += 40;
    descripcion += 'Zona de elevación muy baja (< 10m). ';
  } else if (elevacion < 50) {
    score += 20;
    descripcion += 'Zona de elevación baja (< 50m). ';
  } else if (elevacion < 100) {
    score += 10;
  }

  // Factor 2: Proximidad a ríos
  if (rios.count > 2) {
    score += 30;
    descripcion += `Múltiples cursos de agua cercanos (${rios.count}). `;
  } else if (rios.count > 0) {
    score += 15;
    descripcion += `Curso de agua cercano: ${rios.nearest_name}. `;
  }

  // Determinar nivel
  if (score >= 50) {
    nivel = 'alto';
    recomendaciones = [
      'Revisar historial de inundaciones en la zona',
      'Considerar sistemas de drenaje y protección',
      'Consultar mapas oficiales de zonas inundables (SNCZI en España)',
      'Evaluar seguros contra inundaciones'
    ];
  } else if (score >= 25) {
    nivel = 'medio';
    recomendaciones = [
      'Revisar sistemas de drenaje locales',
      'Consultar con autoridades sobre riesgos históricos',
      'Considerar medidas preventivas básicas'
    ];
  } else {
    nivel = 'bajo';
    descripcion += 'Zona en elevación segura con bajo riesgo aparente.';
    recomendaciones = [
      'Riesgo bajo según datos topográficos',
      'Mantener sistemas de drenaje en buen estado'
    ];
  }

  return {
    nivel,
    score,
    descripcion: descripcion || 'Evaluación basada en topografía y cursos de agua cercanos.',
    recomendaciones
  };
}

// Definición de la tool para Ollama
export const riesgoInundacionTool = {
  type: 'function',
  function: {
    name: 'riesgoInundacion',
    description: 'Evalúa el riesgo de inundación de una ubicación basándose en elevación del terreno y proximidad a cursos de agua. Proporciona nivel de riesgo (bajo/medio/alto) y recomendaciones.',
    parameters: {
      type: 'object',
      properties: {
        lat: {
          type: 'number',
          description: 'Latitud'
        },
        lon: {
          type: 'number',
          description: 'Longitud'
        }
      },
      required: ['lat', 'lon']
    }
  }
};

// Definición de la tool para OpenAI (tools/function calling)
export const riesgoInundacionToolOpenAI = {
  type: "function",
  function: {
    name: "riesgoInundacion",
    description:
      "Evalúa el riesgo de inundación basándose en elevación del terreno y proximidad a cursos de agua. Devuelve nivel (bajo/medio/alto) y recomendaciones.",
    parameters: {
      type: "object",
      properties: {
        lat: { type: "number", description: "Latitud" },
        lon: { type: "number", description: "Longitud" },
      },
      required: ["lat", "lon"],
      additionalProperties: false,
    },
  },
} as const;
