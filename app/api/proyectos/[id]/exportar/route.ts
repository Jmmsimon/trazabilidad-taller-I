import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendResponse = await fetch(`${BACKEND_URL}/proyectos/${id}/exportar`, {
      cache: 'no-store'
    });

    if (!backendResponse.ok) {
      return NextResponse.json({ error: "Error al exportar datos" }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename=snapshot-proyecto-${id}.json`
      }
    });
  } catch (error) {
    console.error("Error proxying export:", error);
    return NextResponse.json({ error: "Error de conexión con el backend de IA" }, { status: 500 });
  }
}
