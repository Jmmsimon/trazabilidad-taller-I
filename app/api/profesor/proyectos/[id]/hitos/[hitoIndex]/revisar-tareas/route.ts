import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; hitoIndex: string }> }
) {
  const { id, hitoIndex } = await params;
  try {
    const body = await request.json();
    const res = await fetch(
      `${BACKEND_URL}/profesor/proyectos/${id}/hitos/${hitoIndex}/revisar-tareas`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(
      `Error proxying POST /profesor/proyectos/${id}/hitos/${hitoIndex}/revisar-tareas:`,
      error
    );
    return NextResponse.json(
      { error: "No se pudo conectar con el servidor" },
      { status: 500 }
    );
  }
}
