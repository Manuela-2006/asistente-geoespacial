import { NextResponse } from 'next/server';
import { buscarCoordenadas } from '@/lib/tools/buscarCoordenadas';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const direccion = searchParams.get('direccion') || 'Madrid, España';

  const result = await buscarCoordenadas(direccion);

  return NextResponse.json({
    tool: 'buscarCoordenadas',
    input: direccion,
    result: result
  });
}