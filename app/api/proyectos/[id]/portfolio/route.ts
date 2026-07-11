import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendResponse = await fetch(`${BACKEND_URL}/proyectos/${id}/portfolio`, {
      cache: 'no-store'
    });

    if (!backendResponse.ok) {
      return NextResponse.json({ error: "Error al cargar portafolio" }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying portfolio:", error);
    return NextResponse.json({ error: "Error de conexión con el backend de IA" }, { status: 500 });
  }
}
