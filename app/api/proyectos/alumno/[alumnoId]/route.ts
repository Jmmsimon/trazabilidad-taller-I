import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ alumnoId: string }> }
) {
  const { alumnoId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/proyectos/alumno/${alumnoId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`Error proxying GET /proyectos/alumno/${alumnoId}:`, error);
    return NextResponse.json(
      { error: "No se pudo conectar con el servidor" },
      { status: 500 }
    );
  }
}
