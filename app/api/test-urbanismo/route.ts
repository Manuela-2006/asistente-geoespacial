import { NextResponse } from 'next/server';
import { capasUrbanismo } from '@/lib/tools/capasUrbanismo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '40.416775'); // Madrid por defecto
  const lon = parseFloat(searchParams.get('lon') || '-3.703790');

  const result = await capasUrbanismo(lat, lon, 500);

  return NextResponse.json({
    tool: 'capasUrbanismo',
    input: { lat, lon },
    result: result
  });
}