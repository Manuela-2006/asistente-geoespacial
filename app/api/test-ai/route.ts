import { NextResponse } from 'next/server';

export async function GET() {
  const testQuery = "¿Dónde está Madrid, España?";
  
  try {
    // Llamar a nuestra propia API
    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: testQuery })
    });

    const data = await response.json();

    return NextResponse.json({
      test: 'Function calling con Ollama',
      query: testQuery,
      result: data
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Error en test',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}