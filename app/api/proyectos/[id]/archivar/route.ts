import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendResponse = await fetch(`${BACKEND_URL}/proyectos/${id}/archivar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!backendResponse.ok) {
      return NextResponse.json({ error: "Error al archivar proyecto" }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error proxying archive:", error);
    return NextResponse.json({ error: "Error de conexión con el backend de IA" }, { status: 500 });
  }
}
