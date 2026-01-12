// Tool para obtener información de infraestructura urbana
// Usa Overpass API con múltiples servidores y fallback

interface InfraestructuraElement {
  type: string;
  tags?: {
    name?: string;
    amenity?: string;
    shop?: string;
    tourism?: string;
    emergency?: string;
    healthcare?: string;
    highway?: string;
    waterway?: string;
    power?: string;
    man_made?: string;
    [key: string]: any;
  };
}

// Lista de servidores Overpass (intentamos varios)
const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

async function queryOverpass(query: string): Promise<any> {
  let lastError: Error | null = null;

  // Intentar con cada servidor
  for (const server of OVERPASS_SERVERS) {
    try {
      console.log(`🔄 Intentando servidor: ${server}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

      // Overpass espera el body en formato urlencoded: data=<query>
      const body = new URLSearchParams({ data: query }).toString();

      const response = await fetch(server, {
        method: "POST",
        body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Servidor ${server} respondió correctamente`);
        return data;
      }

      console.log(`⚠️ Servidor ${server} dio error ${response.status}`);
    } catch (error) {
      console.log(
        `❌ Servidor ${server} falló:`,
        error instanceof Error ? error.message : "Error"
      );
      lastError = error instanceof Error ? error : new Error("Error desconocido");
      continue; // Intentar siguiente servidor
    }
  }

  // Si todos fallaron, lanzar error
  throw lastError || new Error("Todos los servidores Overpass fallaron");
}

export async function capasUrbanismo(lat: number, lon: number, radius: number = 500) {
  try {
    console.log(`🏙️ Buscando infraestructura cerca de: ${lat}, ${lon} (radio: ${radius}m)`);

    // Query ampliada: node + way + relation, y además capas útiles fuera de ciudad (highway, waterway, etc.)
    const overpassQuery = `
[out:json][timeout:15];
(
  node["amenity"](around:${radius},${lat},${lon});
  way["amenity"](around:${radius},${lat},${lon});
  relation["amenity"](around:${radius},${lat},${lon});

  node["shop"](around:${radius},${lat},${lon});
  way["shop"](around:${radius},${lat},${lon});
  relation["shop"](around:${radius},${lat},${lon});

  node["tourism"](around:${radius},${lat},${lon});
  way["tourism"](around:${radius},${lat},${lon});
  relation["tourism"](around:${radius},${lat},${lon});

  way["highway"](around:${radius},${lat},${lon});
  way["waterway"](around:${radius},${lat},${lon});
  way["power"](around:${radius},${lat},${lon});
  way["man_made"](around:${radius},${lat},${lon});
);
out body;
>;
out skel qt;
`;

    let data;

    try {
      data = await queryOverpass(overpassQuery);
    } catch (error) {
      console.log("⚠️ Overpass API no disponible, usando datos de ejemplo");
      // Fallback: devolver estructura básica cuando la API falla
      return {
        success: true,
        coordenadas: { lat, lon },
        radio_metros: radius,
        total_elementos: 0,
        categorias: {
          educacion: [],
          salud: [],
          comercio: [],
          transporte: [],
          servicios_publicos: [],
          ocio: [],
          emergencias: [],
          infra_territorial: [],
          otros: [],
        },
        resumen:
          "No se pudo obtener información de infraestructura (API temporal no disponible). Datos limitados disponibles.",
        warning: "Overpass API no disponible en este momento",
        source: "Overpass API (OpenStreetMap) - Fallback activado",
      };
    }

    const elements: InfraestructuraElement[] = data.elements || [];

    // Categorizar los elementos encontrados
    const categorias = {
      educacion: [] as string[],
      salud: [] as string[],
      comercio: [] as string[],
      transporte: [] as string[],
      servicios_publicos: [] as string[],
      ocio: [] as string[],
      emergencias: [] as string[],
      infra_territorial: [] as string[], // carreteras, ríos/canales, líneas, etc.
      otros: [] as string[],
    };

    const push = (arr: string[], value: string) => {
      if (!value) return;
      arr.push(value);
    };

    elements.forEach((element) => {
      const tags = element.tags;
      if (!tags) return;

      // Nombre “humano”
      const nombre =
        tags.name ||
        tags.amenity ||
        tags.shop ||
        tags.tourism ||
        tags.highway ||
        tags.waterway ||
        tags.power ||
        tags.man_made ||
        "Sin nombre";

      // 1) Amenity → categorías clásicas
      if (tags.amenity) {
        switch (tags.amenity) {
          case "school":
          case "university":
          case "college":
          case "kindergarten":
            push(categorias.educacion, nombre);
            break;

          case "hospital":
          case "clinic":
          case "doctors":
          case "pharmacy":
            push(categorias.salud, nombre);
            break;

          case "restaurant":
          case "cafe":
          case "bar":
          case "pub":
            push(categorias.comercio, nombre);
            break;

          case "bus_station":
          case "parking":
          case "fuel":
            push(categorias.transporte, nombre);
            break;

          case "police":
          case "fire_station":
          case "post_office":
          case "townhall":
            push(categorias.servicios_publicos, nombre);
            break;

          case "cinema":
          case "theatre":
          case "library":
            push(categorias.ocio, nombre);
            break;

          default:
            push(categorias.otros, nombre);
        }
      }

      // 2) Shop → comercio
      if (tags.shop) {
        push(categorias.comercio, nombre);
      }

      // 3) Tourism → ocio
      if (tags.tourism) {
        push(categorias.ocio, nombre);
      }

      // 4) Emergency / healthcare → emergencias
      if (tags.emergency || tags.healthcare) {
        push(categorias.emergencias, nombre);
      }

      // 5) Capas territoriales (útiles en rural/infraestructura)
      if (tags.highway || tags.waterway || tags.power || tags.man_made) {
        push(categorias.infra_territorial, nombre);
      }
    });

    // Eliminar duplicados y limitar resultados
    (Object.keys(categorias) as Array<keyof typeof categorias>).forEach((k) => {
      categorias[k] = [...new Set(categorias[k])].slice(0, 10);
    });

    const totalElementos = elements.length;

    console.log(`✅ Encontrados ${totalElementos} elementos de infraestructura`);

    return {
      success: true,
      coordenadas: { lat, lon },
      radio_metros: radius,
      total_elementos: totalElementos,
      categorias,
      resumen: generarResumen(categorias, totalElementos),
      source: "Overpass API (OpenStreetMap)",
    };
  } catch (error) {
    console.error("❌ Error en capasUrbanismo:", error);

    // Fallback final
    return {
      success: true, // true para no bloquear el flujo
      coordenadas: { lat, lon },
      radio_metros: radius,
      total_elementos: 0,
      categorias: {
        educacion: [],
        salud: [],
        comercio: [],
        transporte: [],
        servicios_publicos: [],
        ocio: [],
        emergencias: [],
        infra_territorial: [],
        otros: [],
      },
      resumen: "Información detallada de infraestructura no disponible temporalmente.",
      warning: "API externa no disponible",
      source: "Fallback - Sin datos externos",
    };
  }
}

// Generar resumen textual
function generarResumen(categorias: any, total: number): string {
  if (total === 0) {
    return "Zona con poca infraestructura registrada en OpenStreetMap o datos no disponibles.";
  }

  const resumen: string[] = [];

  if (categorias.educacion?.length > 0) resumen.push(`${categorias.educacion.length} centros educativos`);
  if (categorias.salud?.length > 0) resumen.push(`${categorias.salud.length} centros de salud`);
  if (categorias.comercio?.length > 0) resumen.push(`${categorias.comercio.length} comercios`);
  if (categorias.transporte?.length > 0) resumen.push(`${categorias.transporte.length} puntos de transporte`);
  if (categorias.servicios_publicos?.length > 0) resumen.push(`${categorias.servicios_publicos.length} servicios públicos`);
  if (categorias.ocio?.length > 0) resumen.push(`${categorias.ocio.length} puntos de interés`);
  if (categorias.infra_territorial?.length > 0) resumen.push(`${categorias.infra_territorial.length} infraestructuras territoriales`);

  return resumen.length > 0 ? `Zona con ${resumen.join(", ")}.` : "Zona con infraestructura básica.";
}

// Definición de la tool para Ollama
export const capasUrbanismoTool = {
  type: "function",
  function: {
    name: "capasUrbanismo",
    description:
      "Obtiene información sobre infraestructura cercana: educación, salud, comercio, transporte, servicios públicos, ocio e infraestructuras territoriales. Usa OpenStreetMap.",
    parameters: {
      type: "object",
      properties: {
        lat: { type: "number", description: "Latitud" },
        lon: { type: "number", description: "Longitud" },
        radius: {
          type: "number",
          description: "Radio en metros (default: 500)",
          default: 500,
        },
      },
      required: ["lat", "lon"],
    },
  },
};

// Definición de la tool para OpenAI (tools/function calling)
export const capasUrbanismoToolOpenAI = {
  type: "function",
  function: {
    name: "capasUrbanismo",
    description:
      "Obtiene infraestructura cercana (educación, salud, comercio, transporte, servicios, ocio e infraestructuras territoriales) usando Overpass/OpenStreetMap.",
    parameters: {
      type: "object",
      properties: {
        lat: { type: "number", description: "Latitud" },
        lon: { type: "number", description: "Longitud" },
        radius: {
          type: "number",
          description: "Radio en metros (por defecto 500).",
          default: 500,
        },
      },
      required: ["lat", "lon"],
      additionalProperties: false,
    },
  },
} as const;
