// Tool para buscar coordenadas a partir de una dirección
// Usa Nominatim (OpenStreetMap) - API gratuita

interface CoordenadaResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: any;
}

export async function buscarCoordenadas(direccion: string) {
  try {
    console.log(`🔍 Buscando coordenadas para: "${direccion}"`);

    // Llamada a Nominatim API
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AsistenteGeoespacial/1.0' // Nominatim requiere User-Agent
      }
    });

    if (!response.ok) {
      throw new Error(`Error en API Nominatim: ${response.status}`);
    }

    const data: CoordenadaResult[] = await response.json();

    if (data.length === 0) {
      return {
        success: false,
        error: 'No se encontraron resultados para esta dirección'
      };
    }

    const result = data[0];
    
    console.log(`✅ Coordenadas encontradas: ${result.lat}, ${result.lon}`);

    return {
      success: true,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      direccion_completa: result.display_name,
      source: 'Nominatim (OpenStreetMap)'
    };

  } catch (error) {
    console.error('❌ Error en buscarCoordenadas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Definición de la tool para Ollama (formato function calling)
export const buscarCoordenadasTool = {
  type: 'function',
  function: {
    name: 'buscarCoordenadas',
    description: 'Busca las coordenadas geográficas (latitud y longitud) de una dirección o lugar. Usa la API de OpenStreetMap.',
    parameters: {
      type: 'object',
      properties: {
        direccion: {
          type: 'string',
          description: 'La dirección o nombre del lugar a buscar. Puede ser una dirección completa, ciudad, punto de interés, etc.'
        }
      },
      required: ['direccion']
    }
  }
};

// Definición de la tool para OpenAI (tools/function calling)
export const buscarCoordenadasToolOpenAI = {
  type: "function",
  function: {
    name: "buscarCoordenadas",
    description:
      "Busca coordenadas (lat/lon) de una dirección o lugar usando Nominatim (OpenStreetMap).",
    parameters: {
      type: "object",
      properties: {
        direccion: {
          type: "string",
          description: "Dirección o lugar a geocodificar.",
        },
      },
      required: ["direccion"],
      additionalProperties: false,
    },
  },
} as const;
