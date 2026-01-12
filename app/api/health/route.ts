import { NextResponse } from 'next/server';
import { checkOpenAIStatus } from '@/lib/openai';
import { buscarCoordenadas } from '@/lib/tools/buscarCoordenadas';

export async function GET() {
  const checks = {
    openai: { status: 'checking' } as any,
    nominatim: { status: 'checking' } as any,
    overpass: { status: 'checking' } as any,
    openElevation: { status: 'checking' } as any
  };

  // 1. Check OpenAI
  try {
    const openaiStatus = await checkOpenAIStatus();
    checks.openai = {
      status: openaiStatus.available ? 'online' : 'offline',
      model: openaiStatus.model,
      details: openaiStatus
    };
  } catch (error) {
    checks.openai = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 2. Check Nominatim (test de geocodificación)
  try {
    const testGeocode = await buscarCoordenadas('Madrid, Spain');
    checks.nominatim = {
      status: testGeocode.success ? 'online' : 'error',
      testResult: testGeocode.success ? 'OK' : testGeocode.error
    };
  } catch (error) {
    checks.nominatim = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 3. Check Overpass API
  try {
    const overpassTest = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: '[out:json];node(0);out;',
      signal: AbortSignal.timeout(5000)
    });
    checks.overpass = {
      status: overpassTest.ok ? 'online' : 'error',
      httpStatus: overpassTest.status
    };
  } catch (error) {
    checks.overpass = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Timeout'
    };
  }

  // 4. Check Open-Elevation API
  try {
    const elevTest = await fetch(
      'https://api.open-elevation.com/api/v1/lookup?locations=40.4,-3.7',
      { signal: AbortSignal.timeout(5000) }
    );
    checks.openElevation = {
      status: elevTest.ok ? 'online' : 'error',
      httpStatus: elevTest.status
    };
  } catch (error) {
    checks.openElevation = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Timeout'
    };
  }

  // Estado general
  const allOnline = Object.values(checks).every(
    (check: any) => check.status === 'online'
  );

  return NextResponse.json({
    status: allOnline ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: checks,
    summary: {
      total: 4,
      online: Object.values(checks).filter((c: any) => c.status === 'online').length,
      errors: Object.values(checks).filter((c: any) => c.status === 'error').length
    }
  });
}