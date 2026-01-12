import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ciudad = searchParams.get('ciudad') || 'Barcelona, España';

  try {
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: `Analiza la ciudad de ${ciudad}. Busca sus coordenadas, analiza la infraestructura urbana cercana al centro (500 metros de radio), y evalúa el riesgo de inundación. Dame un informe completo y estructurado.`
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({
        error: 'Error en la API de análisis',
        details: errorData
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      test: 'Análisis geoespacial completo con OpenAI GPT-4o',
      ciudad: ciudad,
      tiempo_respuesta: 'Ver timestamp en resultado',
      resultado: data
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Error en test completo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}