import { NextResponse } from 'next/server';
import { riesgoInundacion } from '../../../lib/tools/riesgoInundacion';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '40.416775');
  const lon = parseFloat(searchParams.get('lon') || '-3.703790');

  const result = await riesgoInundacion(lat, lon);

  return NextResponse.json({
    tool: 'riesgoInundacion',
    input: { lat, lon },
    result: result
  });
}