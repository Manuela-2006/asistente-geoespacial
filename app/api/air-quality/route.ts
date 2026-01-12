import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
      return NextResponse.json(
        { error: "Latitud y longitud requeridas" },
        { status: 400 }
      );
    }

    // Open-Meteo Air Quality (NO API KEY)
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error("Error consultando Open-Meteo");
    }

    const data = await res.json();

    if (!data.hourly || !data.hourly.pm2_5) {
      return NextResponse.json({ points: [] });
    }

    // Simulamos varios puntos alrededor (heatmap académico)
    const baseValue = data.hourly.pm2_5[0] ?? 0;

    const points = [
      { lat: +lat, lon: +lon, value: Math.min(baseValue / 50, 1) },
      { lat: +lat + 0.01, lon: +lon, value: Math.min(baseValue / 55, 1) },
      { lat: +lat - 0.01, lon: +lon, value: Math.min(baseValue / 60, 1) },
      { lat: +lat, lon: +lon + 0.01, value: Math.min(baseValue / 58, 1) },
      { lat: +lat, lon: +lon - 0.01, value: Math.min(baseValue / 52, 1) },
    ];

    return NextResponse.json({ points });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Error obteniendo datos de contaminación" },
      { status: 500 }
    );
  }
}
